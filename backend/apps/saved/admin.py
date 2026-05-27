from django.contrib import admin
from .models import SavedItem


@admin.register(SavedItem)
class SavedItemAdmin(admin.ModelAdmin):
    list_display = ["user", "content_type", "object_id", "saved_at"]
    list_filter = ["content_type", "saved_at"]
    search_fields = ["user__full_name", "user__email"]
    readonly_fields = ["id", "saved_at"]
