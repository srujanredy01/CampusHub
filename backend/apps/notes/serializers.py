import logging
from rest_framework import serializers
from .models import Note, NoteVote, NoteBookmark, NoteRating

logger = logging.getLogger(__name__)

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
            "title":       {"required": True},
            "subject":     {"required": True},
            "branch":      {"required": False, "allow_blank": True},
            "semester":    {"required": False, "allow_null": True},
            "file":        {"required": True},
            "description": {"required": False, "allow_blank": True},
            "tags":        {"required": False, "allow_blank": True},
        }

    def validate(self, attrs):
        """Auto-fill branch and semester from the user's profile if not provided."""
        request = self.context.get("request")
        user = request.user if request else None

        # Auto-fill branch from user profile if missing
        if not attrs.get("branch") and user:
            attrs["branch"] = user.branch or ""
        if not attrs.get("branch"):
            raise serializers.ValidationError({"branch": "Branch is required."})

        # Auto-fill semester from user profile if missing
        if not attrs.get("semester") and user:
            attrs["semester"] = user.semester or 1
        if not attrs.get("semester"):
            raise serializers.ValidationError({"semester": "Semester is required."})

        return attrs

    def create(self, validated_data):
        f = validated_data.get("file")
        if f:
            try:
                from campushub.file_security import validate_upload
                f.seek(0)
                info = validate_upload(f, category="note")
                f.seek(0)  # Reset for Django storage
                validated_data["file_name"] = info["filename"]
                validated_data["file_size"] = info["size"]
                validated_data["file_type"] = info["file_type"]
            except ImportError:
                # file_security not available — use basic metadata
                validated_data["file_name"] = f.name
                validated_data["file_size"] = f.size
                ext = f.name.rsplit(".", 1)[-1].lower() if "." in f.name else "other"
                type_map = {
                    "pdf": "pdf", "docx": "docx", "doc": "docx",
                    "ppt": "ppt", "pptx": "ppt",
                    "xls": "other", "xlsx": "other",
                    "txt": "other",
                    "jpg": "image", "jpeg": "image", "png": "image",
                    "gif": "image", "webp": "image",
                }
                validated_data["file_type"] = type_map.get(ext, "other")
            except Exception:
                # Any other error — fallback to basic metadata
                validated_data["file_name"] = f.name
                validated_data["file_size"] = f.size
                ext = f.name.rsplit(".", 1)[-1].lower() if "." in f.name else "other"
                type_map = {
                    "pdf": "pdf", "docx": "docx", "doc": "docx",
                    "ppt": "ppt", "pptx": "ppt",
                    "xls": "other", "xlsx": "other",
                    "txt": "other",
                    "jpg": "image", "jpeg": "image", "png": "image",
                    "gif": "image", "webp": "image",
                }
                validated_data["file_type"] = type_map.get(ext, "other")
        return super().create(validated_data)

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters.")
        return value

    def validate_semester(self, value):
        if value is not None and (value < 1 or value > 8):
            raise serializers.ValidationError("Semester must be between 1 and 8.")
        return value

    def validate_tags(self, value):
        if not value:
            return ""
        tags = [t.strip() for t in value.split(",") if t.strip()]
        if len(tags) > 15:
            raise serializers.ValidationError("Maximum 15 tags allowed.")
        if any(len(t) > 30 for t in tags):
            raise serializers.ValidationError("Each tag must be 30 characters or fewer.")
        return ",".join(tags)

    def validate_file(self, value):
        """Validate file type and size using centralized security module."""
        if not value:
            raise serializers.ValidationError("File is required.")

        # Size check (quick fail before reading content)
        max_size = 20 * 1024 * 1024  # 20MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File too large ({value.size // (1024*1024)}MB). Maximum size is 20MB."
            )

        # Extension check
        filename = getattr(value, "name", "") or ""
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        allowed_extensions = {
            "pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx",
            "txt", "jpg", "jpeg", "png", "gif", "webp",
        }
        if ext and ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"File type '.{ext}' is not supported. "
                f"Allowed: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, JPG, PNG."
            )

        # Use centralized magic-byte + MIME validation if available
        try:
            from campushub.file_security import validate_upload
            value.seek(0)  # Ensure file pointer is at start
            validate_upload(value, category="note")
            value.seek(0)  # Reset for Django to save the file
        except ImportError:
            # file_security module not available — skip advanced validation
            logger.warning("file_security module not available, skipping magic-byte validation")
            value.seek(0)
        except serializers.ValidationError:
            raise
        except Exception as e:
            error_msg = str(e)
            # Handle DRF ValidationError raised inside validate_upload
            if hasattr(e, "detail"):
                detail = e.detail
                if isinstance(detail, list):
                    error_msg = detail[0] if detail else "File validation failed."
                elif isinstance(detail, str):
                    error_msg = detail
            # Make error messages user-friendly
            if "not allowed" in error_msg.lower() or "not supported" in error_msg.lower():
                raise serializers.ValidationError(
                    f"File type '.{ext}' is not supported. "
                    f"Allowed: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, JPG, PNG."
                )
            if "too large" in error_msg.lower():
                raise serializers.ValidationError(error_msg)
            # Log unexpected errors but don't expose internals
            logger.error("File validation error: %s", error_msg)
            raise serializers.ValidationError(
                "File validation failed. Please ensure the file is not corrupted and try again."
            )
        return value
