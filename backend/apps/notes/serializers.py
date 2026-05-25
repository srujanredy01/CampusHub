from rest_framework import serializers
from .models import Note, NoteVote, NoteBookmark, NoteRating

ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "ppt", "pptx", "jpg", "jpeg", "png"}
ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/jpeg",
    "image/png",
}
MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024


class NoteSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source="uploaded_by.full_name", read_only=True, default="")
    file_url         = serializers.SerializerMethodField()
    tags_list        = serializers.ReadOnlyField()
    user_vote        = serializers.SerializerMethodField()
    is_bookmarked    = serializers.SerializerMethodField()
    user_rating      = serializers.SerializerMethodField()
    trending_score   = serializers.ReadOnlyField()

    class Meta:
        model  = Note
        fields = [
            "id", "title", "description", "subject", "branch", "semester",
            "tags", "tags_list", "file_url", "file_name", "file_size", "file_type",
            "uploaded_by", "uploaded_by_name", "status",
            "download_count", "view_count", "upvotes", "downvotes",
            "average_rating", "rating_count", "user_vote", "is_bookmarked", "user_rating",
            "trending_score", "is_active", "created_at", "moderated_at", "rejection_reason",
        ]
        read_only_fields = [
            "id", "uploaded_by", "uploaded_by_name", "status",
            "download_count", "view_count", "upvotes", "downvotes",
            "average_rating", "rating_count", "user_vote", "is_bookmarked", "user_rating",
            "trending_score", "created_at", "moderated_at", "rejection_reason",
        ]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_user_vote(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        vote = NoteVote.objects.filter(note=obj, user=request.user).first()
        return vote.vote if vote else None

    def get_is_bookmarked(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return NoteBookmark.objects.filter(note=obj, user=request.user).exists()

    def get_user_rating(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        rating = NoteRating.objects.filter(note=obj, user=request.user).first()
        return rating.rating if rating else None


class NoteUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Note
        fields = ["title", "description", "subject", "branch", "semester", "tags", "file"]
        extra_kwargs = {
            "title":    {"required": True},
            "subject":  {"required": True},
            "branch":   {"required": True},
            "semester": {"required": True},
            "file":     {"required": True},
        }

    def create(self, validated_data):
        f = validated_data.get("file")
        if f:
            # validate_file already ran validate_upload, use its results
            try:
                from campushub.file_security import validate_upload
                info = validate_upload(f, category="note")
                validated_data["file_name"] = info["filename"]
                validated_data["file_size"] = info["size"]
                validated_data["file_type"] = info["file_type"]
            except Exception:
                # Fallback to basic metadata
                validated_data["file_name"] = f.name
                validated_data["file_size"] = f.size
                ext = f.name.rsplit(".", 1)[-1].lower() if "." in f.name else "other"
                type_map = {"pdf": "pdf", "docx": "docx", "doc": "docx",
                            "ppt": "ppt", "pptx": "ppt",
                            "jpg": "image", "jpeg": "image", "png": "image"}
                validated_data["file_type"] = type_map.get(ext, "other")
        return super().create(validated_data)

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters.")
        return value

    def validate_semester(self, value):
        if value < 1 or value > 8:
            raise serializers.ValidationError("Semester must be between 1 and 8.")
        return value

    def validate_tags(self, value):
        tags = [t.strip() for t in (value or "").split(",") if t.strip()]
        if len(tags) > 15:
            raise serializers.ValidationError("Maximum 15 tags allowed.")
        if any(len(t) > 30 for t in tags):
            raise serializers.ValidationError("Each tag must be 30 characters or fewer.")
        return ",".join(tags)

    def validate_file(self, value):
        # Use centralized magic-byte + MIME validation
        try:
            from campushub.file_security import validate_upload
            validate_upload(value, category="note")
        except Exception as e:
            raise serializers.ValidationError(str(e))
        return value
