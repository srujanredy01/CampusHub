"""
Django Admin registration for Faculty models.
"""
from django.contrib import admin
from .models import (
    FacultyProfile, FacultyAnnouncement, FacultyResource,
    AttendanceSession, AttendanceRecord, GradeEntry,
    FacultyChat, FacultyChatMessage, FacultyEvent,
    FacultyEventRegistration, AttendanceAlert,
    AdminFacultyAnnouncement, AdminFacultyAnnouncementRead,
)


@admin.register(FacultyProfile)
class FacultyProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "designation", "department", "is_active", "created_at"]
    list_filter = ["designation", "department", "is_active"]
    search_fields = ["user__full_name", "user__email", "employee_id"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(FacultyAnnouncement)
class FacultyAnnouncementAdmin(admin.ModelAdmin):
    list_display = ["title", "faculty", "priority", "is_published", "created_at"]
    list_filter = ["priority", "is_published", "is_active"]
    search_fields = ["title", "faculty__full_name"]


@admin.register(FacultyResource)
class FacultyResourceAdmin(admin.ModelAdmin):
    list_display = ["title", "faculty", "resource_type", "subject", "download_count", "created_at"]
    list_filter = ["resource_type", "is_active"]
    search_fields = ["title", "subject", "faculty__full_name"]


@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ["subject", "faculty", "section", "date", "present_count", "absent_count"]
    list_filter = ["branch", "semester", "section"]
    search_fields = ["subject", "faculty__full_name"]
    date_hierarchy = "date"


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = ["student", "session", "status", "marked_at"]
    list_filter = ["status"]
    search_fields = ["student__full_name"]


@admin.register(GradeEntry)
class GradeEntryAdmin(admin.ModelAdmin):
    list_display = ["student", "subject", "exam_type", "marks_obtained", "max_marks", "faculty"]
    list_filter = ["exam_type", "branch", "semester"]
    search_fields = ["student__full_name", "subject"]


@admin.register(FacultyChat)
class FacultyChatAdmin(admin.ModelAdmin):
    list_display = ["faculty", "student", "chat_type", "is_active", "last_message_at"]
    list_filter = ["chat_type", "is_active"]
    search_fields = ["faculty__full_name", "student__full_name"]


@admin.register(FacultyChatMessage)
class FacultyChatMessageAdmin(admin.ModelAdmin):
    list_display = ["sender", "chat", "message_type", "is_read", "created_at"]
    list_filter = ["message_type", "is_read"]
    search_fields = ["sender__full_name", "content"]


@admin.register(FacultyEvent)
class FacultyEventAdmin(admin.ModelAdmin):
    list_display = ["title", "faculty", "event_type", "status", "starts_at", "registered_count"]
    list_filter = ["event_type", "status", "is_active"]
    search_fields = ["title", "faculty__full_name"]


@admin.register(FacultyEventRegistration)
class FacultyEventRegistrationAdmin(admin.ModelAdmin):
    list_display = ["event", "student", "attended", "registered_at"]
    list_filter = ["attended"]
    search_fields = ["student__full_name", "event__title"]


@admin.register(AttendanceAlert)
class AttendanceAlertAdmin(admin.ModelAdmin):
    list_display = ["student", "subject_name", "current_percentage", "alert_level", "is_acknowledged"]
    list_filter = ["alert_level", "is_acknowledged"]
    search_fields = ["student__full_name", "subject_name"]


@admin.register(AdminFacultyAnnouncement)
class AdminFacultyAnnouncementAdmin(admin.ModelAdmin):
    list_display = ["title", "sender", "announcement_type", "priority", "created_at"]
    list_filter = ["announcement_type", "priority", "is_active"]
    search_fields = ["title", "sender__full_name"]


@admin.register(AdminFacultyAnnouncementRead)
class AdminFacultyAnnouncementReadAdmin(admin.ModelAdmin):
    list_display = ["announcement", "faculty", "acknowledged", "read_at"]
    list_filter = ["acknowledged"]
    search_fields = ["faculty__full_name"]
