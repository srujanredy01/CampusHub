from django.contrib import admin
from .models import UserSettings, UserSession


@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ["user", "theme", "language", "updated_at"]
    list_filter = ["theme", "language"]
    search_fields = ["user__full_name", "user__email"]


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ["user", "device", "ip_address", "is_active", "last_active"]
    list_filter = ["is_active"]
    search_fields = ["user__full_name", "user__email"]
