"""Serializers for the Events app."""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    Event, EventRegistration, EventFeedback, EventCertificate,
    EventPoll, EventPollVote, EventQuestion, EventQuestionUpvote,
    EventAnnouncement, EventChatMessage,
)

User = get_user_model()


class EventListSerializer(serializers.ModelSerializer):
    organized_by_name = serializers.CharField(source="organized_by.full_name", read_only=True, default="")
    is_registered = serializers.SerializerMethodField()
    phase = serializers.ReadOnlyField()
    is_registration_open = serializers.ReadOnlyField()
    is_full = serializers.ReadOnlyField()

    class Meta:
        model = Event
        fields = [
            "id", "title", "slug", "short_description", "event_type", "status",
            "visibility", "starts_at", "ends_at", "venue", "is_online",
            "banner_image", "thumbnail", "max_registrations", "current_registrations",
            "waitlist_count", "organized_by_name", "department", "club_name",
            "has_certificates", "is_featured", "is_registration_open", "is_full",
            "phase", "is_registered", "average_rating", "view_count", "tags",
            "created_at",
        ]

    def get_is_registered(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.registrations.filter(user=request.user).exclude(status="cancelled").exists()


class EventDetailSerializer(serializers.ModelSerializer):
    organized_by_name = serializers.CharField(source="organized_by.full_name", read_only=True, default="")
    is_registered = serializers.SerializerMethodField()
    my_registration = serializers.SerializerMethodField()
    phase = serializers.ReadOnlyField()
    is_registration_open = serializers.ReadOnlyField()
    is_full = serializers.ReadOnlyField()

    class Meta:
        model = Event
        fields = "__all__"

    def get_is_registered(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.registrations.filter(user=request.user).exclude(status="cancelled").exists()

    def get_my_registration(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        reg = obj.registrations.filter(user=request.user).exclude(status="cancelled").first()
        if reg:
            return EventRegistrationSerializer(reg).data
        return None


class EventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            "title", "description", "short_description", "event_type", "status",
            "visibility", "starts_at", "ends_at", "registration_deadline",
            "venue", "venue_address", "is_online", "meeting_link", "map_link",
            "banner_image", "thumbnail", "max_registrations", "waitlist_enabled",
            "target_branch", "target_semester", "target_section",
            "organizer_name", "organizer_contact", "department", "club_name",
            "has_certificates", "has_qr_checkin", "has_live_chat",
            "has_polls", "has_qa", "has_feedback", "materials", "tags",
            "speakers", "agenda", "is_featured",
        ]

    def create(self, validated_data):
        from django.utils.text import slugify
        title = validated_data["title"]
        slug = slugify(title)
        n = 1
        base_slug = slug
        while Event.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{n}"
            n += 1
        validated_data["slug"] = slug
        validated_data["organized_by"] = self.context["request"].user
        return super().create(validated_data)


class EventRegistrationSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_branch = serializers.CharField(source="user.branch", read_only=True)
    event_title = serializers.CharField(source="event.title", read_only=True)

    class Meta:
        model = EventRegistration
        fields = [
            "id", "event", "user", "user_name", "user_email", "user_branch",
            "event_title", "status", "qr_code", "ticket_id",
            "checked_in_at", "checked_in_by", "waitlist_position",
            "registration_answers", "notes", "registered_at", "updated_at",
        ]
        read_only_fields = [
            "id", "user", "qr_code", "ticket_id", "checked_in_at",
            "checked_in_by", "waitlist_position", "registered_at",
        ]


class EventFeedbackSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = EventFeedback
        fields = [
            "id", "event", "user", "user_name", "rating", "content_rating",
            "organization_rating", "speaker_rating", "comment",
            "suggestions", "would_recommend", "created_at",
        ]
        read_only_fields = ["id", "user"]


class EventCertificateSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    event_title = serializers.CharField(source="event.title", read_only=True)

    class Meta:
        model = EventCertificate
        fields = [
            "id", "event", "user", "user_name", "event_title",
            "certificate_type", "certificate_id", "title", "description",
            "pdf_file", "issued_at", "issued_by", "is_verified", "metadata",
        ]
        read_only_fields = ["id", "certificate_id", "issued_at"]


class EventPollSerializer(serializers.ModelSerializer):
    votes_by_option = serializers.SerializerMethodField()
    my_votes = serializers.SerializerMethodField()

    class Meta:
        model = EventPoll
        fields = [
            "id", "event", "question", "options", "is_active",
            "allow_multiple", "total_votes", "votes_by_option",
            "my_votes", "created_at", "ends_at",
        ]
        read_only_fields = ["id", "total_votes"]

    def get_votes_by_option(self, obj):
        from django.db.models import Count
        votes = obj.votes.values("option_index").annotate(count=Count("id"))
        return {v["option_index"]: v["count"] for v in votes}

    def get_my_votes(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return []
        return list(obj.votes.filter(user=request.user).values_list("option_index", flat=True))


class EventQuestionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    has_upvoted = serializers.SerializerMethodField()

    class Meta:
        model = EventQuestion
        fields = [
            "id", "event", "user", "user_name", "question", "is_answered",
            "answer", "answered_by", "upvotes", "is_pinned", "is_hidden",
            "has_upvoted", "created_at",
        ]
        read_only_fields = ["id", "user", "upvotes", "is_answered", "answer", "answered_by"]

    def get_has_upvoted(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return obj.upvote_records.filter(user=request.user).exists()


class EventAnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True, default="")

    class Meta:
        model = EventAnnouncement
        fields = ["id", "event", "author", "author_name", "content", "is_pinned", "created_at"]
        read_only_fields = ["id", "author"]


class EventChatMessageSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    user_role = serializers.CharField(source="user.role", read_only=True)

    class Meta:
        model = EventChatMessage
        fields = ["id", "event", "user", "user_name", "user_role", "content", "is_deleted", "created_at"]
        read_only_fields = ["id", "user", "is_deleted"]
