from django.contrib import admin
from .models import FeedbackReport, FeedbackAttachment, FeedbackResponse, FeedbackStatusHistory


class FeedbackAttachmentInline(admin.TabularInline):
    model = FeedbackAttachment
    extra = 0
    readonly_fields = ("uploaded_at",)


class FeedbackResponseInline(admin.TabularInline):
    model = FeedbackResponse
    extra = 0
    readonly_fields = ("created_at",)


@admin.register(FeedbackReport)
class FeedbackReportAdmin(admin.ModelAdmin):
    list_display = ("tracking_id", "feedback_type", "severity", "status", "priority", "user", "created_at")
    list_filter = ("feedback_type", "severity", "status", "priority", "created_at")
    search_fields = ("tracking_id", "description", "user__full_name", "user__email")
    readonly_fields = ("id", "tracking_id", "created_at", "updated_at")
    inlines = [FeedbackAttachmentInline, FeedbackResponseInline]


@admin.register(FeedbackStatusHistory)
class FeedbackStatusHistoryAdmin(admin.ModelAdmin):
    list_display = ("report", "old_status", "new_status", "changed_by", "created_at")
    list_filter = ("new_status", "created_at")
    readonly_fields = ("id", "created_at")
