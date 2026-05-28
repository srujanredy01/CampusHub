"""
Moderation Dashboard serializers — production-grade moderation system.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    ModeratorProfile, ContentReport, ModerationActionLog,
    ApprovalRequest, UserWarning, UserBan, UserMute,
    UserViolation, AutoModerationRule, AutoModerationLog,
    ShadowMonitorSession, EscalationConfig,
)

User = get_user_model()


class ModeratorProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = ModeratorProfile
        fields = [
            "id", "full_name", "email", "scope", "department", "section",
            "branch", "semester", "can_moderate_channels", "can_moderate_notes",
            "can_moderate_roadmaps", "can_moderate_groups", "can_moderate_chat",
            "can_ban_users", "can_delete_content", "can_view_audit_logs",
            "can_shadow_monitor",
            "total_actions", "total_approvals", "total_rejections",
            "total_warnings_issued", "total_bans_issued",
            "is_active", "appointed_at", "created_at",
        ]
        read_only_fields = [
            "id", "total_actions", "total_approvals", "total_rejections",
            "total_warnings_issued", "total_bans_issued", "created_at",
        ]


class ContentReportSerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source="reporter.full_name", read_only=True)
    reported_user_name = serializers.CharField(source="reported_user.full_name", read_only=True, default="")
    assigned_to_name = serializers.CharField(source="assigned_to.full_name", read_only=True, default="")

    class Meta:
        model = ContentReport
        fields = [
            "id", "reporter", "reporter_name", "content_type", "content_id",
            "content_preview", "reported_user", "reported_user_name",
            "reason", "description", "priority", "status",
            "assigned_to", "assigned_to_name", "resolved_by",
            "resolution_note", "action_taken", "resolved_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "reporter", "created_at", "updated_at"]


class ContentReportCreateSerializer(serializers.Serializer):
    content_type = serializers.ChoiceField(choices=ContentReport.CONTENT_TYPE_CHOICES)
    content_id = serializers.UUIDField()
    content_preview = serializers.CharField(required=False, default="")
    reported_user = serializers.UUIDField(required=False, allow_null=True)
    reason = serializers.ChoiceField(choices=ContentReport.REASON_CHOICES)
    description = serializers.CharField(required=False, default="")


class ContentReportResolveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["resolved", "rejected", "investigating", "escalated"])
    resolution_note = serializers.CharField(required=False, default="")
    action_taken = serializers.CharField(required=False, default="")


class ModerationActionLogSerializer(serializers.ModelSerializer):
    moderator_name = serializers.CharField(source="moderator.full_name", read_only=True, default="System")
    target_user_name = serializers.CharField(source="target_user.full_name", read_only=True, default="")

    class Meta:
        model = ModerationActionLog
        fields = [
            "id", "moderator", "moderator_name", "action",
            "target_type", "target_id", "target_user", "target_user_name",
            "reason", "details", "ip_address", "is_automated", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ApprovalRequestSerializer(serializers.ModelSerializer):
    requested_by_name = serializers.CharField(source="requested_by.full_name", read_only=True)
    reviewed_by_name = serializers.CharField(source="reviewed_by.full_name", read_only=True, default="")

    class Meta:
        model = ApprovalRequest
        fields = [
            "id", "request_type", "content_id", "title", "description", "metadata",
            "requested_by", "requested_by_name", "status",
            "reviewed_by", "reviewed_by_name", "review_notes",
            "reviewed_at", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "requested_by", "created_at", "updated_at"]


class ApprovalActionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["approved", "rejected", "needs_changes"])
    review_notes = serializers.CharField(required=False, default="")


class UserWarningSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    issued_by_name = serializers.CharField(source="issued_by.full_name", read_only=True, default="System")

    class Meta:
        model = UserWarning
        fields = [
            "id", "user", "user_name", "issued_by", "issued_by_name",
            "reason", "severity", "source", "related_content_type",
            "related_content_id", "triggered_word",
            "is_acknowledged", "acknowledged_at", "expires_at",
            "is_active", "created_at",
        ]
        read_only_fields = ["id", "issued_by", "created_at"]


class UserWarningCreateSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    reason = serializers.CharField()
    severity = serializers.ChoiceField(choices=["mild", "moderate", "severe"])
    related_content_type = serializers.CharField(required=False, default="")
    related_content_id = serializers.UUIDField(required=False, allow_null=True)


class UserBanSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    banned_by_name = serializers.CharField(source="banned_by.full_name", read_only=True, default="System")
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = UserBan
        fields = [
            "id", "user", "user_name", "banned_by", "banned_by_name",
            "ban_type", "scope", "scope_target_id", "reason",
            "starts_at", "expires_at", "is_active", "is_automated",
            "is_expired", "lifted_by", "lifted_at", "lift_reason", "created_at",
        ]
        read_only_fields = ["id", "banned_by", "created_at"]


class UserBanCreateSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    ban_type = serializers.ChoiceField(choices=["temporary", "permanent"])
    scope = serializers.ChoiceField(choices=["platform", "chat", "channel", "posting", "study_group", "upload"])
    scope_target_id = serializers.UUIDField(required=False, allow_null=True)
    reason = serializers.CharField()
    duration_hours = serializers.IntegerField(required=False, allow_null=True)


class UserMuteSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    muted_by_name = serializers.CharField(source="muted_by.full_name", read_only=True, default="System")
    is_expired = serializers.BooleanField(read_only=True)

    class Meta:
        model = UserMute
        fields = [
            "id", "user", "user_name", "muted_by", "muted_by_name",
            "channel_id", "reason", "is_automated",
            "starts_at", "expires_at", "is_active", "is_expired", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class UserMuteCreateSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    channel_id = serializers.UUIDField(required=False, allow_null=True)
    reason = serializers.CharField(required=False, default="")
    duration_minutes = serializers.IntegerField(default=60)


class UserViolationSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = UserViolation
        fields = [
            "id", "user", "user_name", "violation_type",
            "content_snapshot", "channel_id", "message_id",
            "detected_by", "action_taken", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AutoModerationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutoModerationRule
        fields = [
            "id", "name", "rule_type", "pattern", "action", "severity",
            "is_active", "applies_to_channels", "applies_to_groups",
            "applies_to_dms", "exempt_roles", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AutoModerationLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    rule_name = serializers.CharField(source="rule.name", read_only=True, default="")

    class Meta:
        model = AutoModerationLog
        fields = [
            "id", "rule", "rule_name", "user", "user_name",
            "channel_id", "message_id", "content_snapshot",
            "matched_pattern", "action_taken", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class EscalationConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = EscalationConfig
        fields = [
            "id", "name", "warnings_before_mute", "mute_duration_minutes",
            "mutes_before_suspend", "suspend_duration_hours",
            "suspensions_before_ban", "violation_window_hours",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ModerationDashboardStatsSerializer(serializers.Serializer):
    """Dashboard overview stats for moderators."""
    pending_reports = serializers.IntegerField()
    investigating_reports = serializers.IntegerField()
    pending_channel_requests = serializers.IntegerField()
    pending_roadmaps = serializers.IntegerField()
    pending_notes = serializers.IntegerField()
    pending_study_groups = serializers.IntegerField()
    active_bans = serializers.IntegerField()
    recent_violations = serializers.IntegerField()
    active_users_today = serializers.IntegerField()
    total_actions_today = serializers.IntegerField()
