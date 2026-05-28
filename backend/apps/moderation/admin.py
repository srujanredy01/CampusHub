"""
Django Admin configuration for Moderation models.
"""
from django.contrib import admin
from .models import (
    ModeratorProfile, ContentReport, ModerationActionLog,
    ApprovalRequest, UserWarning, UserBan, UserMute,
    UserViolation, AutoModerationRule, AutoModerationLog,
    ShadowMonitorSession, EscalationConfig,
)


@admin.register(ModeratorProfile)
class ModeratorProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "scope", "is_active", "total_actions", "appointed_at"]
    list_filter = ["scope", "is_active"]
    search_fields = ["user__full_name", "user__email"]


@admin.register(ContentReport)
class ContentReportAdmin(admin.ModelAdmin):
    list_display = ["content_type", "reason", "priority", "status", "reporter", "created_at"]
    list_filter = ["status", "priority", "content_type", "reason"]
    search_fields = ["content_preview", "description"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(ModerationActionLog)
class ModerationActionLogAdmin(admin.ModelAdmin):
    list_display = ["action", "moderator", "target_user", "is_automated", "created_at"]
    list_filter = ["action", "is_automated"]
    search_fields = ["reason", "target_type"]
    readonly_fields = ["id", "created_at"]


@admin.register(ApprovalRequest)
class ApprovalRequestAdmin(admin.ModelAdmin):
    list_display = ["request_type", "title", "status", "requested_by", "created_at"]
    list_filter = ["request_type", "status"]
    search_fields = ["title", "description"]


@admin.register(UserWarning)
class UserWarningAdmin(admin.ModelAdmin):
    list_display = ["user", "severity", "source", "is_active", "created_at"]
    list_filter = ["severity", "source", "is_active"]
    search_fields = ["user__full_name", "reason"]


@admin.register(UserBan)
class UserBanAdmin(admin.ModelAdmin):
    list_display = ["user", "ban_type", "scope", "is_active", "is_automated", "created_at"]
    list_filter = ["ban_type", "scope", "is_active", "is_automated"]
    search_fields = ["user__full_name", "reason"]


@admin.register(UserMute)
class UserMuteAdmin(admin.ModelAdmin):
    list_display = ["user", "is_active", "is_automated", "expires_at", "created_at"]
    list_filter = ["is_active", "is_automated"]
    search_fields = ["user__full_name", "reason"]


@admin.register(UserViolation)
class UserViolationAdmin(admin.ModelAdmin):
    list_display = ["user", "violation_type", "action_taken", "created_at"]
    list_filter = ["violation_type"]
    search_fields = ["user__full_name", "content_snapshot"]


@admin.register(AutoModerationRule)
class AutoModerationRuleAdmin(admin.ModelAdmin):
    list_display = ["name", "rule_type", "action", "is_active"]
    list_filter = ["rule_type", "action", "is_active"]
    search_fields = ["name", "pattern"]


@admin.register(AutoModerationLog)
class AutoModerationLogAdmin(admin.ModelAdmin):
    list_display = ["user", "rule", "action_taken", "created_at"]
    list_filter = ["action_taken"]
    search_fields = ["user__full_name", "content_snapshot"]


@admin.register(ShadowMonitorSession)
class ShadowMonitorSessionAdmin(admin.ModelAdmin):
    list_display = ["moderator", "channel_id", "is_active", "started_at"]
    list_filter = ["is_active"]


@admin.register(EscalationConfig)
class EscalationConfigAdmin(admin.ModelAdmin):
    list_display = ["name", "warnings_before_mute", "mutes_before_suspend", "is_active"]
    list_filter = ["is_active"]
