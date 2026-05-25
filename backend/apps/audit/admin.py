from django.contrib import admin
from .models import AuditLog, UserActivityLog, ExecutionLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display  = ["action", "admin", "target_model", "description", "ip_address", "created_at"]
    list_filter   = ["action"]
    search_fields = ["description", "admin__email", "ip_address"]
    readonly_fields = ["id", "created_at"]
    ordering = ["-created_at"]


@admin.register(UserActivityLog)
class UserActivityLogAdmin(admin.ModelAdmin):
    list_display  = ["action", "username", "student_id", "role", "status",
                     "status_code", "ip_address", "browser", "os", "device", "created_at"]
    list_filter   = ["action", "status", "role", "device"]
    search_fields = ["username", "student_id", "ip_address", "endpoint"]
    readonly_fields = ["id", "created_at"]
    ordering = ["-created_at"]
    date_hierarchy = "created_at"


@admin.register(ExecutionLog)
class ExecutionLogAdmin(admin.ModelAdmin):
    list_display  = ["user", "language", "status", "execution_time", "is_submission", "ip_address", "created_at"]
    list_filter   = ["status", "language", "is_submission"]
    search_fields = ["user__full_name", "question_id"]
    readonly_fields = ["id", "created_at"]
    ordering = ["-created_at"]
