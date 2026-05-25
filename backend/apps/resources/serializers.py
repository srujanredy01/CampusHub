from rest_framework import serializers
from .models import Resource


class ResourceSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(
        source="uploaded_by.full_name", read_only=True, default=""
    )
    file_url = serializers.SerializerMethodField()
    tags_list = serializers.ReadOnlyField()
    academic_year_display = serializers.CharField(
        source="get_academic_year_display", read_only=True
    )

    class Meta:
        model = Resource
        fields = [
            "id", "title", "description", "subject", "branch",
            "academic_year", "academic_year_display", "semester",
            "file_type", "file", "file_url", "file_name", "file_size",
            "file_mime_type", "external_url", "preview_supported",
            "tags", "tags_list",
            "uploaded_by", "uploaded_by_name",
            "view_count", "download_count",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "uploaded_by", "uploaded_by_name",
            "view_count", "download_count", "created_at", "updated_at",
        ]

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.file.url) if request else obj.file.url
        return None


class ResourceUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = [
            "title", "description", "subject", "branch",
            "academic_year", "semester", "file_type",
            "file", "external_url", "preview_supported", "tags",
        ]
        extra_kwargs = {
            "title":         {"required": True},
            "subject":       {"required": True},
            "branch":        {"required": True},
            "academic_year": {"required": True},
            "semester":      {"required": True},
            "file_type":     {"required": True},
        }

    def validate(self, attrs):
        year = attrs.get("academic_year")
        sem  = attrs.get("semester")
        if year and sem:
            valid = Resource.YEAR_SEMESTER_MAP.get(year, [])
            if sem not in valid:
                raise serializers.ValidationError(
                    {"semester": f"Semester {sem} does not belong to Year {year}. "
                                 f"Valid semesters: {valid}"}
                )
        return attrs

    def create(self, validated_data):
        f = validated_data.get("file")
        if f:
            # Run centralized magic-byte + MIME validation
            try:
                from campushub.file_security import validate_upload
                info = validate_upload(f, category="resource")
                validated_data["file_name"] = info["filename"]
                validated_data["file_size"] = info["size"]
                validated_data["file_mime_type"] = info["mime_type"]
            except Exception:
                # Fallback to basic metadata if security module unavailable
                validated_data["file_name"] = f.name
                validated_data["file_size"] = f.size
                validated_data["file_mime_type"] = getattr(f, "content_type", "")
            # Auto-detect preview support for PDFs
            mime = validated_data.get("file_mime_type", "")
            if "pdf" in mime or validated_data.get("file_type") == "pdf":
                validated_data["preview_supported"] = True
        return super().create(validated_data)
