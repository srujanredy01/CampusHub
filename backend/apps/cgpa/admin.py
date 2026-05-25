from django.contrib import admin
from .models import AcademicProfile, SemesterRecord, SubjectRecord, CGPAHistory


class SubjectRecordInline(admin.TabularInline):
    model = SubjectRecord
    extra = 0
    readonly_fields = ["grade_points", "total_marks", "is_backlog"]


class SemesterRecordInline(admin.TabularInline):
    model = SemesterRecord
    extra = 0
    readonly_fields = ["sgpa", "total_credits", "total_subjects", "failed_subjects"]
    show_change_link = True


@admin.register(AcademicProfile)
class AcademicProfileAdmin(admin.ModelAdmin):
    list_display = [
        "user", "current_cgpa", "total_credits_earned", "total_semesters",
        "academic_standing", "total_backlogs", "updated_at",
    ]
    list_filter = ["academic_standing"]
    search_fields = ["user__full_name", "user__student_id", "user__email"]
    readonly_fields = [
        "id", "current_cgpa", "total_credits_earned", "total_semesters",
        "highest_sgpa", "lowest_sgpa", "total_backlogs", "academic_standing",
        "created_at", "updated_at",
    ]
    inlines = [SemesterRecordInline]


@admin.register(SemesterRecord)
class SemesterRecordAdmin(admin.ModelAdmin):
    list_display = [
        "profile", "semester", "semester_name", "academic_year",
        "sgpa", "total_credits", "failed_subjects", "updated_at",
    ]
    list_filter = ["semester", "academic_year"]
    search_fields = [
        "profile__user__full_name", "profile__user__student_id", "semester_name",
    ]
    readonly_fields = [
        "id", "sgpa", "total_credits", "total_subjects",
        "failed_subjects", "created_at", "updated_at",
    ]
    inlines = [SubjectRecordInline]


@admin.register(SubjectRecord)
class SubjectRecordAdmin(admin.ModelAdmin):
    list_display = [
        "semester_record", "subject_name", "subject_code",
        "credits", "grade", "grade_points", "is_backlog",
    ]
    list_filter = ["grade", "is_backlog"]
    search_fields = [
        "subject_name", "subject_code",
        "semester_record__profile__user__full_name",
    ]


@admin.register(CGPAHistory)
class CGPAHistoryAdmin(admin.ModelAdmin):
    list_display = [
        "user", "action", "cgpa_at_time", "total_credits_at_time",
        "total_semesters_at_time", "created_at",
    ]
    list_filter = ["action"]
    search_fields = ["user__full_name", "user__email"]
    readonly_fields = ["id", "created_at"]
