from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import SignupView, LoginView, LogoutView, VerifyEmailView, ForgotPasswordView, ResetPasswordView, ChangePasswordView, ResendVerificationView, MeView

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
]
