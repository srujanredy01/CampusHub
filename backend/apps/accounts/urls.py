from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    SignupView, LoginView, LogoutView, VerifyEmailView,
    ForgotPasswordView, ResetPasswordView, ChangePasswordView,
    ResendVerificationView, MeView, CreateFacultyView,
    CreateAdminUserView, UnlockAccountView,
)

urlpatterns = [
    path("signup", SignupView.as_view(), name="auth-signup"),
    path("login", LoginView.as_view(), name="auth-login"),
    path("logout", LogoutView.as_view(), name="auth-logout"),
    path("verify-email", VerifyEmailView.as_view(), name="auth-verify-email"),
    path("forgot-password", ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("reset-password", ResetPasswordView.as_view(), name="auth-reset-password"),
    path("change-password", ChangePasswordView.as_view(), name="auth-change-password"),
    path("resend-verification", ResendVerificationView.as_view(), name="auth-resend-verification"),
    path("token/refresh", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("me", MeView.as_view(), name="auth-me"),
    # Admin endpoints
    path("create-faculty", CreateFacultyView.as_view(), name="auth-create-faculty"),
    path("create-admin-user", CreateAdminUserView.as_view(), name="auth-create-admin-user"),
    path("unlock/<uuid:user_id>", UnlockAccountView.as_view(), name="auth-unlock-account"),
]
