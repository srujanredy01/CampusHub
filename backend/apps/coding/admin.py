from django.contrib import admin
from .models import (
    CodingCategory,
    CodingQuestion,
    CodingSolution,
    Submission,
    SavedQuestion,
    CodingDraft,
    CodingDiscussionMessage,
)


@admin.register(CodingCategory)
class CodingCategoryAdmin(admin.ModelAdmin):
    list_display  = ["name", "category_type", "icon", "question_count", "is_active"]
    list_filter   = ["category_type", "is_active"]
    search_fields = ["name", "description"]
    readonly_fields = ["id", "question_count", "created_at"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(CodingQuestion)
class CodingQuestionAdmin(admin.ModelAdmin):
    list_display  = ["title", "topic", "difficulty", "total_submissions",
                     "accepted_submissions", "view_count", "is_active", "created_at"]
    list_filter   = ["topic", "difficulty", "is_active"]
    search_fields = ["title", "description"]
    readonly_fields = ["id", "slug", "total_submissions", "accepted_submissions",
                       "view_count", "created_at", "updated_at"]
    filter_horizontal = ["categories"]

    fieldsets = (
        ("Basic Info", {
            "fields": ("id", "title", "slug", "description", "topic", "difficulty", "is_active"),
        }),
        ("Problem Details", {
            "fields": ("constraints", "sample_input", "sample_output", "explanation"),
        }),
        ("Code", {
            "fields": ("starter_code", "hidden_test_cases", "supported_languages"),
        }),
        ("Metadata", {
            "fields": ("hints", "topic_tags", "company_tags", "categories", "created_by"),
        }),
        ("Editorial", {
            "fields": ("editorial_title", "editorial_content"),
        }),
        ("Stats", {
            "fields": ("total_submissions", "accepted_submissions", "view_count",
                       "created_at", "updated_at"),
        }),
    )


@admin.register(CodingSolution)
class CodingSolutionAdmin(admin.ModelAdmin):
    list_display  = ["question", "language", "time_complexity", "space_complexity", "created_at"]
    list_filter   = ["language"]
    search_fields = ["question__title"]
    readonly_fields = ["id", "created_at"]


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display  = ["user", "question", "language", "status", "execution_time",
                     "passed_test_cases", "total_test_cases", "created_at"]
    list_filter   = ["status", "language"]
    search_fields = ["user__full_name", "question__title"]
    readonly_fields = ["id", "created_at"]


@admin.register(SavedQuestion)
class SavedQuestionAdmin(admin.ModelAdmin):
    list_display  = ["user", "question", "created_at"]
    search_fields = ["user__full_name", "question__title"]
    readonly_fields = ["id", "created_at"]


@admin.register(CodingDraft)
class CodingDraftAdmin(admin.ModelAdmin):
    list_display = ["user", "question", "language", "updated_at"]
    list_filter = ["language"]
    search_fields = ["user__full_name", "question__title"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(CodingDiscussionMessage)
class CodingDiscussionMessageAdmin(admin.ModelAdmin):
    list_display = ["question", "user", "parent", "is_deleted", "created_at"]
    list_filter = ["is_deleted"]
    search_fields = ["question__title", "user__full_name", "body"]
    readonly_fields = ["id", "created_at", "updated_at"]
