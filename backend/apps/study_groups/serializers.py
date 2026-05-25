import secrets
from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from .models import StudyGroup, GroupMembership, GroupPost, GroupInvitation, GroupMeeting


class GroupMemberSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    student_id = serializers.CharField(source="user.student_id", read_only=True)

    class Meta:
        model = GroupMembership
        fields = ["id", "user", "user_name", "student_id", "role", "joined_at"]
        read_only_fields = ["id", "joined_at"]


class StudyGroupSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    member_count = serializers.ReadOnlyField()
    is_member = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()

    class Meta:
        model = StudyGroup
        fields = [
            "id", "name", "description", "subject", "branch", "semester",
            "visibility", "invite_code", "max_members", "websocket_room",
            "created_by", "created_by_name", "member_count", "is_member", "user_role",
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


class StudyGroupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyGroup
        fields = ["name", "description", "subject", "branch", "semester", "visibility", "max_members"]

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

    class Meta:
        model = GroupInvitation
        fields = [
            "id", "group", "invited_by", "invited_by_name", "invited_user", "invited_user_name",
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
            "id", "group", "title", "description", "scheduled_by", "scheduled_by_name",
            "starts_at", "ends_at", "meeting_link", "location", "status", "created_at",
        ]
        read_only_fields = ["id", "scheduled_by", "created_at"]

    def validate(self, attrs):
        starts_at = attrs.get("starts_at")
        ends_at = attrs.get("ends_at")
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError("Meeting end time must be after start time.")
        return attrs
