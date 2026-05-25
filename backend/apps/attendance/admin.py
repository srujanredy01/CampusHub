from django.contrib import admin
from .models import SubjectAttendance, AttendanceHistory


@admin.register(SubjectAttendance)
class SubjectAttendanceAdmin(admin.ModelAdmin):
    list_display = ["student", "subject_name", "subject_code", "semester", "total_classes", "attended_classes", "attendance_percentage", "is_shortage"]
    list_filter = ["semester", "created_at"]
    search_fields = ["student__full_name", "student__email", "subject_name", "subject_code"]
    readonly_fields = ["id", "created_at", "updated_at"]

    def attendance_percentage(self, obj):
        return f"{obj.attendance_percentage}%"

    def is_shortage(self, obj):
        return obj.is_shortage
    is_shortage.boolean = True


@admin.register(AttendanceHistory)
class AttendanceHistoryAdmin(admin.ModelAdmin):
    list_display = ["student", "subject_name", "action", "old_percentage", "new_percentage", "created_at"]
    list_filter = ["action", "semester", "created_at"]
    search_fields = ["student__full_name", "student__email", "subject_name"]
    readonly_fields = ["id", "created_at"]
