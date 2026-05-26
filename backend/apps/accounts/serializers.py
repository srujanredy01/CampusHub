import re
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id", "full_name", "student_id", "email", "phone",
            "branch", "semester", "section", "batch", "role",
            "is_active", "is_locked", "email_verified", "phone_verified",
            "created_at", "updated_at", "last_login",
        ]
        read_only_fields = [
            "id", "email", "role", "is_locked",
            "created_at", "updated_at", "last_login",
        ]


class UserSignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            "full_name", "student_id", "email", "phone",
            "branch", "semester", "section", "batch",
            "password", "password_confirm",
        ]
        extra_kwargs = {
            "full_name": {"required": True},
            "student_id": {"required": True},
            "email": {"required": True},
            "branch": {"required": True},
        }

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Email already registered.")
        allowed_domains = ["@gmail.com", "@lpu.in", "@outlook.com"]
        if not any(value.lower().endswith(domain) for domain in allowed_domains):
            raise serializers.ValidationError("Only @gmail.com, @lpu.in, or @outlook.com email addresses are accepted.")
        return value.lower()

    def validate_student_id(self, value):
        if User.objects.filter(student_id=value).exists():
            raise serializers.ValidationError("Student ID already registered.")
        if not re.match(r"^\d+$", value):
            raise serializers.ValidationError("Student ID must contain numbers only.")
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
            pass
        return value

    def validate_phone(self, value):
        if value and not re.match(r"^\+?\d{10,15}$", value.replace(" ", "").replace("-", "")):
            raise serializers.ValidationError("Enter a valid phone number (10-15 digits).")
        return value.replace(" ", "").replace("-", "") if value else ""

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        validated_data["role"] = "student"
        return User.objects.create_user(**validated_data)


class FacultySignupSerializer(serializers.ModelSerializer):
    """Admin-initiated faculty account creation."""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ["full_name", "email", "phone", "branch", "password"]
        extra_kwargs = {
            "full_name": {"required": True},
            "email": {"required": True},
        }

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Email already registered.")
        return value.lower()

    def create(self, validated_data):
        validated_data["role"] = "faculty"
        validated_data["is_staff"] = True
        validated_data["email_verified"] = True
        return User.objects.create_user(**validated_data)


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """Super admin creates admin/moderator accounts."""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    role = serializers.ChoiceField(choices=["admin", "faculty", "moderator"])

    class Meta:
        model = User
        fields = ["full_name", "email", "phone", "role", "password"]
        extra_kwargs = {
            "full_name": {"required": True},
            "email": {"required": True},
        }

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Email already registered.")
        return value.lower()

    def create(self, validated_data):
        role = validated_data.get("role")
        validated_data["is_staff"] = role in ("admin", "super_admin")
        validated_data["email_verified"] = True
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
