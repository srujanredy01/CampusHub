from django.utils import timezone
from rest_framework import serializers
from .models import PlacementApplication, InterviewExperience, CompanyNote


class InterviewExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewExperience
        fields = [
            "id", "round_type", "round_number", "interview_date",
            "result", "questions_asked", "experience_notes",
            "difficulty", "duration_minutes", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class PlacementApplicationSerializer(serializers.ModelSerializer):
    interviews = InterviewExperienceSerializer(many=True, read_only=True)
    days_left = serializers.SerializerMethodField()

    class Meta:
        model = PlacementApplication
        fields = [
            "id", "company_name", "role", "package_lpa", "status",
            "application_date", "deadline", "days_left", "job_link",
            "location", "job_type", "notes", "offer_received_at",
            "rejection_reason", "interviews", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_days_left(self, obj):
        if not obj.deadline:
            return None
        return (obj.deadline - timezone.now().date()).days


class PlacementApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlacementApplication
        fields = [
            "company_name", "role", "package_lpa", "status",
            "application_date", "deadline", "job_link", "location",
            "job_type", "notes", "offer_received_at", "rejection_reason",
        ]

    def validate_company_name(self, value):
        if len(value.strip()) < 2:
            raise serializers.ValidationError("Company name must be at least 2 characters.")
        return value.strip()

    def validate_package_lpa(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Package must be non-negative.")
        return value

    def validate(self, attrs):
        deadline = attrs.get("deadline")
        application_date = attrs.get("application_date")
        if deadline and application_date and deadline < application_date:
            raise serializers.ValidationError("Deadline cannot be earlier than application date.")
        status_val = attrs.get("status", "wishlist")
        if status_val == "offer_received" and not attrs.get("offer_received_at"):
            attrs["offer_received_at"] = timezone.now().date()
        return attrs


class CompanyNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyNote
        fields = [
            "id", "company_name", "notes", "salary_info",
            "interview_tips", "saved_questions", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PlacementReadinessSerializer(serializers.Serializer):
    """Calculates placement readiness score."""
    resume_completion = serializers.IntegerField()
    coding_solved = serializers.IntegerField()
    roadmap_progress = serializers.IntegerField()
    profile_completion = serializers.IntegerField()
    contests_participated = serializers.IntegerField()
    assignments_completed = serializers.IntegerField()
    overall_score = serializers.IntegerField()
