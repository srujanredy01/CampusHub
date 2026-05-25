from rest_framework import serializers
from .models import Notification, AdminAlert, ScheduledNotification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id", "notification_type", "title", "message",
            "priority", "is_read", "metadata", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class AdminAlertSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True, default="")
    user_email = serializers.CharField(source="user.email", read_only=True, default="")

    class Meta:
        model = AdminAlert
        fields = [
            "id", "alert_type", "category", "title", "message",
            "user", "user_name", "user_email",
            "is_read", "metadata", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ScheduledNotificationSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True, default="")
    approved_by_name = serializers.CharField(source="approved_by.full_name", read_only=True, default="")

    class Meta:
        model = ScheduledNotification
        fields = [
            "id", "notification_type", "priority", "title", "message",
            "target_type", "target_branch", "target_semester",
            "scheduled_for", "status", "metadata",
            "sent_count", "read_count",
            "created_by", "created_by_name",
            "approved_by", "approved_by_name",
            "approved_at", "sent_at", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "created_by", "created_by_name",
            "approved_by", "approved_by_name",
            "approved_at", "sent_at", "created_at", "updated_at",
            "sent_count", "read_count",
        ]

    def validate(self, attrs):
        scheduled_for = attrs.get("scheduled_for", getattr(self.instance, "scheduled_for", None))
        status = attrs.get("status", getattr(self.instance, "status", "draft"))
        if status in {"scheduled", "approved"} and scheduled_for is None:
            raise serializers.ValidationError(
                {"scheduled_for": "scheduled_for is required for scheduled notifications."}
            )
        return attrs


class AdminSendNotificationSerializer(serializers.Serializer):
    """Serializer for admin sending targeted notifications."""
    title = serializers.CharField(max_length=255)
    message = serializers.CharField()
    notification_type = serializers.ChoiceField(
        choices=Notification.NOTIFICATION_TYPES, default="system"
    )
    priority = serializers.ChoiceField(
        choices=Notification.PRIORITY_CHOICES, default="normal"
    )
    target_type = serializers.ChoiceField(
        choices=[("all", "All"), ("branch", "Branch"), ("semester", "Semester"), ("selected", "Selected")],
        default="all",
    )
    target_branch = serializers.CharField(required=False, allow_blank=True, default="")
    target_semester = serializers.IntegerField(required=False, allow_null=True, default=None)
    target_user_ids = serializers.ListField(
        child=serializers.UUIDField(), required=False, default=list
    )
