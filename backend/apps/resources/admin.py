from django.contrib import admin
from .models import Resource


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = [
        "title", "file_type", "branch", "academic_year", "semester",
        "subject", "uploaded_by", "download_count", "is_active", "created_at",
    ]
    list_filter = ["file_type", "academic_year", "semester", "branch", "is_active"]
    search_fields = ["title", "description", "subject", "tags"]
    readonly_fields = ["id", "view_count", "download_count", "created_at", "updated_at"]
    list_editable = ["is_active"]
    ordering = ["-created_at"]

    fieldsets = (
        ("Basic Info", {
            "fields": ("id", "title", "description", "subject", "tags"),
        }),
        ("Classification", {
            "fields": ("branch", "academic_year", "semester", "file_type"),
        }),
        ("File", {
            "fields": ("file", "file_name", "file_size", "file_mime_type",
                       "external_url", "preview_supported"),
        }),
        ("Stats", {
            "fields": ("view_count", "download_count", "is_active",
                       "uploaded_by", "created_at", "updated_at"),
        }),
    )
