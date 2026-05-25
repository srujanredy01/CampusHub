from django.utils import timezone
from rest_framework import serializers
from .models import Company, PlacementApplication, InterviewRound


ACTIVE_APPLICATION_STATUSES = {"applied", "shortlisted", "interview"}


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "name", "website", "logo_url", "industry", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Company name must be at least 2 characters.")
        return value


class InterviewRoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewRound
        fields = ["id", "round_number", "round_type", "round_date", "result", "feedback", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_round_number(self, value):
        if value < 1 or value > 20:
            raise serializers.ValidationError("Round number must be between 1 and 20.")
        return value


class PlacementApplicationSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    rounds = InterviewRoundSerializer(many=True, read_only=True)
    days_left = serializers.SerializerMethodField()

    class Meta:
        model = PlacementApplication
        fields = [
            "id", "company", "company_name", "role", "status",
            "package_lpa", "applied_date", "deadline", "days_left",
            "reminder_enabled", "offer_received_at", "rejection_reason", "notes",
            "rounds", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "days_left"]

    def get_days_left(self, obj):
        if not obj.deadline:
            return None
        return (obj.deadline - timezone.now().date()).days


class PlacementApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlacementApplication
        fields = [
            "company", "role", "status", "package_lpa", "applied_date", "deadline",
            "reminder_enabled", "offer_received_at", "rejection_reason", "notes",
        ]

    def validate(self, attrs):
        status = attrs.get("status", getattr(self.instance, "status", "applied"))
        offer_date = attrs.get("offer_received_at", getattr(self.instance, "offer_received_at", None))
        rejection_reason = attrs.get("rejection_reason", getattr(self.instance, "rejection_reason", ""))
        applied_date = attrs.get("applied_date", getattr(self.instance, "applied_date", None))
        deadline = attrs.get("deadline", getattr(self.instance, "deadline", None))
        package_lpa = attrs.get("package_lpa", getattr(self.instance, "package_lpa", None))

        if deadline and applied_date and deadline < applied_date:
            raise serializers.ValidationError("Deadline cannot be earlier than applied date.")
        if package_lpa is not None and package_lpa < 0:
            raise serializers.ValidationError("Package must be non-negative.")
        if status in {"offer", "accepted"} and not offer_date:
            attrs["offer_received_at"] = timezone.now().date()
        if status == "rejected" and not rejection_reason:
            raise serializers.ValidationError("Rejection reason is required when status is rejected.")
        return attrs
