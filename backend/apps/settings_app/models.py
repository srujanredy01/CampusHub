"""
User Settings model for CampusHub.
Stores user preferences for notifications, privacy, appearance, and language.
"""
import uuid
from django.db import models
from django.conf import settings


class UserSettings(models.Model):
    THEME_CHOICES = [
        ("light", "Light"),
        ("dark", "Dark"),
        ("system", "System"),
    ]

    LANGUAGE_CHOICES = [
        ("en", "English"),
        ("hi", "Hindi"),
        ("te", "Telugu"),
        ("ta", "Tamil"),
        ("kn", "Kannada"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="settings",
    )

    # Appearance
    theme = models.CharField(max_length=10, choices=THEME_CHOICES, default="system")

    # Notification Preferences
    coding_alerts = models.BooleanField(default=True)
    contest_reminders = models.BooleanField(default=True)
    assignment_reminders = models.BooleanField(default=True)
    placement_updates = models.BooleanField(default=True)
    news_updates = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)

    # Privacy
    profile_visibility = models.BooleanField(default=True, help_text="Profile visible to others")
    show_coding_profile = models.BooleanField(default=True)
    show_achievements = models.BooleanField(default=True)
    leaderboard_visibility = models.BooleanField(default=True)

    # Language
    language = models.CharField(max_length=5, choices=LANGUAGE_CHOICES, default="en")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_settings"
        verbose_name = "User Settings"
        verbose_name_plural = "User Settings"

    def __str__(self):
        return f"Settings for {self.user.full_name}"


class UserSession(models.Model):
    """Track active user sessions."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sessions_log",
    )
    device = models.CharField(max_length=255, blank=True, default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True, default="")
    user_agent = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    last_active = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_sessions"
        ordering = ["-last_active"]

    def __str__(self):
        return f"{self.user.full_name} — {self.device} ({self.ip_address})"
