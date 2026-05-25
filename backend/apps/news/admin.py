from django.contrib import admin
from .models import NewsAnnouncement, SavedNews


@admin.register(NewsAnnouncement)
class NewsAnnouncementAdmin(admin.ModelAdmin):
    list_display  = ["title", "category", "priority", "is_pinned", "is_active",
                     "read_count", "view_count", "created_by", "created_at"]
    list_filter   = ["category", "priority", "is_pinned", "is_active"]
    search_fields = ["title", "short_description", "content", "tags"]
    readonly_fields = ["id", "slug", "view_count", "read_count", "created_at", "updated_at"]
    prepopulated_fields = {}
    ordering = ["-created_at"]

    fieldsets = (
        ("Content", {
            "fields": ("id", "title", "slug", "short_description", "content",
                       "featured_image", "tags"),
        }),
        ("Classification", {
            "fields": ("category", "priority", "is_pinned", "is_active"),
        }),
        ("Targeting", {
            "fields": ("target_branch", "target_semester"),
        }),
        ("Links", {
            "fields": ("attachment", "attachment_name", "external_link"),
        }),
        ("Scheduling", {
            "fields": ("publish_at", "expires_at"),
        }),
        ("Stats", {
            "fields": ("view_count", "read_count", "created_by", "created_at", "updated_at"),
        }),
    )


@admin.register(SavedNews)
class SavedNewsAdmin(admin.ModelAdmin):
    list_display  = ["student", "article", "save_type", "saved_at"]
    list_filter   = ["save_type"]
    search_fields = ["student__full_name", "article__title"]
    readonly_fields = ["id", "saved_at"]
