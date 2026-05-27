from django.contrib import admin
from .models import PlacementApplication, InterviewExperience, CompanyNote


class InterviewExperienceInline(admin.TabularInline):
    model = InterviewExperience
    extra = 0


@admin.register(PlacementApplication)
class PlacementApplicationAdmin(admin.ModelAdmin):
    list_display = ["student", "company_name", "role", "status", "package_lpa", "deadline", "updated_at"]
    list_filter = ["status", "job_type"]
    search_fields = ["student__full_name", "student__student_id", "company_name", "role"]
    inlines = [InterviewExperienceInline]


@admin.register(InterviewExperience)
class InterviewExperienceAdmin(admin.ModelAdmin):
    list_display = ["application", "round_number", "round_type", "result", "interview_date"]
    list_filter = ["round_type", "result"]
    search_fields = ["application__company_name", "application__student__full_name"]


@admin.register(CompanyNote)
class CompanyNoteAdmin(admin.ModelAdmin):
    list_display = ["student", "company_name", "updated_at"]
    search_fields = ["student__full_name", "company_name"]
