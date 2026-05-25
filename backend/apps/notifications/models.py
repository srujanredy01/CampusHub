"""
Notification models for CampusHub.
Supports user notifications, admin alerts, and real-time delivery.
"""

import uuid
from django.db import models
from django.conf import settings


class Notification(models.Model):
    """In-app notification for a user."""

    NOTIFICATION_TYPES = [
        ("new_resource", "New Resource"),
        ("campus_news", "Campus News"),
        ("coding_reminder", "Coding Reminder"),
        ("system", "System"),
        ("academic", "Academic"),
        ("placement", "Placement"),
        ("event", "Event"),
        ("reminder", "Reminder"),
        ("alert", "Alert"),
        ("attendance", "Attendance"),
        ("study_group", "Study Group"),
        ("coding_contest", "Coding Contest"),
        ("maintenance", "Maintenance"),
    ]

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("normal", "Normal"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="normal")
    is_read = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read"]),
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["notification_type"]),
            models.Index(fields=["priority"]),
        ]

    def __str__(self):
        return f"{self.user.full_name} - {self.title}"


class AdminAlert(models.Model):
    """
    Real-time alerts for admin users triggered by user activities.
    Separate from user notifications — these are admin-only.
    """

    CATEGORY_CHOICES = [
        ("info", "Info"),
        ("warning", "Warning"),
        ("critical", "Critical"),
        ("security", "Security"),
    ]

    ALERT_TYPES = [
        # Auth
        ("new_signup", "New Signup"),
        ("user_login", "User Login"),
        ("failed_login", "Failed Login"),
        ("password_reset", "Password Reset"),
        ("multiple_failed_logins", "Multiple Failed Logins"),
        # Academic
        ("code_submission", "Code Submission"),
        ("note_upload", "Note Upload"),
        ("attendance_update", "Attendance Update"),
        ("cgpa_save", "CGPA Save"),
        ("resource_upload", "Resource Upload"),
        # Placement
        ("placement_update", "Placement Update"),
        # Study Groups
        ("group_created", "Group Created"),
        # Security
        ("suspicious_activity", "Suspicious Activity"),
        ("permission_violation", "Permission Violation"),
        ("excessive_requests", "Excessive Requests"),
        # Profile
        ("profile_change", "Profile Change"),
        # General
        ("system_event", "System Event"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPES)
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES, default="info")
    title = models.CharField(max_length=255)
    message = models.TextField()
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="triggered_alerts",
        help_text="The user who triggered this alert",
    )
    is_read = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "admin_alerts"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_read", "-created_at"]),
            models.Index(fields=["alert_type"]),
            models.Index(fields=["category"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"[{self.category}] {self.title}"


class ScheduledNotification(models.Model):
    """Admin-managed notification campaign with approval workflow."""

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("scheduled", "Scheduled"),
        ("approved", "Approved"),
        ("sent", "Sent"),
        ("cancelled", "Cancelled"),
    ]

    TARGET_CHOICES = [
        ("all", "All Users"),
        ("branch", "By Branch"),
        ("semester", "By Semester"),
        ("role", "By Role"),
        ("selected", "Selected Users"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    notification_type = models.CharField(max_length=20, choices=Notification.NOTIFICATION_TYPES, default="system")
    priority = models.CharField(max_length=10, choices=Notification.PRIORITY_CHOICES, default="normal")
    title = models.CharField(max_length=255)
    message = models.TextField()
    target_type = models.CharField(max_length=20, choices=TARGET_CHOICES, default="all")
    target_branch = models.CharField(max_length=100, blank=True, default="")
    target_semester = models.PositiveSmallIntegerField(null=True, blank=True)
    target_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="targeted_notifications",
    )
    scheduled_for = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    metadata = models.JSONField(default=dict, blank=True)
    sent_count = models.PositiveIntegerField(default=0)
    read_count = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="scheduled_notifications_created",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="scheduled_notifications_approved",
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "scheduled_notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "scheduled_for"]),
            models.Index(fields=["target_branch", "target_semester"]),
        ]

    def __str__(self):
        return self.title
