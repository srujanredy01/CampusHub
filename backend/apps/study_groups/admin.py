from django.contrib import admin
from .models import StudyGroup, GroupMembership, GroupPost, GroupInvitation, GroupMeeting


@admin.register(StudyGroup)
class StudyGroupAdmin(admin.ModelAdmin):
    list_display = ["name", "visibility", "branch", "semester", "member_count", "max_members", "created_by", "is_active", "updated_at"]
    list_filter = ["visibility", "branch", "semester", "is_active"]
    search_fields = ["name", "subject", "description", "created_by__full_name"]
    readonly_fields = ["id", "invite_code", "websocket_room", "last_activity_at", "created_at", "updated_at"]


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ["group", "user", "role", "is_active", "joined_at"]
    list_filter = ["role", "is_active"]
    search_fields = ["group__name", "user__full_name", "user__student_id"]


@admin.register(GroupPost)
class GroupPostAdmin(admin.ModelAdmin):
    list_display = ["group", "author", "post_type", "is_pinned", "is_deleted", "created_at"]
    list_filter = ["post_type", "is_pinned", "is_deleted"]
    search_fields = ["title", "content", "group__name", "author__full_name"]


@admin.register(GroupInvitation)
class GroupInvitationAdmin(admin.ModelAdmin):
    list_display = ["group", "invited_by", "invited_user", "status", "expires_at", "created_at"]
    list_filter = ["status"]
    search_fields = ["group__name", "invited_user__full_name", "invited_by__full_name", "token"]


@admin.register(GroupMeeting)
class GroupMeetingAdmin(admin.ModelAdmin):
    list_display = ["group", "title", "starts_at", "ends_at", "status", "scheduled_by"]
    list_filter = ["status"]
    search_fields = ["group__name", "title", "scheduled_by__full_name"]
