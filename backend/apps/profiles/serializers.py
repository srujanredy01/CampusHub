from rest_framework import serializers
from .models import StudentProfile, ActivityLog


class StudentProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    student_id = serializers.CharField(source="user.student_id", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    phone = serializers.CharField(source="user.phone", read_only=True)
    branch = serializers.CharField(source="user.branch", read_only=True)
    semester = serializers.IntegerField(source="user.semester", read_only=True)
    section = serializers.CharField(source="user.section", read_only=True)
    batch = serializers.CharField(source="user.batch", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)
    profile_completion = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = [
            "id", "full_name", "student_id", "email", "phone",
            "branch", "semester", "section", "batch", "role",
            "profile_image", "bio",
            "github_url", "linkedin_url", "leetcode_url",
            "codechef_url", "hackerrank_url", "portfolio_url",
            "cgpa", "advisor",
            "total_questions_solved", "easy_solved", "medium_solved",
            "hard_solved", "total_submissions", "coding_rank", "contest_rank",
            "certificates", "achievements",
            "email_notifications", "push_notifications",
            "assignment_reminders", "contest_reminders",
            "profile_public", "show_coding_stats", "show_placement_status",
            "profile_completion", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "total_questions_solved", "easy_solved", "medium_solved",
            "hard_solved", "total_submissions", "coding_rank", "contest_rank",
            "created_at", "updated_at",
        ]

    def get_profile_completion(self, obj):
        return obj.profile_completion_percentage


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Handles profile updates including user fields."""
    full_name = serializers.CharField(required=False)
    phone = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = StudentProfile
        fields = [
            "profile_image", "bio",
            "github_url", "linkedin_url", "leetcode_url",
            "codechef_url", "hackerrank_url", "portfolio_url",
            "cgpa", "advisor", "certificates", "achievements",
            "email_notifications", "push_notifications",
            "assignment_reminders", "contest_reminders",
            "profile_public", "show_coding_stats", "show_placement_status",
            "full_name", "phone",
        ]

    def update(self, instance, validated_data):
        # Extract user-level fields
        full_name = validated_data.pop("full_name", None)
        phone = validated_data.pop("phone", None)

        if full_name is not None:
            instance.user.full_name = full_name
            instance.user.save(update_fields=["full_name"])
        if phone is not None:
            instance.user.phone = phone
            instance.user.save(update_fields=["phone"])

        return super().update(instance, validated_data)


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = ["id", "activity_type", "description", "metadata", "created_at"]
        read_only_fields = ["id", "created_at"]
