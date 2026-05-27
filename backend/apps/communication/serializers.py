"""Serializers for the Communication app."""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Channel, ChannelMembership, Message, MessageReaction,
    DirectConversation, ConversationParticipant, UserPresence,
    BlockedUser, ModerationAction, MessageReport,
)

User = get_user_model()


class UserMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name", "email", "role", "branch", "semester", "section"]


class ChannelSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True, default="")
    is_member = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Channel
        fields = [
            "id", "name", "slug", "description", "channel_type", "visibility",
            "icon", "color", "branch", "semester", "section", "subject_name",
            "is_read_only", "is_archived", "is_locked", "allow_threads",
            "allow_reactions", "allow_file_uploads", "max_members",
            "slow_mode_seconds", "profanity_filter", "member_count",
            "message_count", "last_message_at", "pinned_message_count",
            "is_active", "created_by", "created_by_name", "is_member",
            "my_role", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "member_count", "message_count", "last_message_at", "pinned_message_count"]

    def get_is_member(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.memberships.filter(user=request.user, is_banned=False).exists()

    def get_my_role(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        membership = obj.memberships.filter(user=request.user).first()
        return membership.role if membership else None


class ChannelCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Channel
        fields = [
            "name", "description", "channel_type", "visibility", "icon", "color",
            "branch", "semester", "section", "subject_name", "is_read_only",
            "allow_threads", "allow_reactions", "allow_file_uploads",
            "max_members", "slow_mode_seconds", "profanity_filter",
        ]

    def create(self, validated_data):
        from django.utils.text import slugify
        name = validated_data["name"]
        slug = slugify(name)
        n = 1
        base_slug = slug
        while Channel.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{n}"
            n += 1
        validated_data["slug"] = slug
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class ChannelMembershipSerializer(serializers.ModelSerializer):
    user_detail = UserMiniSerializer(source="user", read_only=True)

    class Meta:
        model = ChannelMembership
        fields = [
            "id", "channel", "user", "user_detail", "role", "is_muted",
            "muted_until", "is_banned", "banned_reason",
            "notification_preference", "last_read_at", "unread_count", "joined_at",
        ]
        read_only_fields = ["id", "joined_at"]


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    sender_role = serializers.CharField(source="sender.role", read_only=True)
    reactions_summary = serializers.SerializerMethodField()
    reply_to_preview = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id", "channel", "conversation", "sender", "sender_name", "sender_role",
            "content", "message_type", "code_language", "attachment",
            "attachment_name", "attachment_size", "attachment_mime",
            "thread_parent", "reply_to", "reply_to_preview",
            "thread_reply_count", "mentions", "is_pinned", "is_edited",
            "is_deleted", "edited_at", "delivered_count", "read_count",
            "reaction_count", "reactions_summary", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "sender", "is_edited", "is_deleted", "edited_at",
            "delivered_count", "read_count", "reaction_count", "thread_reply_count",
        ]

    def get_reactions_summary(self, obj):
        reactions = obj.reactions.values("emoji").annotate(
            count=serializers.IntegerField()
        ) if hasattr(obj, "_prefetched_objects_cache") else []
        # Simplified: return top reactions
        from django.db.models import Count
        return list(
            obj.reactions.values("emoji").annotate(count=Count("id")).order_by("-count")[:10]
        )

    def get_reply_to_preview(self, obj):
        if not obj.reply_to:
            return None
        return {
            "id": str(obj.reply_to.id),
            "sender_name": obj.reply_to.sender.full_name,
            "content": obj.reply_to.content[:100],
        }


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = [
            "content", "message_type", "code_language", "attachment",
            "thread_parent", "reply_to", "mentions", "channel", "conversation",
        ]

    def validate(self, data):
        if not data.get("channel") and not data.get("conversation"):
            raise serializers.ValidationError("Either channel or conversation is required.")
        return data


class DirectConversationSerializer(serializers.ModelSerializer):
    participants_detail = serializers.SerializerMethodField()
    other_user = serializers.SerializerMethodField()

    class Meta:
        model = DirectConversation
        fields = [
            "id", "is_group", "name", "last_message_at", "last_message_preview",
            "message_count", "is_active", "participants_detail", "other_user",
            "created_at", "updated_at",
        ]

    def get_participants_detail(self, obj):
        return UserMiniSerializer(
            [p.user for p in obj.participants.select_related("user").all()],
            many=True,
        ).data

    def get_other_user(self, obj):
        request = self.context.get("request")
        if not request or obj.is_group:
            return None
        other = obj.participants.exclude(user=request.user).select_related("user").first()
        if other:
            return UserMiniSerializer(other.user).data
        return None


class UserPresenceSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = UserPresence
        fields = ["id", "user", "user_name", "status", "custom_status", "last_seen"]


class ModerationActionSerializer(serializers.ModelSerializer):
    moderator_name = serializers.CharField(source="moderator.full_name", read_only=True, default="")
    target_user_name = serializers.CharField(source="target_user.full_name", read_only=True, default="")

    class Meta:
        model = ModerationAction
        fields = [
            "id", "moderator", "moderator_name", "channel", "target_user",
            "target_user_name", "target_message", "action", "reason",
            "duration_minutes", "metadata", "created_at",
        ]
        read_only_fields = ["id", "moderator", "created_at"]


class MessageReportSerializer(serializers.ModelSerializer):
    reporter_name = serializers.CharField(source="reporter.full_name", read_only=True)

    class Meta:
        model = MessageReport
        fields = [
            "id", "reporter", "reporter_name", "message", "channel",
            "reason", "description", "status", "reviewed_by",
            "reviewed_at", "resolution_note", "created_at",
        ]
        read_only_fields = ["id", "reporter", "status", "reviewed_by", "reviewed_at"]


class BlockedUserSerializer(serializers.ModelSerializer):
    blocked_name = serializers.CharField(source="blocked.full_name", read_only=True)

    class Meta:
        model = BlockedUser
        fields = ["id", "blocker", "blocked", "blocked_name", "reason", "created_at"]
        read_only_fields = ["id", "blocker"]
