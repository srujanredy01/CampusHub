from django.contrib import admin
from .models import StudentProfile, ActivityLog

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "total_questions_solved", "created_at"]
    search_fields = ["user__full_name", "user__email"]

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ["user", "activity_type", "description", "created_at"]
    list_filter = ["activity_type"]
