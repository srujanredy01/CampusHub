from rest_framework import serializers
from .models import ResumeProfile, ResumeTemplate


class ResumeTemplateSerializer(serializers.ModelSerializer):
    preview_image_url = serializers.SerializerMethodField()

    class Meta:
        model = ResumeTemplate
        fields = ["id", "name", "slug", "description", "preview_image_url", "is_default"]

    def get_preview_image_url(self, obj):
        if obj.preview_image:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.preview_image.url) if request else obj.preview_image.url
        return None


class ResumeProfileSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source="template.name", read_only=True, default="")

    class Meta:
        model = ResumeProfile
        fields = [
            "id", "title", "template", "template_name", "full_name", "email", "phone",
            "branch", "graduation_year", "summary", "address",
            "linkedin_url", "github_url", "portfolio_url",
            "skills", "certifications", "projects", "internships",
            "education", "achievements", "coding_profiles",
            "is_primary", "completion_score", "last_exported_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "completion_score", "last_exported_at", "created_at", "updated_at"]


class ResumeProfileCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResumeProfile
        exclude = ["student", "completion_score", "last_exported_at"]
