from rest_framework import serializers
from .models import LostFoundItem


class LostFoundItemSerializer(serializers.ModelSerializer):
    posted_by_name = serializers.CharField(source="posted_by.full_name", read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = LostFoundItem
        fields = [
            "id", "posted_by", "posted_by_name", "item_name", "category",
            "description", "status", "date_lost_found", "location",
            "image", "image_url", "contact_name", "contact_phone", "contact_email",
            "is_flagged", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "posted_by", "posted_by_name", "is_flagged", "created_at", "updated_at"]

    def get_image_url(self, obj):
        if obj.image:
            request = self.context.get("request")
            return request.build_absolute_uri(obj.image.url) if request else obj.image.url
        return None


class LostFoundCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LostFoundItem
        fields = [
            "item_name", "category", "description", "status",
            "date_lost_found", "location", "image",
            "contact_name", "contact_phone", "contact_email",
        ]
