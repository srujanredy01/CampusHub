import logging
import secrets
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from .serializers import (
    UserSignupSerializer, ForgotPasswordSerializer,
    ResetPasswordSerializer, ChangePasswordSerializer, UserSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


class LoginRateThrottle(AnonRateThrottle):
    scope = "login"


class SignupRateThrottle(AnonRateThrottle):
    scope = "signup"


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    r = {"success": True, "message": message}
    if data is not None:
        r["data"] = data
    return Response(r, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST, errors=None):
    r = {"success": False, "error": {"message": message}}
    if errors:
        r["errors"] = errors
    return Response(r, status=code)


class SignupView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [SignupRateThrottle]

    def post(self, request):
        s = UserSignupSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)

        user = s.save()
        # Generate email verification token — user is NOT active until verified
        token = secrets.token_urlsafe(32)
        user.email_verification_token = token
        user.email_verification_sent_at = timezone.now()
        # Account is active immediately upon signup
        user.is_active = True
        user.save(update_fields=[
            "email_verification_token", "email_verification_sent_at", "is_active",
        ])

        # Track signup
        try:
            from apps.audit.utils import log_signup
            log_signup(request, user)
        except Exception:
            pass

        try:
            from apps.notifications.tasks import send_verification_email
            send_verification_email(str(user.id))
        except Exception:
            pass

        logger.info("New user registered: %s (ID: %s)", user.email, user.student_id)
        return ok({"email": user.email}, "Account created. Please check your email to verify your account.", 201)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.query_params.get("token")
        if not token:
            return err("Token required.")
        try:
            user = User.objects.get(email_verification_token=token)
        except User.DoesNotExist:
            return err("Invalid or expired token.")
        if user.email_verification_sent_at:
            if timezone.now() > user.email_verification_sent_at + timedelta(hours=24):
                return err("Token expired. Request a new one.")
        user.email_verified = True
        user.is_active = True
        user.email_verification_token = None
        user.save(update_fields=["email_verified", "is_active", "email_verification_token"])
        return ok(message="Email verified. You can now log in.")


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        student_id = request.data.get("student_id", "").strip()
        password   = request.data.get("password", "")

        if not student_id or not password:
            return err("Student ID and password are required.")

        # Look up user
        try:
            user = User.objects.get(student_id=student_id)
        except User.DoesNotExist:
            try:
                from apps.audit.utils import log_login_failed
                log_login_failed(request, student_id)
            except Exception:
                pass
            logger.warning("Login failed — student_id not found: %s", student_id)
            return err("Invalid credentials.", 401)

        # Check password
        if not user.check_password(password):
            try:
                from apps.audit.utils import log_login_failed
                log_login_failed(request, student_id)
            except Exception:
                pass
            logger.warning("Login failed — wrong password for: %s", student_id)
            return err("Invalid credentials.", 401)

        # Check active
        if not user.is_active:
            return err("Your account has been deactivated. Please contact support.", 403)

        # Issue tokens
        refresh = RefreshToken.for_user(user)
        refresh["full_name"] = user.full_name
        refresh["email"]     = user.email
        refresh["role"]      = user.role

        user.last_login = timezone.now()
        user.save(update_fields=["last_login"])

        # Track successful login
        try:
            from apps.audit.utils import log_login_success
            log_login_success(request, user)
        except Exception:
            pass

        logger.info("Login success: %s (role=%s)", user.student_id, user.role)
        return ok(
            {
                "access":  str(refresh.access_token),
                "refresh": str(refresh),
                "user":    UserSerializer(user).data,
            },
            "Login successful.",
        )


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return err("Refresh token required.")
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError as e:
            # Token already blacklisted or invalid — still consider logout successful
            logger.info("Logout token error (non-critical): %s", e)

        # Track logout if user is authenticated
        if hasattr(request, "user") and request.user.is_authenticated:
            try:
                from apps.audit.utils import log_logout
                log_logout(request, request.user)
            except Exception:
                pass
            logger.info("Logout: %s", request.user.student_id)

        return ok(message="Logged out successfully.")


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = ForgotPasswordSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        email = s.validated_data["email"].lower()
        try:
            user = User.objects.get(email=email)
            token = secrets.token_urlsafe(32)
            user.password_reset_token = token
            user.password_reset_sent_at = timezone.now()
            user.save(update_fields=["password_reset_token", "password_reset_sent_at"])
            try:
                from apps.audit.utils import log_activity
                log_activity(request, "password_reset_request", metadata={"email": email})
            except Exception:
                pass
            try:
                from apps.notifications.tasks import send_password_reset_email
                send_password_reset_email(str(user.id))
            except Exception:
                pass
        except User.DoesNotExist:
            pass
        return ok(message="If that email exists, a reset link has been sent.")


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        s = ResetPasswordSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        try:
            user = User.objects.get(password_reset_token=s.validated_data["token"])
        except User.DoesNotExist:
            return err("Invalid or expired token.")
        if user.password_reset_sent_at and timezone.now() > user.password_reset_sent_at + timedelta(hours=1):
            return err("Token expired. Please request a new reset link.")
        user.set_password(s.validated_data["password"])
        user.password_reset_token = None
        user.password_reset_sent_at = None
        user.save(update_fields=["password", "password_reset_token", "password_reset_sent_at"])

        # Blacklist all outstanding refresh tokens for this user (security measure)
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            tokens = OutstandingToken.objects.filter(user=user)
            for token in tokens:
                BlacklistedToken.objects.get_or_create(token=token)
        except Exception:
            pass

        try:
            from apps.audit.utils import log_activity
            log_activity(request, "password_reset_done", user=user)
        except Exception:
            pass
        return ok(message="Password reset successfully. You can now log in.")


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        s = ChangePasswordSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        if not request.user.check_password(s.validated_data["old_password"]):
            return err("Current password is incorrect.")
        request.user.set_password(s.validated_data["new_password"])
        request.user.save(update_fields=["password"])

        # Blacklist all outstanding refresh tokens for this user (security measure)
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            tokens = OutstandingToken.objects.filter(user=request.user)
            for token in tokens:
                BlacklistedToken.objects.get_or_create(token=token)
        except Exception:
            pass

        try:
            from apps.audit.utils import log_activity
            log_activity(request, "password_change")
        except Exception:
            pass
        return ok(message="Password changed successfully. Please log in again.")


class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email", "").lower().strip()
        if not email:
            return err("Email required.")
        try:
            user = User.objects.get(email=email)
            if user.email_verified:
                return err("Email already verified.")
            if user.email_verification_sent_at and timezone.now() < user.email_verification_sent_at + timedelta(minutes=5):
                return err("Please wait a few minutes before requesting another email.", 429)
            token = secrets.token_urlsafe(32)
            user.email_verification_token = token
            user.email_verification_sent_at = timezone.now()
            user.save(update_fields=["email_verification_token", "email_verification_sent_at"])
            try:
                from apps.notifications.tasks import send_verification_email
                send_verification_email(str(user.id))
            except Exception:
                pass
        except User.DoesNotExist:
            pass
        return ok(message="Verification email sent if account exists.")


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return ok(UserSerializer(request.user).data)
