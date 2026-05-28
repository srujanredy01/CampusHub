"""
Moderation System models for CampusHub.
Production-grade moderation ecosystem: content review, auto-moderation,
warning escalation, ban management, real-time monitoring, and audit trails.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class ModeratorProfile(models.Model):
    """Extended profile for moderators with scope and permissions."""

    SCOPE_CHOICES = [
        ("global", "Global Moderator"),
        ("department", "Department Moderator"),
        ("section", "Section Moderator"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="moderator_profile"
    )
    scope = models.CharField(max_length=15, choices=SCOPE_CHOICES, default="global")
    department = models.CharField(max_length=100, blank=True, default="")
    section = models.CharField(max_length=10, blank=True, default="")
    branch = models.CharField(max_length=100, blank=True, default="")
    semester = models.PositiveSmallIntegerField(null=True, blank=True)

    # Permissions
    can_moderate_channels = models.BooleanField(default=True)
    can_moderate_notes = models.BooleanField(default=True)
    can_moderate_roadmaps = models.BooleanField(default=True)
    can_moderate_groups = models.BooleanField(default=True)
    can_moderate_chat = models.BooleanField(default=True)
    can_ban_users = models.BooleanField(default=False)
    can_delete_content = models.BooleanField(default=True)
    can_view_audit_logs = models.BooleanField(default=True)
    can_shadow_monitor = models.BooleanField(default=False)

    # Stats
    total_actions = models.PositiveIntegerField(default=0)
    total_approvals = models.PositiveIntegerField(default=0)
    total_rejections = models.PositiveIntegerField(default=0)
    total_warnings_issued = models.PositiveIntegerField(default=0)
    total_bans_issued = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)
    appointed_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "moderator_profiles"
        indexes = [
            models.Index(fields=["scope", "is_active"]),
            models.Index(fields=["department"]),
            models.Index(fields=["user"]),
        ]

    def __str__(self):
        return f"{self.user.full_name} — {self.scope} Moderator"


class ContentReport(models.Model):
    """Unified content reporting system across all modules."""

    CONTENT_TYPE_CHOICES = [
        ("message", "Chat Message"),
        ("note", "Note"),
        ("roadmap", "Roadmap"),
        ("study_group", "Study Group"),
        ("profile", "User Profile"),
        ("comment", "Comment"),
        ("resource", "Resource"),
        ("event", "Event"),
        ("channel", "Channel"),
    ]

    REASON_CHOICES = [
        ("spam", "Spam"),
        ("harassment", "Harassment"),
        ("inappropriate", "Inappropriate Content"),
        ("hate_speech", "Hate Speech"),
        ("copyright", "Copyright Violation"),
        ("misinformation", "Misinformation"),
        ("impersonation", "Impersonation"),
        ("violence", "Violence/Threats"),
        ("bullying", "Bullying"),
        ("toxic", "Toxic Behavior"),
        ("plagiarism", "Plagiarism"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("investigating", "Investigating"),
        ("resolved", "Resolved"),
        ("rejected", "Rejected"),
        ("escalated", "Escalated"),
    ]

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
        ("critical", "Critical"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="filed_reports"
    )
    content_type = models.CharField(max_length=15, choices=CONTENT_TYPE_CHOICES)
    content_id = models.UUIDField(help_text="ID of the reported content")
    content_preview = models.TextField(blank=True, default="")

    reported_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="reports_against"
    )

    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    description = models.TextField(blank=True, default="")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="pending")

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="assigned_reports"
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="resolved_reports"
    )
    resolution_note = models.TextField(blank=True, default="")
    action_taken = models.CharField(max_length=100, blank=True, default="")
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "content_reports"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "priority", "-created_at"]),
            models.Index(fields=["content_type", "status"]),
            models.Index(fields=["reported_user", "-created_at"]),
            models.Index(fields=["assigned_to", "status"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"Report: {self.content_type} — {self.reason} ({self.status})"


class ModerationActionLog(models.Model):
    """Immutable audit log for all moderation actions."""

    ACTION_CHOICES = [
        ("channel_approved", "Channel Approved"),
        ("channel_rejected", "Channel Rejected"),
        ("channel_archived", "Channel Archived"),
        ("channel_locked", "Channel Locked"),
        ("channel_unlocked", "Channel Unlocked"),
        ("channel_deleted", "Channel Deleted"),
        ("channel_slow_mode", "Channel Slow Mode Set"),
        ("user_warned", "User Warned"),
        ("user_muted", "User Muted"),
        ("user_unmuted", "User Unmuted"),
        ("user_kicked", "User Kicked"),
        ("user_banned", "User Banned"),
        ("user_unbanned", "User Unbanned"),
        ("user_suspended", "User Suspended"),
        ("user_unsuspended", "User Unsuspended"),
        ("message_deleted", "Message Deleted"),
        ("note_approved", "Note Approved"),
        ("note_rejected", "Note Rejected"),
        ("note_flagged", "Note Flagged"),
        ("note_deleted", "Note Deleted"),
        ("roadmap_approved", "Roadmap Approved"),
        ("roadmap_rejected", "Roadmap Rejected"),
        ("roadmap_changes_requested", "Roadmap Changes Requested"),
        ("roadmap_featured", "Roadmap Featured"),
        ("roadmap_archived", "Roadmap Archived"),
        ("roadmap_plagiarism_flagged", "Roadmap Plagiarism Flagged"),
        ("group_suspended", "Study Group Suspended"),
        ("group_removed", "Study Group Removed"),
        ("content_removed", "Content Removed"),
        ("report_resolved", "Report Resolved"),
        ("report_rejected", "Report Rejected"),
        ("report_escalated", "Report Escalated"),
        ("auto_warning", "Auto Warning Issued"),
        ("auto_mute", "Auto Mute Applied"),
        ("auto_suspend", "Auto Suspension Applied"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="moderation_action_logs"
    )
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    target_type = models.CharField(max_length=50, blank=True, default="")
    target_id = models.UUIDField(null=True, blank=True)
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="moderation_actions_received"
    )
    reason = models.TextField(blank=True, default="")
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    is_automated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "moderation_action_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["moderator", "-created_at"]),
            models.Index(fields=["action", "-created_at"]),
            models.Index(fields=["target_user", "-created_at"]),
            models.Index(fields=["-created_at"]),
            models.Index(fields=["is_automated", "-created_at"]),
        ]

    def __str__(self):
        return f"[{self.action}] by {self.moderator} at {self.created_at}"


class ApprovalRequest(models.Model):
    """Tracks approval workflows for channels, roadmaps, notes, etc."""

    REQUEST_TYPE_CHOICES = [
        ("channel", "Channel Creation"),
        ("roadmap", "Roadmap Publication"),
        ("note", "Note Publication"),
        ("study_group", "Study Group Creation"),
        ("event", "Event Publication"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("needs_changes", "Needs Changes"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_type = models.CharField(max_length=15, choices=REQUEST_TYPE_CHOICES)
    content_id = models.UUIDField(help_text="ID of the content awaiting approval")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="approval_requests"
    )
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="pending")

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="reviewed_approvals"
    )
    review_notes = models.TextField(blank=True, default="")
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "approval_requests"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["request_type", "status", "-created_at"]),
            models.Index(fields=["requested_by", "status"]),
            models.Index(fields=["status", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.request_type}: {self.title} ({self.status})"


class UserWarning(models.Model):
    """Warnings issued to users by moderators or auto-moderation."""

    SEVERITY_CHOICES = [
        ("mild", "Mild"),
        ("moderate", "Moderate"),
        ("severe", "Severe"),
    ]

    SOURCE_CHOICES = [
        ("manual", "Manual (Moderator)"),
        ("auto", "Automatic (System)"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="warnings_received"
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="warnings_issued"
    )
    reason = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="mild")
    source = models.CharField(max_length=10, choices=SOURCE_CHOICES, default="manual")
    related_content_type = models.CharField(max_length=50, blank=True, default="")
    related_content_id = models.UUIDField(null=True, blank=True)
    triggered_word = models.CharField(max_length=100, blank=True, default="")
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_warnings"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_active", "-created_at"]),
            models.Index(fields=["issued_by", "-created_at"]),
            models.Index(fields=["severity"]),
            models.Index(fields=["source", "-created_at"]),
        ]

    def __str__(self):
        return f"Warning to {self.user.full_name}: {self.reason[:50]}"


class UserBan(models.Model):
    """Bans issued to users — supports multiple scopes and types."""

    BAN_TYPE_CHOICES = [
        ("temporary", "Temporary"),
        ("permanent", "Permanent"),
    ]

    SCOPE_CHOICES = [
        ("platform", "Platform-wide"),
        ("chat", "Chat Only"),
        ("channel", "Specific Channel"),
        ("posting", "Posting Only"),
        ("study_group", "Study Group Restriction"),
        ("upload", "Upload Restriction"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bans"
    )
    banned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="bans_issued"
    )
    ban_type = models.CharField(max_length=10, choices=BAN_TYPE_CHOICES, default="temporary")
    scope = models.CharField(max_length=15, choices=SCOPE_CHOICES, default="platform")
    scope_target_id = models.UUIDField(null=True, blank=True, help_text="Channel/Group ID for scoped bans")
    reason = models.TextField()
    starts_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_automated = models.BooleanField(default=False)
    lifted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="bans_lifted"
    )
    lifted_at = models.DateTimeField(null=True, blank=True)
    lift_reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_bans"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_active", "scope"]),
            models.Index(fields=["is_active", "-created_at"]),
            models.Index(fields=["scope", "is_active"]),
            models.Index(fields=["expires_at"]),
        ]

    def __str__(self):
        return f"Ban: {self.user.full_name} ({self.ban_type} — {self.scope})"

    @property
    def is_expired(self):
        if self.ban_type == "permanent":
            return False
        if self.expires_at and timezone.now() > self.expires_at:
            return True
        return False


class UserMute(models.Model):
    """Mute records — user cannot send messages for a duration."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mutes"
    )
    muted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="mutes_issued"
    )
    channel_id = models.UUIDField(null=True, blank=True, help_text="Null = global mute")
    reason = models.TextField(blank=True, default="")
    is_automated = models.BooleanField(default=False)
    starts_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_mutes"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["expires_at", "is_active"]),
            models.Index(fields=["channel_id", "user", "is_active"]),
        ]

    def __str__(self):
        return f"Mute: {self.user.full_name} until {self.expires_at}"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at


class UserViolation(models.Model):
    """Tracks cumulative violations for escalation logic."""

    VIOLATION_TYPE_CHOICES = [
        ("profanity", "Profanity"),
        ("spam", "Spam"),
        ("harassment", "Harassment"),
        ("hate_speech", "Hate Speech"),
        ("threat", "Threat"),
        ("toxic", "Toxic Behavior"),
        ("link_abuse", "Link Abuse"),
        ("caps_spam", "Caps Spam"),
        ("mass_mention", "Mass Mention Spam"),
        ("duplicate_message", "Duplicate Message"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="violations"
    )
    violation_type = models.CharField(max_length=20, choices=VIOLATION_TYPE_CHOICES)
    content_snapshot = models.TextField(blank=True, default="")
    channel_id = models.UUIDField(null=True, blank=True)
    message_id = models.UUIDField(null=True, blank=True)
    detected_by = models.CharField(max_length=20, default="auto", help_text="auto or moderator UUID")
    action_taken = models.CharField(max_length=50, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_violations"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["violation_type", "-created_at"]),
            models.Index(fields=["user", "violation_type"]),
        ]

    def __str__(self):
        return f"Violation: {self.user.full_name} — {self.violation_type}"


class AutoModerationRule(models.Model):
    """Configurable auto-moderation rules."""

    RULE_TYPE_CHOICES = [
        ("keyword", "Keyword Filter"),
        ("regex", "Regex Pattern"),
        ("spam_detection", "Spam Detection"),
        ("link_filter", "Link Filter"),
        ("caps_filter", "Caps Filter"),
        ("mention_limit", "Mention Limit"),
        ("duplicate_filter", "Duplicate Message Filter"),
        ("rate_limit", "Message Rate Limit"),
    ]

    ACTION_CHOICES = [
        ("delete", "Delete Message"),
        ("warn", "Warn User"),
        ("mute", "Mute User"),
        ("flag", "Flag for Review"),
        ("block", "Block Message"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    rule_type = models.CharField(max_length=20, choices=RULE_TYPE_CHOICES)
    pattern = models.TextField(help_text="Keywords (comma-separated) or regex pattern")
    action = models.CharField(max_length=10, choices=ACTION_CHOICES, default="flag")
    severity = models.CharField(max_length=10, default="mild")
    is_active = models.BooleanField(default=True)
    applies_to_channels = models.BooleanField(default=True)
    applies_to_groups = models.BooleanField(default=True)
    applies_to_dms = models.BooleanField(default=False)
    exempt_roles = models.JSONField(default=list, blank=True, help_text="Roles exempt from this rule")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "auto_moderation_rules"
        ordering = ["rule_type", "name"]
        indexes = [
            models.Index(fields=["rule_type", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.rule_type})"


class AutoModerationLog(models.Model):
    """Log of auto-moderation actions taken on messages."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rule = models.ForeignKey(AutoModerationRule, on_delete=models.SET_NULL, null=True, related_name="logs")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="auto_mod_logs"
    )
    channel_id = models.UUIDField(null=True, blank=True)
    message_id = models.UUIDField(null=True, blank=True)
    content_snapshot = models.TextField(blank=True, default="")
    matched_pattern = models.CharField(max_length=200, blank=True, default="")
    action_taken = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "auto_moderation_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["rule", "-created_at"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"AutoMod: {self.user} — {self.action_taken}"


class ShadowMonitorSession(models.Model):
    """Tracks moderator shadow monitoring sessions in channels."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="shadow_sessions"
    )
    channel_id = models.UUIDField(help_text="Channel being monitored")
    group_id = models.UUIDField(null=True, blank=True, help_text="Study group being monitored")
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "shadow_monitor_sessions"
        ordering = ["-started_at"]
        indexes = [
            models.Index(fields=["moderator", "is_active"]),
            models.Index(fields=["channel_id", "is_active"]),
        ]

    def __str__(self):
        return f"Shadow: {self.moderator.full_name} in {self.channel_id}"


class EscalationConfig(models.Model):
    """Configurable escalation thresholds for auto-moderation."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    warnings_before_mute = models.PositiveIntegerField(default=3)
    mute_duration_minutes = models.PositiveIntegerField(default=60)
    mutes_before_suspend = models.PositiveIntegerField(default=3)
    suspend_duration_hours = models.PositiveIntegerField(default=24)
    suspensions_before_ban = models.PositiveIntegerField(default=3)
    violation_window_hours = models.PositiveIntegerField(default=168, help_text="Rolling window for counting violations")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "escalation_configs"

    def __str__(self):
        return self.name
