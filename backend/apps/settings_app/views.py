"""
Settings API views.
"""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken, OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken as OToken, BlacklistedToken as BToken
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import UserSettings, UserSession
from .serializers import (
    UserSettingsSerializer,
    UserSessionSerializer,
    ChangePasswordSerializer,
    AccountUpdateSerializer,
    DeactivateAccountSerializer,
    DeleteAccountSerializer,
)

User = get_user_model()


class SettingsView(APIView):
    """
    GET /api/settings/ — Get user settings.
    PATCH /api/settings/ — Update user settings.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings_obj, _ = UserSettings.objects.get_or_create(user=request.user)
        data = UserSettingsSerializer(settings_obj).data
        # Include account info
        data["account"] = {
            "full_name": request.user.full_name,
            "email": request.user.email,
            "phone": request.user.phone,
            "branch": request.user.branch,
            "section": request.user.section,
            "student_id": request.user.student_id,
        }
        return Response({"success": True, "data": data})

    def patch(self, request):
        settings_obj, _ = UserSettings.objects.get_or_create(user=request.user)

        # Update settings fields
        settings_serializer = UserSettingsSerializer(settings_obj, data=request.data, partial=True)
        if not settings_serializer.is_valid():
            return Response(
                {"success": False, "errors": settings_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        settings_serializer.save()

        # Update account fields if provided
        account_fields = {"full_name", "phone", "branch", "section"}
        account_data = {k: v for k, v in request.data.items() if k in account_fields}
        if account_data:
            account_serializer = AccountUpdateSerializer(request.user, data=account_data, partial=True)
            if account_serializer.is_valid():
                account_serializer.save()
            else:
                return Response(
                    {"success": False, "errors": account_serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        return Response({
            "success": True,
            "data": UserSettingsSerializer(settings_obj).data,
            "message": "Settings updated.",
        })


class SettingsChangePasswordView(APIView):
    """
    POST /api/settings/change-password — Change user password.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"success": False, "error": {"message": "Current password is incorrect."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save(update_fields=["password"])

        return Response({"success": True, "message": "Password changed successfully."})


class SettingsSessionsView(APIView):
    """
    GET /api/settings/sessions — List active sessions.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = UserSession.objects.filter(user=request.user, is_active=True)
        return Response({
            "success": True,
            "data": UserSessionSerializer(sessions, many=True).data,
        })


class SettingsLogoutAllView(APIView):
    """
    POST /api/settings/logout-all — Logout from all devices.
    Blacklists all outstanding refresh tokens.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Blacklist all outstanding tokens for this user
        tokens = OToken.objects.filter(user=request.user)
        for token in tokens:
            try:
                BToken.objects.get_or_create(token=token)
            except Exception:
                pass

        # Mark all sessions as inactive
        UserSession.objects.filter(user=request.user, is_active=True).update(is_active=False)

        return Response({"success": True, "message": "Logged out from all devices."})


class SettingsDeactivateView(APIView):
    """
    POST /api/settings/deactivate — Deactivate account.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DeactivateAccountSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.check_password(serializer.validated_data["password"]):
            return Response(
                {"success": False, "error": {"message": "Password is incorrect."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.is_active = False
        request.user.save(update_fields=["is_active"])

        # Blacklist all tokens
        tokens = OToken.objects.filter(user=request.user)
        for token in tokens:
            try:
                BToken.objects.get_or_create(token=token)
            except Exception:
                pass

        return Response({"success": True, "message": "Account deactivated."})


class SettingsDeleteAccountView(APIView):
    """
    DELETE /api/settings/delete — Permanently delete account.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        serializer = DeleteAccountSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not request.user.check_password(serializer.validated_data["password"]):
            return Response(
                {"success": False, "error": {"message": "Password is incorrect."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Permanently delete the user and all related data
        request.user.delete()

        return Response({"success": True, "message": "Account permanently deleted."})
