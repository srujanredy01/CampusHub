from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import UserSettings, UserSession

User = get_user_model()


class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = [
            "theme",
            "coding_alerts",
            "contest_reminders",
            "assignment_reminders",
            "placement_updates",
            "news_updates",
            "email_notifications",
            "push_notifications",
            "profile_visibility",
            "show_coding_profile",
            "show_achievements",
            "leaderboard_visibility",
            "language",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class UserSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSession
        fields = ["id", "device", "ip_address", "location", "last_active", "created_at", "is_active"]


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})
        if attrs["old_password"] == attrs["new_password"]:
            raise serializers.ValidationError({"new_password": "New password must be different from current password."})
        return attrs


class AccountUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["full_name", "phone", "branch", "section"]

    def validate_phone(self, value):
        if value and len(value) < 10:
            raise serializers.ValidationError("Phone number must be at least 10 digits.")
        return value


class DeactivateAccountSerializer(serializers.Serializer):
    password = serializers.CharField(required=True)
    confirmation = serializers.CharField(required=True)

    def validate_confirmation(self, value):
        if value.lower() != "deactivate":
            raise serializers.ValidationError("Please type 'deactivate' to confirm.")
        return value


class DeleteAccountSerializer(serializers.Serializer):
    password = serializers.CharField(required=True)
    confirmation = serializers.CharField(required=True)

    def validate_confirmation(self, value):
        if value.lower() != "delete my account":
            raise serializers.ValidationError("Please type 'delete my account' to confirm.")
        return value
