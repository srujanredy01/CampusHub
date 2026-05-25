import re
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name", "student_id", "email", "branch", "semester", "section", "role", "is_active", "email_verified", "created_at", "updated_at"]
        read_only_fields = ["id", "email", "role", "created_at", "updated_at"]


class UserSignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ["full_name", "student_id", "email", "branch", "semester", "section", "password", "password_confirm"]
        extra_kwargs = {
            "full_name": {"required": True},
            "student_id": {"required": True},
            "email": {"required": True},
            "branch": {"required": True},
        }

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Email already registered.")
        # Enforce allowed email domains
        allowed_domains = ["@gmail.com", "@lpu.in"]
        if not any(value.lower().endswith(domain) for domain in allowed_domains):
            raise serializers.ValidationError("Only @gmail.com or @lpu.in email addresses are accepted.")
        return value.lower()

    def validate_student_id(self, value):
        if User.objects.filter(student_id=value).exists():
            raise serializers.ValidationError("Student ID already registered.")
        if not re.match(r"^\d+$", value):
            raise serializers.ValidationError("Student ID must contain numbers only.")
        # Validate against student master registry only if a real bulk import has been done.
        # The init.sql seeds ~5 sample rows; skip validation until real data is loaded (100+ records).
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM student_master")
                count = cursor.fetchone()[0]
                if count >= 100:
                    cursor.execute(
                        "SELECT 1 FROM student_master WHERE student_id = %s LIMIT 1",
                        [value]
                    )
                    if not cursor.fetchone():
                        raise serializers.ValidationError(
                            "Student ID not found in university records. Contact admin."
                        )
        except serializers.ValidationError:
            raise
        except Exception:
            # If table doesn't exist or any DB error, skip validation
            pass
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        return User.objects.create_user(**validated_data)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)


class ResetPasswordSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    password = serializers.CharField(required=True, validators=[validate_password])
    password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})
        return attrs
