from rest_framework import serializers
from .models import StudentProfile, ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = ["id", "activity_type", "description", "metadata", "created_at"]


class StudentProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    student_id = serializers.CharField(source="user.student_id", read_only=True)
    branch = serializers.CharField(source="user.branch", read_only=True)
    semester = serializers.IntegerField(source="user.semester", read_only=True)
    section = serializers.CharField(source="user.section", read_only=True)
    role = serializers.CharField(source="user.role", read_only=True)
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = ["id", "full_name", "email", "student_id", "branch", "semester", "section", "role", "profile_image", "profile_image_url", "bio", "github_url", "linkedin_url", "total_questions_solved", "easy_solved", "medium_solved", "hard_solved", "total_submissions", "created_at", "updated_at"]
        read_only_fields = ["id", "full_name", "email", "student_id", "branch", "semester", "section", "role", "total_questions_solved", "easy_solved", "medium_solved", "hard_solved", "total_submissions", "created_at", "updated_at"]

    def get_profile_image_url(self, obj):
        if obj.profile_image:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.profile_image.url) if request else obj.profile_image.url
        return None


class ProfileUpdateSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(required=False, max_length=255)
    branch = serializers.CharField(required=False, max_length=100, allow_blank=True)
    semester = serializers.IntegerField(required=False, min_value=1, max_value=8)
    section = serializers.CharField(required=False, max_length=10, allow_blank=True)

    class Meta:
        model = StudentProfile
        fields = ["full_name", "branch", "semester", "section", "profile_image", "bio", "github_url", "linkedin_url"]

    def update(self, instance, validated_data):
        user = instance.user
        for f in ["full_name", "branch", "semester", "section"]:
            if f in validated_data:
                setattr(user, f, validated_data.pop(f))
        user.save()
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance
