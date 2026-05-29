from django.contrib import admin
from .models import Department, Section, Announcement


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "code"]


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ["name", "department", "semester", "is_active"]
    list_filter = ["department", "semester", "is_active"]
    search_fields = ["name"]


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ["title", "target", "priority", "is_active", "created_at"]
    list_filter = ["target", "priority", "is_active"]
    search_fields = ["title", "content"]
