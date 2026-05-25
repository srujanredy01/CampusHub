"""
Audit & Activity Tracking models for CampusHub.
Tracks admin actions, user activity, and API requests.
"""
import uuid
from django.db import models
from django.conf import settings


class AuditLog(models.Model):
    """Admin action audit trail."""
    ACTION_CHOICES = [
        ("admin_login",           "Admin Login"),
        ("admin_logout",          "Admin Logout"),
        ("student_view",          "Student Viewed"),
        ("student_deactivate",    "Student Deactivated"),
        ("student_activate",      "Student Activated"),
        ("student_delete",        "Student Deleted"),
        ("student_password_reset","Student Password Reset"),
        ("student_export",        "Student List Exported"),
        ("resource_upload",       "Resource Uploaded"),
        ("resource_edit",         "Resource Edited"),
        ("resource_delete",       "Resource Deleted"),
        ("news_create",           "News Created"),
        ("news_edit",             "News Edited"),
        ("news_delete",           "News Deleted"),
        ("news_pin",              "News Pinned"),
        ("question_create",       "Question Created"),
        ("question_edit",         "Question Edited"),
        ("question_delete",       "Question Deleted"),
        ("notification_send",     "Notification Sent"),
        ("settings_change",       "Settings Changed"),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admin        = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="audit_logs",
    )
    action       = models.CharField(max_length=50, choices=ACTION_CHOICES)
    target_model = models.CharField(max_length=100, blank=True)
    target_id    = models.CharField(max_length=255, blank=True)
    description  = models.TextField()
    ip_address   = models.GenericIPAddressField(null=True, blank=True)
    user_agent   = models.CharField(max_length=500, blank=True)
    metadata     = models.JSONField(default=dict, blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["admin", "-created_at"]),
            models.Index(fields=["action"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"[{self.action}] by {self.admin} at {self.created_at}"


class UserActivityLog(models.Model):
    """
    Tracks every meaningful user action across the platform.
    Stored in DB for analytics, security monitoring, and debugging.
    """
    ACTION_CHOICES = [
        # Auth
        ("login",                 "Login"),
        ("login_failed",          "Login Failed"),
        ("logout",                "Logout"),
        ("signup",                "Signup"),
        ("password_change",       "Password Changed"),
        ("password_reset_request","Password Reset Requested"),
        ("password_reset_done",   "Password Reset Completed"),
        # Navigation / page visits
        ("page_visit",            "Page Visit"),
        # Profile
        ("profile_view",          "Profile Viewed"),
        ("profile_update",        "Profile Updated"),
        # Resources
        ("resource_view",         "Resource Viewed"),
        ("resource_download",     "Resource Downloaded"),
        ("resource_preview",      "Resource Previewed"),
        # News
        ("news_view",             "News Viewed"),
        ("news_save",             "News Saved"),
        ("news_unsave",           "News Unsaved"),
        # Coding
        ("question_view",         "Question Viewed"),
        ("question_save",         "Question Saved"),
        ("code_run",              "Code Run"),
        ("code_submit",           "Code Submitted"),
        # Notifications
        ("notification_view",     "Notifications Viewed"),
        ("notification_mark_read","Notifications Marked Read"),
        # Admin
        ("admin_action",          "Admin Action"),
        # Generic
        ("api_request",           "API Request"),
    ]

    STATUS_CHOICES = [
        ("success", "Success"),
        ("failed",  "Failed"),
        ("error",   "Error"),
    ]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="activity_logs_detailed",
    )
    # Denormalized for fast queries even after user deletion
    username   = models.CharField(max_length=255, blank=True)
    student_id = models.CharField(max_length=50, blank=True)
    role       = models.CharField(max_length=20, blank=True)

    action     = models.CharField(max_length=50, choices=ACTION_CHOICES, db_index=True)
    endpoint   = models.CharField(max_length=500, blank=True)
    method     = models.CharField(max_length=10, blank=True)
    status     = models.CharField(max_length=10, choices=STATUS_CHOICES, default="success")
    status_code= models.PositiveSmallIntegerField(null=True, blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=1000, blank=True)
    # Parsed from user_agent
    device     = models.CharField(max_length=100, blank=True)
    browser    = models.CharField(max_length=100, blank=True)
    os         = models.CharField(max_length=100, blank=True)

    metadata   = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "user_activity_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["action", "-created_at"]),
            models.Index(fields=["ip_address"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"[{self.action}] {self.username or 'anonymous'} @ {self.created_at}"


class ExecutionLog(models.Model):
    """Tracks every code execution for monitoring and security."""
    STATUS_CHOICES = [
        ("success",           "Success"),
        ("timeout",           "Timeout"),
        ("memory_exceeded",   "Memory Exceeded"),
        ("runtime_error",     "Runtime Error"),
        ("compilation_error", "Compilation Error"),
        ("suspicious",        "Suspicious"),
    ]

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user           = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="execution_logs",
    )
    language       = models.CharField(max_length=20)
    status         = models.CharField(max_length=30, choices=STATUS_CHOICES)
    execution_time = models.FloatField(null=True, blank=True)
    memory_used    = models.PositiveIntegerField(null=True, blank=True)
    is_submission  = models.BooleanField(default=False)
    question_id    = models.CharField(max_length=255, blank=True)
    ip_address     = models.GenericIPAddressField(null=True, blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "execution_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["status"]),
            models.Index(fields=["user"]),
        ]
