from rest_framework import serializers
from .models import AuditLog, UserActivityLog, ExecutionLog


class AuditLogSerializer(serializers.ModelSerializer):
    admin_name  = serializers.CharField(source="admin.full_name",  read_only=True, default="")
    admin_email = serializers.CharField(source="admin.email",      read_only=True, default="")

    class Meta:
        model  = AuditLog
        fields = [
            "id", "admin", "admin_name", "admin_email",
            "action", "target_model", "target_id",
            "description", "ip_address", "metadata", "created_at",
        ]
        read_only_fields = fields


class UserActivityLogSerializer(serializers.ModelSerializer):
    """Full serializer for the admin activity log viewer."""

    class Meta:
        model  = UserActivityLog
        fields = [
            "id",
            "user", "username", "student_id", "role",
            "action", "endpoint", "method",
            "status", "status_code",
            "ip_address", "browser", "os", "device",
            "metadata", "created_at",
        ]
        read_only_fields = fields


class ExecutionLogSerializer(serializers.ModelSerializer):
    user_name  = serializers.CharField(source="user.full_name", read_only=True, default="")
    user_email = serializers.CharField(source="user.email",     read_only=True, default="")

    class Meta:
        model  = ExecutionLog
        fields = [
            "id", "user", "user_name", "user_email",
            "language", "status", "execution_time", "memory_used",
            "is_submission", "question_id", "ip_address", "created_at",
        ]
        read_only_fields = fields
