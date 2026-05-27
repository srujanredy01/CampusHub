from django.urls import path
from .views import (
    SettingsView,
    SettingsChangePasswordView,
    SettingsSessionsView,
    SettingsLogoutAllView,
    SettingsDeactivateView,
    SettingsDeleteAccountView,
)

urlpatterns = [
    path("", SettingsView.as_view(), name="settings"),
    path("change-password", SettingsChangePasswordView.as_view(), name="settings-change-password"),
    path("sessions", SettingsSessionsView.as_view(), name="settings-sessions"),
    path("logout-all", SettingsLogoutAllView.as_view(), name="settings-logout-all"),
    path("deactivate", SettingsDeactivateView.as_view(), name="settings-deactivate"),
    path("delete", SettingsDeleteAccountView.as_view(), name="settings-delete"),
]
