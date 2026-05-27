"""
Event Management System Views.
"""
import logging
from django.contrib.auth import get_user_model
from django.db.models import Q, Avg
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from campushub.permissions import IsAdmin, IsFacultyOrAdmin
from .models import (
    Event, EventRegistration, EventFeedback, EventCertificate,
    EventPoll, EventPollVote, EventQuestion, EventQuestionUpvote,
    EventAnnouncement, EventChatMessage,
)
from .serializers import (
    EventListSerializer, EventDetailSerializer, EventCreateSerializer,
    EventRegistrationSerializer, EventFeedbackSerializer,
    EventCertificateSerializer, EventPollSerializer,
    EventQuestionSerializer, EventAnnouncementSerializer,
    EventChatMessageSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    r = {"success": True, "message": message}
    if data is not None:
        r["data"] = data
    return Response(r, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": {"message": message}}, status=code)


# ─── Student Event Views ───────────────────────────────────────────────────────

class EventListView(generics.ListAPIView):
    """GET /api/events — browse events."""
    permission_classes = [IsAuthenticated]
    serializer_class = EventListSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["event_type", "status", "is_featured", "is_online"]
    search_fields = ["title", "description", "venue", "tags"]
    ordering_fields = ["starts_at", "created_at", "current_registrations"]
    ordering = ["-starts_at"]

    def get_queryset(self):
        qs = Event.objects.filter(is_active=True).exclude(status="draft")
        # Filter by upcoming/past
        time_filter = self.request.query_params.get("time")
        if time_filter == "upcoming":
            qs = qs.filter(starts_at__gte=timezone.now())
        elif time_filter == "past":
            qs = qs.filter(ends_at__lt=timezone.now())
        elif time_filter == "live":
            now = timezone.now()
            qs = qs.filter(starts_at__lte=now, ends_at__gte=now)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class EventDetailView(APIView):
    """GET /api/events/<slug>"""
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        try:
            event = Event.objects.get(slug=slug, is_active=True)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        event.view_count += 1
        event.save(update_fields=["view_count"])
        return ok(EventDetailSerializer(event, context={"request": request}).data)


class EventRegisterView(APIView):
    """POST /api/events/<slug>/register"""
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        try:
            event = Event.objects.get(slug=slug, is_active=True)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        if not event.is_registration_open:
            return err("Registration is closed for this event.")
        # Check existing
        if EventRegistration.objects.filter(event=event, user=request.user).exclude(status="cancelled").exists():
            return err("Already registered.")
        # Determine status
        reg_status = "registered"
        if event.is_full:
            if event.waitlist_enabled:
                reg_status = "waitlisted"
            else:
                return err("Event is full.")
        reg = EventRegistration(event=event, user=request.user, status=reg_status)
        reg.generate_ticket_id()
        reg.generate_qr_code()
        reg.save()
        # Update counts
        if reg_status == "registered":
            event.current_registrations += 1
        else:
            event.waitlist_count += 1
            reg.waitlist_position = event.waitlist_count
            reg.save(update_fields=["waitlist_position"])
        event.save(update_fields=["current_registrations", "waitlist_count"])
        # Notification
        try:
            from apps.notifications.services import create_user_notification
            create_user_notification(
                request.user, "event",
                f"Registered: {event.title}",
                f"You are {'waitlisted for' if reg_status == 'waitlisted' else 'registered for'} {event.title}.",
                metadata={"event_id": str(event.id), "ticket_id": reg.ticket_id}
            )
        except Exception:
            pass
        return ok(EventRegistrationSerializer(reg).data, "Registration successful.", 201)


class EventCancelRegistrationView(APIView):
    """POST /api/events/<slug>/cancel-registration"""
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        try:
            event = Event.objects.get(slug=slug, is_active=True)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        try:
            reg = EventRegistration.objects.get(
                event=event, user=request.user
            )
        except EventRegistration.DoesNotExist:
            return err("Not registered.")
        if reg.status == "cancelled":
            return err("Already cancelled.")
        old_status = reg.status
        reg.status = "cancelled"
        reg.save(update_fields=["status"])
        if old_status in ("registered", "confirmed", "checked_in"):
            event.current_registrations = max(0, event.current_registrations - 1)
        elif old_status == "waitlisted":
            event.waitlist_count = max(0, event.waitlist_count - 1)
        event.save(update_fields=["current_registrations", "waitlist_count"])
        return ok(message="Registration cancelled.")


class MyRegistrationsView(APIView):
    """GET /api/events/my-registrations"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        regs = EventRegistration.objects.filter(
            user=request.user
        ).exclude(status="cancelled").select_related("event").order_by("-registered_at")
        return ok(EventRegistrationSerializer(regs, many=True).data)


class MyCertificatesView(APIView):
    """GET /api/events/my-certificates"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        certs = EventCertificate.objects.filter(
            user=request.user
        ).select_related("event").order_by("-issued_at")
        return ok(EventCertificateSerializer(certs, many=True).data)


class EventFeedbackView(APIView):
    """POST /api/events/<slug>/feedback"""
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        try:
            event = Event.objects.get(slug=slug, is_active=True)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        # Must have attended
        if not EventRegistration.objects.filter(
            event=event, user=request.user, status__in=["attended", "checked_in"]
        ).exists():
            return err("You must attend the event to give feedback.")
        if EventFeedback.objects.filter(event=event, user=request.user).exists():
            return err("Feedback already submitted.")
        s = EventFeedbackSerializer(data={**request.data, "event": str(event.id)})
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        feedback = s.save(user=request.user, event=event)
        # Update event rating
        avg = EventFeedback.objects.filter(event=event).aggregate(avg=Avg("rating"))["avg"] or 0
        event.average_rating = round(avg, 2)
        event.feedback_count = EventFeedback.objects.filter(event=event).count()
        event.save(update_fields=["average_rating", "feedback_count"])
        return ok(EventFeedbackSerializer(feedback).data, "Feedback submitted.", 201)


# ─── Live Event Features ───────────────────────────────────────────────────────

class EventPollsView(APIView):
    """GET /api/events/<slug>/polls"""
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        try:
            event = Event.objects.get(slug=slug, is_active=True)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        polls = EventPoll.objects.filter(event=event).order_by("-created_at")
        return ok(EventPollSerializer(polls, many=True, context={"request": request}).data)


class EventPollVoteView(APIView):
    """POST /api/events/polls/<id>/vote"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            poll = EventPoll.objects.get(pk=pk, is_active=True)
        except EventPoll.DoesNotExist:
            return err("Poll not found.", 404)
        option_index = request.data.get("option_index")
        if option_index is None:
            return err("option_index required.")
        if option_index >= len(poll.options):
            return err("Invalid option.")
        vote, created = EventPollVote.objects.get_or_create(
            poll=poll, user=request.user, option_index=option_index
        )
        if not created:
            return err("Already voted for this option.")
        poll.total_votes = poll.votes.count()
        poll.save(update_fields=["total_votes"])
        return ok(EventPollSerializer(poll, context={"request": request}).data, "Vote recorded.")


class EventQuestionsView(APIView):
    """GET/POST /api/events/<slug>/questions"""
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        try:
            event = Event.objects.get(slug=slug, is_active=True)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        questions = EventQuestion.objects.filter(
            event=event, is_hidden=False
        ).select_related("user").order_by("-upvotes", "-created_at")
        return ok(EventQuestionSerializer(questions, many=True, context={"request": request}).data)

    def post(self, request, slug):
        try:
            event = Event.objects.get(slug=slug, is_active=True)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        question_text = request.data.get("question", "").strip()
        if not question_text:
            return err("Question text required.")
        q = EventQuestion.objects.create(event=event, user=request.user, question=question_text)
        return ok(EventQuestionSerializer(q, context={"request": request}).data, "Question posted.", 201)


class EventQuestionUpvoteView(APIView):
    """POST /api/events/questions/<id>/upvote"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            q = EventQuestion.objects.get(pk=pk, is_hidden=False)
        except EventQuestion.DoesNotExist:
            return err("Question not found.", 404)
        upvote, created = EventQuestionUpvote.objects.get_or_create(question=q, user=request.user)
        if not created:
            upvote.delete()
            q.upvotes = max(0, q.upvotes - 1)
        else:
            q.upvotes += 1
        q.save(update_fields=["upvotes"])
        return ok({"upvotes": q.upvotes, "has_upvoted": created})


class EventAnnouncementsView(APIView):
    """GET /api/events/<slug>/announcements"""
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        try:
            event = Event.objects.get(slug=slug, is_active=True)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        announcements = EventAnnouncement.objects.filter(event=event).order_by("-created_at")
        return ok(EventAnnouncementSerializer(announcements, many=True).data)


class EventChatMessagesView(APIView):
    """GET /api/events/<slug>/chat"""
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        try:
            event = Event.objects.get(slug=slug, is_active=True)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        before = request.query_params.get("before")
        limit = min(int(request.query_params.get("limit", 50)), 100)
        qs = EventChatMessage.objects.filter(
            event=event, is_deleted=False
        ).select_related("user").order_by("-created_at")
        if before:
            qs = qs.filter(created_at__lt=before)
        messages = list(qs[:limit])
        messages.reverse()
        return ok(EventChatMessageSerializer(messages, many=True).data)


# ─── Faculty Event Views ───────────────────────────────────────────────────────

class FacultyEventCreateView(APIView):
    """POST /api/events/create"""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        s = EventCreateSerializer(data=request.data, context={"request": request})
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        event = s.save()
        try:
            from apps.audit.utils import log_activity
            log_activity(request, "page_visit", "success", 201,
                         {"action": "event_created", "event": event.title})
        except Exception:
            pass
        return ok(EventDetailSerializer(event, context={"request": request}).data,
                  "Event created.", 201)


class FacultyEventEditView(APIView):
    """PUT /api/events/<slug>/edit"""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def put(self, request, slug):
        try:
            event = Event.objects.get(slug=slug)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        if event.organized_by != request.user and request.user.role not in ("admin", "super_admin"):
            return err("Permission denied.", 403)
        s = EventCreateSerializer(event, data=request.data, partial=True, context={"request": request})
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        event = s.save()
        return ok(EventDetailSerializer(event, context={"request": request}).data, "Event updated.")


class FacultyEventRegistrationsView(APIView):
    """GET /api/events/<slug>/registrations"""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get(self, request, slug):
        try:
            event = Event.objects.get(slug=slug)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        regs = EventRegistration.objects.filter(event=event).select_related("user").order_by("-registered_at")
        return ok(EventRegistrationSerializer(regs, many=True).data)


class FacultyEventCheckinView(APIView):
    """POST /api/events/checkin — QR scan check-in."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def post(self, request):
        ticket_id = request.data.get("ticket_id", "").strip()
        if not ticket_id:
            return err("ticket_id required.")
        try:
            reg = EventRegistration.objects.get(ticket_id=ticket_id)
        except EventRegistration.DoesNotExist:
            return err("Invalid ticket.", 404)
        if reg.status == "checked_in":
            return err("Already checked in.")
        if reg.status == "cancelled":
            return err("Registration was cancelled.")
        reg.status = "checked_in"
        reg.checked_in_at = timezone.now()
        reg.checked_in_by = request.user
        reg.save(update_fields=["status", "checked_in_at", "checked_in_by"])
        return ok(EventRegistrationSerializer(reg).data, "Check-in successful.")


class FacultyCreateAnnouncementView(APIView):
    """POST /api/events/<slug>/announcements"""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def post(self, request, slug):
        try:
            event = Event.objects.get(slug=slug)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        content = request.data.get("content", "").strip()
        if not content:
            return err("Content required.")
        ann = EventAnnouncement.objects.create(
            event=event, author=request.user, content=content,
            is_pinned=request.data.get("is_pinned", False)
        )
        return ok(EventAnnouncementSerializer(ann).data, "Announcement posted.", 201)


class FacultyCreatePollView(APIView):
    """POST /api/events/<slug>/polls"""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def post(self, request, slug):
        try:
            event = Event.objects.get(slug=slug)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        question = request.data.get("question", "").strip()
        options = request.data.get("options", [])
        if not question or len(options) < 2:
            return err("Question and at least 2 options required.")
        poll = EventPoll.objects.create(
            event=event, question=question, options=options,
            allow_multiple=request.data.get("allow_multiple", False),
            created_by=request.user
        )
        return ok(EventPollSerializer(poll, context={"request": request}).data, "Poll created.", 201)


class FacultyAnswerQuestionView(APIView):
    """POST /api/events/questions/<id>/answer"""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def post(self, request, pk):
        try:
            q = EventQuestion.objects.get(pk=pk)
        except EventQuestion.DoesNotExist:
            return err("Question not found.", 404)
        answer = request.data.get("answer", "").strip()
        if not answer:
            return err("Answer required.")
        q.answer = answer
        q.is_answered = True
        q.answered_by = request.user
        q.save(update_fields=["answer", "is_answered", "answered_by"])
        return ok(EventQuestionSerializer(q, context={"request": request}).data, "Answer posted.")


class FacultyIssueCertificateView(APIView):
    """POST /api/events/<slug>/certificates/issue"""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def post(self, request, slug):
        try:
            event = Event.objects.get(slug=slug)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        cert_type = request.data.get("certificate_type", "participation")
        user_ids = request.data.get("user_ids", [])
        if not user_ids:
            # Issue to all attended
            regs = EventRegistration.objects.filter(
                event=event, status__in=["attended", "checked_in"]
            )
            user_ids = list(regs.values_list("user_id", flat=True))
        issued = 0
        for uid in user_ids:
            if EventCertificate.objects.filter(event=event, user_id=uid, certificate_type=cert_type).exists():
                continue
            EventCertificate.objects.create(
                event=event, user_id=uid, certificate_type=cert_type,
                title=f"{cert_type.title()} Certificate — {event.title}",
                issued_by=request.user
            )
            issued += 1
        return ok({"issued": issued}, f"{issued} certificates issued.")


# ─── Admin Event Views ─────────────────────────────────────────────────────────

class AdminEventListView(generics.ListAPIView):
    """GET /api/admin/events — all events."""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = EventListSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["event_type", "status", "is_featured", "is_active"]
    search_fields = ["title", "description", "venue"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Event.objects.all()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class AdminEventDetailView(APIView):
    """GET/PUT/DELETE /api/admin/events/<slug>"""
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, slug):
        try:
            event = Event.objects.get(slug=slug)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        return ok(EventDetailSerializer(event, context={"request": request}).data)

    def put(self, request, slug):
        try:
            event = Event.objects.get(slug=slug)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        s = EventCreateSerializer(event, data=request.data, partial=True, context={"request": request})
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        event = s.save()
        return ok(EventDetailSerializer(event, context={"request": request}).data, "Event updated.")

    def delete(self, request, slug):
        try:
            event = Event.objects.get(slug=slug)
        except Event.DoesNotExist:
            return err("Event not found.", 404)
        event.is_active = False
        event.status = "cancelled"
        event.save(update_fields=["is_active", "status"])
        return ok(message="Event cancelled.")


class AdminEventRegistrationsView(generics.ListAPIView):
    """GET /api/admin/events/<slug>/registrations"""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = EventRegistrationSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status"]
    search_fields = ["user__full_name", "user__email", "ticket_id"]
    ordering = ["-registered_at"]

    def get_queryset(self):
        slug = self.kwargs.get("slug")
        return EventRegistration.objects.filter(
            event__slug=slug
        ).select_related("user", "event")


class AdminEventStatsView(APIView):
    """GET /api/admin/events/stats"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from datetime import timedelta
        now = timezone.now()
        d30 = now - timedelta(days=30)
        return ok({
            "total_events": Event.objects.count(),
            "active_events": Event.objects.filter(is_active=True).exclude(status__in=["cancelled", "draft"]).count(),
            "upcoming_events": Event.objects.filter(starts_at__gte=now, is_active=True).count(),
            "live_events": Event.objects.filter(starts_at__lte=now, ends_at__gte=now, is_active=True).count(),
            "total_registrations": EventRegistration.objects.exclude(status="cancelled").count(),
            "total_checkins": EventRegistration.objects.filter(status="checked_in").count(),
            "total_certificates": EventCertificate.objects.count(),
            "total_feedback": EventFeedback.objects.count(),
            "events_30d": Event.objects.filter(created_at__gte=d30).count(),
            "registrations_30d": EventRegistration.objects.filter(registered_at__gte=d30).count(),
        })


class AdminAllCertificatesView(generics.ListAPIView):
    """GET /api/admin/events/certificates"""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = EventCertificateSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["certificate_type", "event"]
    search_fields = ["user__full_name", "certificate_id"]
    ordering = ["-issued_at"]

    def get_queryset(self):
        return EventCertificate.objects.select_related("user", "event").all()
