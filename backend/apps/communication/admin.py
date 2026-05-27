from django.contrib import admin
from .models import (
    Channel, ChannelMembership, Message, MessageReaction,
    DirectConversation, ConversationParticipant, UserPresence,
    BlockedUser, ModerationAction, MessageReport,
)


@admin.register(Channel)
class ChannelAdmin(admin.ModelAdmin):
    list_display = ["name", "channel_type", "visibility", "member_count", "message_count", "is_active"]
    list_filter = ["channel_type", "visibility", "is_active", "is_archived"]
    search_fields = ["name", "description"]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["sender", "channel", "message_type", "is_pinned", "is_deleted", "created_at"]
    list_filter = ["message_type", "is_pinned", "is_deleted"]
    search_fields = ["content", "sender__full_name"]


@admin.register(DirectConversation)
class DirectConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "is_group", "message_count", "last_message_at"]


@admin.register(ModerationAction)
class ModerationActionAdmin(admin.ModelAdmin):
    list_display = ["moderator", "action", "target_user", "channel", "created_at"]
    list_filter = ["action"]


@admin.register(MessageReport)
class MessageReportAdmin(admin.ModelAdmin):
    list_display = ["reporter", "reason", "status", "created_at"]
    list_filter = ["status", "reason"]
