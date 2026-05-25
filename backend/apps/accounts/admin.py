from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["email", "full_name", "student_id", "role", "is_active", "email_verified", "created_at"]
    list_filter = ["role", "is_active", "email_verified", "branch"]
    search_fields = ["email", "full_name", "student_id"]
    ordering = ["-created_at"]
    readonly_fields = ["id", "created_at", "updated_at", "last_login"]
    fieldsets = (
        (None, {"fields": ("id", "email", "password")}),
        ("Personal Info", {"fields": ("full_name", "student_id", "branch", "semester", "section")}),
        ("Role & Status", {"fields": ("role", "is_active", "is_staff", "is_superuser", "email_verified")}),
        ("Timestamps", {"fields": ("created_at", "updated_at", "last_login")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("email", "full_name", "student_id", "branch", "semester", "section", "role", "password1", "password2")}),
    )
