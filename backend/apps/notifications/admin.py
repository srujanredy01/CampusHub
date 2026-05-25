from django.contrib import admin
from .models import Notification, AdminAlert, ScheduledNotification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["user", "notification_type", "title", "priority", "is_read", "created_at"]
    list_filter = ["notification_type", "priority", "is_read"]
    search_fields = ["user__full_name", "title"]
    readonly_fields = ["id", "created_at"]


@admin.register(AdminAlert)
class AdminAlertAdmin(admin.ModelAdmin):
    list_display = ["title", "alert_type", "category", "user", "is_read", "created_at"]
    list_filter = ["alert_type", "category", "is_read"]
    search_fields = ["title", "message", "user__full_name"]
    readonly_fields = ["id", "created_at"]


@admin.register(ScheduledNotification)
class ScheduledNotificationAdmin(admin.ModelAdmin):
    list_display = ["title", "notification_type", "status", "target_type", "sent_count", "created_at"]
    list_filter = ["status", "notification_type", "target_type"]
    search_fields = ["title", "message"]
    readonly_fields = ["id", "created_at", "updated_at"]
