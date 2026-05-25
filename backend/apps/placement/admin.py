from django.contrib import admin
from .models import Company, PlacementApplication, InterviewRound


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ["name", "industry", "is_active", "created_at"]
    list_filter = ["industry", "is_active"]
    search_fields = ["name", "industry", "website"]


class InterviewRoundInline(admin.TabularInline):
    model = InterviewRound
    extra = 0


@admin.register(PlacementApplication)
class PlacementApplicationAdmin(admin.ModelAdmin):
    list_display = ["student", "company", "role", "status", "package_lpa", "deadline", "reminder_enabled", "updated_at"]
    list_filter = ["status", "reminder_enabled", "company"]
    search_fields = ["student__full_name", "student__student_id", "company__name", "role"]
    inlines = [InterviewRoundInline]


@admin.register(InterviewRound)
class InterviewRoundAdmin(admin.ModelAdmin):
    list_display = ["application", "round_number", "round_type", "result", "round_date"]
    list_filter = ["round_type", "result"]
    search_fields = ["application__company__name", "application__student__full_name"]
