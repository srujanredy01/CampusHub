from rest_framework import serializers
from .models import StudentXP, XPTransaction, Badge, StudentBadge


class StudentXPSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_id = serializers.CharField(source="student.student_id", read_only=True)
    branch = serializers.CharField(source="student.branch", read_only=True)

    class Meta:
        model = StudentXP
        fields = [
            "id", "student", "student_name", "student_id", "branch",
            "total_xp", "level", "rank", "streak_days", "longest_streak",
            "last_activity_date", "updated_at",
        ]


class XPTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = XPTransaction
        fields = ["id", "source", "points", "description", "metadata", "created_at"]


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ["id", "name", "slug", "description", "icon", "color", "xp_reward", "criteria"]


class StudentBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = StudentBadge
        fields = ["id", "badge", "earned_at"]
