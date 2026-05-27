from django.contrib import admin
from .models import (
    Event, EventRegistration, EventFeedback, EventCertificate,
    EventPoll, EventQuestion, EventAnnouncement, EventChatMessage,
)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ["title", "event_type", "status", "starts_at", "current_registrations", "is_active"]
    list_filter = ["event_type", "status", "is_featured", "is_active"]
    search_fields = ["title", "description"]
    prepopulated_fields = {"slug": ("title",)}


@admin.register(EventRegistration)
class EventRegistrationAdmin(admin.ModelAdmin):
    list_display = ["user", "event", "status", "ticket_id", "registered_at"]
    list_filter = ["status"]
    search_fields = ["user__full_name", "ticket_id"]


@admin.register(EventCertificate)
class EventCertificateAdmin(admin.ModelAdmin):
    list_display = ["user", "event", "certificate_type", "certificate_id", "issued_at"]
    list_filter = ["certificate_type"]
    search_fields = ["user__full_name", "certificate_id"]


@admin.register(EventFeedback)
class EventFeedbackAdmin(admin.ModelAdmin):
    list_display = ["user", "event", "rating", "created_at"]


@admin.register(EventPoll)
class EventPollAdmin(admin.ModelAdmin):
    list_display = ["event", "question", "is_active", "total_votes"]


@admin.register(EventQuestion)
class EventQuestionAdmin(admin.ModelAdmin):
    list_display = ["user", "event", "is_answered", "upvotes"]
