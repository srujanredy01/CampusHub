"""
Feedback & Issue Reporting models for CampusHub.
Native in-platform feedback system for bug reports, feature requests, and suggestions.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class FeedbackReport(models.Model):
    """Primary feedback/issue report submitted by users."""

    FEEDBACK_TYPE_CHOICES = [
        ("bug", "Report Bug"),
        ("feature", "Suggest Feature"),
        ("general", "General Feedback"),
        ("ui_ux", "UI/UX Feedback"),
        ("performance", "Performance Issue"),
        ("security", "Security Concern"),
        ("academic", "Academic Issue"),
        ("placement", "Placement Module Feedback"),
        ("chat", "Chat/Study Group Issue"),
    ]

    SEVERITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    STATUS_CHOICES = [
        ("open", "Open"),
        ("investigating", "Investigating"),
        ("resolved", "Resolved"),
        ("closed", "Closed"),
        ("rejected", "Rejected"),
        ("needs_more_info", "Needs More Info"),
    ]

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tracking_id = models.CharField(
        max_length=20, unique=True, editable=False,
        help_text="Human-readable tracking ID like FB-2026-1042"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="feedback_reports"
    )

    # Feedback details
    feedback_type = models.CharField(max_length=15, choices=FEEDBACK_TYPE_CHOICES)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="medium")
    title = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField()
    tags = models.JSONField(default=list, blank=True, help_text="Category tags like UI Issue, Performance, etc.")

    # Page context (auto-detected)
    page_url = models.CharField(max_length=500, blank=True, default="")
    route_path = models.CharField(max_length=255, blank=True, default="")
    browser_info = models.CharField(max_length=500, blank=True, default="")
    device_type = models.CharField(max_length=50, blank=True, default="")
    screen_resolution = models.CharField(max_length=50, blank=True, default="")
    user_agent = models.TextField(blank=True, default="")

    # Status & assignment
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="open")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="assigned_feedback"
    )

    # Resolution
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="resolved_feedback"
    )
    resolution_note = models.TextField(blank=True, default="")
    resolved_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "feedback_reports"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "priority", "-created_at"]),
            models.Index(fields=["feedback_type", "status"]),
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["assigned_to", "status"]),
            models.Index(fields=["tracking_id"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"[{self.tracking_id}] {self.feedback_type} — {self.status}"

    def save(self, *args, **kwargs):
        if not self.tracking_id:
            self.tracking_id = self._generate_tracking_id()
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_tracking_id():
        """Generate a human-readable tracking ID like FB-2026-1042."""
        import random
        year = timezone.now().year
        seq = random.randint(1000, 9999)
        return f"FB-{year}-{seq}"


class FeedbackAttachment(models.Model):
    """File attachments for feedback reports (screenshots, PDFs)."""

    ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "application/pdf"]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(
        FeedbackReport, on_delete=models.CASCADE, related_name="attachments"
    )
    file = models.FileField(upload_to="feedback/attachments/%Y/%m/")
    file_name = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    content_type = models.CharField(max_length=100)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "feedback_attachments"
        ordering = ["uploaded_at"]

    def __str__(self):
        return f"{self.file_name} ({self.report.tracking_id})"


class FeedbackResponse(models.Model):
    """Admin/moderator responses to feedback reports."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(
        FeedbackReport, on_delete=models.CASCADE, related_name="responses"
    )
    responder = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="feedback_responses"
    )
    message = models.TextField()
    is_internal = models.BooleanField(
        default=False, help_text="Internal notes not visible to the reporter"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "feedback_responses"
        ordering = ["created_at"]

    def __str__(self):
        return f"Response to {self.report.tracking_id} by {self.responder}"


class FeedbackStatusHistory(models.Model):
    """Tracks status changes for audit trail."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report = models.ForeignKey(
        FeedbackReport, on_delete=models.CASCADE, related_name="status_history"
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="feedback_status_changes"
    )
    old_status = models.CharField(max_length=15)
    new_status = models.CharField(max_length=15)
    note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "feedback_status_history"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.report.tracking_id}: {self.old_status} → {self.new_status}"
