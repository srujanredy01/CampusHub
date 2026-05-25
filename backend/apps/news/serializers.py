from rest_framework import serializers
from .models import NewsAnnouncement, SavedNews


class NewsListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for news list cards."""
    created_by_name  = serializers.CharField(source="created_by.full_name", read_only=True, default="Admin")
    featured_image_url = serializers.SerializerMethodField()
    tags_list        = serializers.ReadOnlyField()
    is_saved         = serializers.SerializerMethodField()
    save_type        = serializers.SerializerMethodField()

    class Meta:
        model = NewsAnnouncement
        fields = [
            "id", "title", "slug", "short_description", "category",
            "priority", "is_pinned", "featured_image_url",
            "tags_list", "created_by_name",
            "view_count", "read_count",
            "is_saved", "save_type",
            "created_at",
        ]

    def get_featured_image_url(self, obj):
        if obj.featured_image:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.featured_image.url) if request else obj.featured_image.url
        return None

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        # Use prefetched data if available to avoid N+1
        if hasattr(obj, "_prefetched_saved_by_user"):
            return obj._prefetched_saved_by_user
        return SavedNews.objects.filter(student=request.user, article=obj).exists()

    def get_save_type(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        if hasattr(obj, "_prefetched_save_type"):
            return obj._prefetched_save_type
        saved = SavedNews.objects.filter(student=request.user, article=obj).first()
        return saved.save_type if saved else None


class NewsAnnouncementSerializer(serializers.ModelSerializer):
    """Full detail serializer."""
    created_by_name    = serializers.CharField(source="created_by.full_name", read_only=True, default="Admin")
    featured_image_url = serializers.SerializerMethodField()
    attachment_url     = serializers.SerializerMethodField()
    tags_list          = serializers.ReadOnlyField()
    is_saved           = serializers.SerializerMethodField()
    save_type          = serializers.SerializerMethodField()

    class Meta:
        model = NewsAnnouncement
        fields = [
            "id", "title", "slug", "short_description", "content",
            "category", "priority", "is_pinned",
            "featured_image", "featured_image_url",
            "attachment", "attachment_url", "attachment_name",
            "external_link", "target_branch", "target_semester",
            "tags", "tags_list",
            "created_by", "created_by_name",
            "is_active", "view_count", "read_count",
            "is_saved", "save_type",
            "publish_at", "expires_at",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "slug", "created_by", "created_by_name",
            "view_count", "read_count", "created_at", "updated_at",
        ]

    def get_featured_image_url(self, obj):
        if obj.featured_image:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.featured_image.url) if request else obj.featured_image.url
        return None

    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.attachment.url) if request else obj.attachment.url
        return None

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        if hasattr(obj, "_prefetched_saved_by_user"):
            return obj._prefetched_saved_by_user
        return SavedNews.objects.filter(student=request.user, article=obj).exists()

    def get_save_type(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        if hasattr(obj, "_prefetched_save_type"):
            return obj._prefetched_save_type
        saved = SavedNews.objects.filter(student=request.user, article=obj).first()
        return saved.save_type if saved else None


class NewsCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = NewsAnnouncement
        fields = [
            "title", "short_description", "content", "category", "priority",
            "featured_image", "attachment", "external_link",
            "target_branch", "target_semester",
            "tags", "is_active", "is_pinned",
            "publish_at", "expires_at",
        ]
        extra_kwargs = {
            "title":   {"required": True},
            "content": {"required": True},
        }

    def create(self, validated_data):
        attachment = validated_data.get("attachment")
        if attachment:
            validated_data["attachment_name"] = attachment.name
        return super().create(validated_data)


class SavedNewsSerializer(serializers.ModelSerializer):
    article = NewsListSerializer(read_only=True)

    class Meta:
        model = SavedNews
        fields = ["id", "article", "save_type", "saved_at"]
