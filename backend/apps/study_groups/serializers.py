import secrets
from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from .models import (
    StudyGroup, GroupMembership, GroupPost, GroupInvitation, GroupMeeting,
    ChatMessage, GroupTask, SharedResource, GroupPoll, PollOption, PollVote, StudyTimer,
)


class GroupMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    student_id = serializers.CharField(source="user.student_id", read_only=True)
    is_online = serializers.SerializerMethodField()

    class Meta:
        model = GroupMembership
        fields = ["id", "user", "user_name", "student_id", "role", "is_online", "last_seen", "joined_at"]
        read_only_fields = ["id", "joined_at", "last_seen"]

    def get_is_online(self, obj):
        if not obj.last_seen:
            return False
        return (timezone.now() - obj.last_seen).total_seconds() < 300


class StudyGroupSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    member_count = serializers.ReadOnlyField()
    is_member = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    online_members = serializers.SerializerMethodField()
    next_session = serializers.SerializerMethodField()

    class Meta:
        model = StudyGroup
        fields = [
            "id", "name", "description", "subject", "branch", "semester",
            "visibility", "invite_code", "max_members", "tags", "websocket_room",
            "created_by", "created_by_name", "member_count", "is_member", "user_role",
            "online_members", "next_session",
            "is_active", "last_activity_at", "created_at",
        ]
        read_only_fields = ["id", "created_by", "invite_code", "websocket_room", "created_at", "last_activity_at"]

    def get_is_member(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and GroupMembership.objects.filter(group=obj, user=request.user, is_active=True).exists())

    def get_user_role(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        membership = GroupMembership.objects.filter(group=obj, user=request.user, is_active=True).first()
        return membership.role if membership else None

    def get_online_members(self, obj):
        threshold = timezone.now() - timedelta(minutes=5)
        return obj.memberships.filter(is_active=True, last_seen__gte=threshold).count()

    def get_next_session(self, obj):
        meeting = obj.meetings.filter(status="scheduled", starts_at__gte=timezone.now()).first()
        if meeting:
            return {"id": str(meeting.id), "title": meeting.title, "starts_at": meeting.starts_at.isoformat()}
        return None


class StudyGroupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyGroup
        fields = ["name", "description", "subject", "branch", "semester", "visibility", "max_members", "tags"]

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Group name must be at least 3 characters.")
        return value

    def validate_semester(self, value):
        if value is None:
            return value
        if value < 1 or value > 8:
            raise serializers.ValidationError("Semester must be between 1 and 8.")
        return value

    def validate_max_members(self, value):
        if value < 2 or value > 500:
            raise serializers.ValidationError("Max members must be between 2 and 500.")
        return value


class GroupPostSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = GroupPost
        fields = [
            "id", "group", "author", "author_name", "post_type", "title",
            "content", "attachment", "attachment_url", "is_pinned", "created_at",
        ]
        read_only_fields = ["id", "author", "created_at", "is_pinned"]

    def get_attachment_url(self, obj):
        if not obj.attachment:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.attachment.url) if request else obj.attachment.url

    def validate(self, attrs):
        content = attrs.get("content", "").strip()
        attachment = attrs.get("attachment")
        if not content and not attachment:
            raise serializers.ValidationError("Content or attachment is required.")
        if attachment and attachment.size > 20 * 1024 * 1024:
            raise serializers.ValidationError("Attachment size must not exceed 20 MB.")
        return attrs


class GroupInvitationSerializer(serializers.ModelSerializer):
    invited_by_name = serializers.CharField(source="invited_by.full_name", read_only=True)
    invited_user_name = serializers.CharField(source="invited_user.full_name", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True)

    class Meta:
        model = GroupInvitation
        fields = [
            "id", "group", "group_name", "invited_by", "invited_by_name",
            "invited_user", "invited_user_name",
            "token", "status", "expires_at", "created_at",
        ]
        read_only_fields = ["id", "invited_by", "token", "status", "expires_at", "created_at"]

    def create(self, validated_data):
        validated_data["token"] = secrets.token_urlsafe(32)
        validated_data["expires_at"] = timezone.now() + timedelta(days=3)
        return super().create(validated_data)


class GroupMeetingSerializer(serializers.ModelSerializer):
    scheduled_by_name = serializers.CharField(source="scheduled_by.full_name", read_only=True)

    class Meta:
        model = GroupMeeting
        fields = [
            "id", "group", "title", "description", "topic", "scheduled_by", "scheduled_by_name",
            "starts_at", "ends_at", "meeting_link", "location", "status", "created_at",
        ]
        read_only_fields = ["id", "scheduled_by", "created_at"]

    def validate(self, attrs):
        starts_at = attrs.get("starts_at")
        ends_at = attrs.get("ends_at")
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError("Meeting end time must be after start time.")
        return attrs


# ═══════════════════════════════════════════════════════════════════════════════
# NEW SERIALIZERS
# ═══════════════════════════════════════════════════════════════════════════════


class ChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    attachment_url = serializers.SerializerMethodField()
    read_by_count = serializers.SerializerMethodField()

    class Meta:
        model = ChatMessage
        fields = [
            "id", "group", "sender", "sender_name", "content", "message_type",
            "attachment", "attachment_url", "reply_to", "is_pinned", "is_deleted",
            "edited_at", "created_at", "read_by_count",
        ]
        read_only_fields = ["id", "sender", "created_at", "edited_at", "is_deleted"]

    def get_attachment_url(self, obj):
        if not obj.attachment:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.attachment.url) if request else obj.attachment.url

    def get_read_by_count(self, obj):
        return obj.read_receipts.count()


class GroupTaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source="assigned_to.full_name", read_only=True, default=None)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = GroupTask
        fields = [
            "id", "group", "title", "description", "status", "priority",
            "assigned_to", "assigned_to_name", "created_by", "created_by_name",
            "deadline", "position", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_by", "created_at", "updated_at"]


class SharedResourceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.full_name", read_only=True)
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = SharedResource
        fields = [
            "id", "group", "title", "description", "resource_type",
            "file", "file_url", "url", "file_size", "uploaded_by", "uploaded_by_name",
            "download_count", "created_at",
        ]
        read_only_fields = ["id", "uploaded_by", "file_size", "download_count", "created_at"]

    def get_file_url(self, obj):
        if not obj.file:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url


class PollOptionSerializer(serializers.ModelSerializer):
    vote_count = serializers.ReadOnlyField()
    voted_by_me = serializers.SerializerMethodField()

    class Meta:
        model = PollOption
        fields = ["id", "text", "vote_count", "voted_by_me"]
        read_only_fields = ["id"]

    def get_voted_by_me(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.votes.filter(user=request.user).exists()


class GroupPollSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    options = PollOptionSerializer(many=True, read_only=True)
    total_votes = serializers.ReadOnlyField()

    class Meta:
        model = GroupPoll
        fields = [
            "id", "group", "question", "created_by", "created_by_name",
            "is_active", "allow_multiple", "expires_at", "options", "total_votes", "created_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]


class StudyTimerSerializer(serializers.ModelSerializer):
    started_by_name = serializers.CharField(source="started_by.full_name", read_only=True)

    class Meta:
        model = StudyTimer
        fields = [
            "id", "group", "started_by", "started_by_name", "mode",
            "duration_minutes", "break_minutes", "status",
            "started_at", "ends_at", "created_at",
        ]
        read_only_fields = ["id", "started_by", "created_at"]
