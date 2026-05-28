"""
Views for the Feedback & Issue Reporting system.
Handles submission, listing, admin management, and analytics.
"""
import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from campushub.permissions import IsModeratorOrAdmin
from .models import FeedbackReport, FeedbackAttachment, FeedbackResponse, FeedbackStatusHistory
from .serializers import (
    FeedbackReportListSerializer,
    FeedbackReportDetailSerializer,
    FeedbackSubmitSerializer,
    FeedbackAdminUpdateSerializer,
    FeedbackResponseCreateSerializer,
)

User = get_user_model()
logger = logging.getLogger(__name__)

# Rate limiting: max submissions per user per hour
MAX_SUBMISSIONS_PER_HOUR = 5


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    r = {"success": True, "message": message}
    if data is not None:
        r["data"] = data
    return Response(r, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": {"message": message}}, status=code)


class FeedbackSubmitView(APIView):
    """Submit a new feedback report."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        user = request.user

        # Rate limiting
        one_hour_ago = timezone.now() - timedelta(hours=1)
        recent_count = FeedbackReport.objects.filter(
            user=user, created_at__gte=one_hour_ago
        ).count()
        if recent_count >= MAX_SUBMISSIONS_PER_HOUR:
            return err(
                "Rate limit exceeded. You can submit up to 5 reports per hour.",
                code=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        serializer = FeedbackSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return err(serializer.errors)

        data = serializer.validated_data

        # Create the report
        report = FeedbackReport.objects.create(
            user=user,
            feedback_type=data["feedback_type"],
            severity=data.get("severity", "medium"),
            title=data.get("title", ""),
            description=data["description"],
            tags=data.get("tags", []),
            page_url=data.get("page_url", ""),
            route_path=data.get("route_path", ""),
            browser_info=data.get("browser_info", ""),
            device_type=data.get("device_type", ""),
            screen_resolution=data.get("screen_resolution", ""),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        # Handle file attachments
        files = request.FILES.getlist("attachments")
        max_file_size = 10 * 1024 * 1024  # 10MB
        allowed_types = ["image/png", "image/jpeg", "image/jpg", "application/pdf"]

        for f in files[:5]:  # Max 5 attachments
            if f.size > max_file_size:
                continue
            if f.content_type not in allowed_types:
                continue

            FeedbackAttachment.objects.create(
                report=report,
                file=f,
                file_name=f.name,
                file_size=f.size,
                content_type=f.content_type,
            )

        # Send real-time notification to admins
        self._notify_admins(report)

        return ok(
            data={
                "tracking_id": report.tracking_id,
                "id": str(report.id),
            },
            message="Feedback submitted successfully.",
            code=status.HTTP_201_CREATED,
        )

    def _notify_admins(self, report):
        """Send WebSocket notification to admin group about new feedback."""
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    "feedback_admins",
                    {
                        "type": "feedback.new",
                        "feedback": {
                            "id": str(report.id),
                            "tracking_id": report.tracking_id,
                            "feedback_type": report.feedback_type,
                            "severity": report.severity,
                            "title": report.title or report.description[:80],
                            "user_name": report.user.full_name,
                            "created_at": report.created_at.isoformat(),
                        },
                    },
                )
        except Exception as e:
            logger.warning("Failed to send feedback notification: %s", e)


class FeedbackUploadAttachmentView(APIView):
    """Upload additional attachments to an existing report."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, report_id):
        try:
            report = FeedbackReport.objects.get(id=report_id, user=request.user)
        except FeedbackReport.DoesNotExist:
            return err("Report not found.", code=status.HTTP_404_NOT_FOUND)

        files = request.FILES.getlist("attachments")
        if not files:
            return err("No files provided.")

        max_file_size = 10 * 1024 * 1024
        allowed_types = ["image/png", "image/jpeg", "image/jpg", "application/pdf"]
        uploaded = []

        for f in files[:5]:
            if f.size > max_file_size:
                continue
            if f.content_type not in allowed_types:
                continue

            attachment = FeedbackAttachment.objects.create(
                report=report,
                file=f,
                file_name=f.name,
                file_size=f.size,
                content_type=f.content_type,
            )
            uploaded.append({"id": str(attachment.id), "file_name": attachment.file_name})

        return ok(data={"uploaded": uploaded}, message=f"{len(uploaded)} file(s) uploaded.")


class FeedbackUserListView(APIView):
    """List feedback reports for the current user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reports = FeedbackReport.objects.filter(user=request.user).select_related("assigned_to")
        serializer = FeedbackReportListSerializer(reports, many=True, context={"request": request})
        return ok(data=serializer.data)


class FeedbackUserDetailView(APIView):
    """Get detail of a specific feedback report (user's own)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, report_id):
        try:
            report = FeedbackReport.objects.select_related(
                "user", "assigned_to", "resolved_by"
            ).prefetch_related(
                "attachments", "responses", "status_history"
            ).get(id=report_id, user=request.user)
        except FeedbackReport.DoesNotExist:
            return err("Report not found.", code=status.HTTP_404_NOT_FOUND)

        serializer = FeedbackReportDetailSerializer(report, context={"request": request})
        return ok(data=serializer.data)


# ── Admin/Moderator Views ─────────────────────────────────────────────────────


class FeedbackAdminListView(APIView):
    """List all feedback reports for admin/moderator management."""
    permission_classes = [IsAuthenticated, IsModeratorOrAdmin]

    def get(self, request):
        qs = FeedbackReport.objects.select_related("user", "assigned_to")

        # Filters
        fb_type = request.query_params.get("type")
        fb_status = request.query_params.get("status")
        fb_priority = request.query_params.get("priority")
        fb_severity = request.query_params.get("severity")
        search = request.query_params.get("search")
        assigned = request.query_params.get("assigned_to")
        archived = request.query_params.get("archived")

        if fb_type:
            qs = qs.filter(feedback_type=fb_type)
        if fb_status:
            qs = qs.filter(status=fb_status)
        if fb_priority:
            qs = qs.filter(priority=fb_priority)
        if fb_severity:
            qs = qs.filter(severity=fb_severity)
        if search:
            qs = qs.filter(
                Q(tracking_id__icontains=search) |
                Q(description__icontains=search) |
                Q(title__icontains=search) |
                Q(user__full_name__icontains=search) |
                Q(user__email__icontains=search)
            )
        if assigned:
            qs = qs.filter(assigned_to_id=assigned)
        if archived == "true":
            qs = qs.filter(is_archived=True)
        else:
            qs = qs.filter(is_archived=False)

        # Ordering
        ordering = request.query_params.get("ordering", "-created_at")
        allowed_orderings = [
            "created_at", "-created_at", "priority", "-priority",
            "severity", "-severity", "status", "-status",
        ]
        if ordering in allowed_orderings:
            qs = qs.order_by(ordering)

        serializer = FeedbackReportListSerializer(qs, many=True, context={"request": request})
        return ok(data=serializer.data)


class FeedbackAdminDetailView(APIView):
    """Get/update a specific feedback report (admin view)."""
    permission_classes = [IsAuthenticated, IsModeratorOrAdmin]

    def get(self, request, report_id):
        try:
            report = FeedbackReport.objects.select_related(
                "user", "assigned_to", "resolved_by"
            ).prefetch_related(
                "attachments", "responses__responder", "status_history__changed_by"
            ).get(id=report_id)
        except FeedbackReport.DoesNotExist:
            return err("Report not found.", code=status.HTTP_404_NOT_FOUND)

        serializer = FeedbackReportDetailSerializer(report, context={"request": request})
        return ok(data=serializer.data)

    def patch(self, request, report_id):
        """Update status, priority, assignment, etc."""
        try:
            report = FeedbackReport.objects.get(id=report_id)
        except FeedbackReport.DoesNotExist:
            return err("Report not found.", code=status.HTTP_404_NOT_FOUND)

        serializer = FeedbackAdminUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return err(serializer.errors)

        data = serializer.validated_data
        old_status = report.status

        # Update fields
        if "status" in data:
            report.status = data["status"]
            if data["status"] == "resolved":
                report.resolved_by = request.user
                report.resolved_at = timezone.now()

        if "priority" in data:
            report.priority = data["priority"]

        if "assigned_to" in data:
            if data["assigned_to"]:
                try:
                    assignee = User.objects.get(id=data["assigned_to"])
                    report.assigned_to = assignee
                except User.DoesNotExist:
                    return err("Assignee not found.")
            else:
                report.assigned_to = None

        if "resolution_note" in data and data["resolution_note"]:
            report.resolution_note = data["resolution_note"]

        report.save()

        # Record status change
        if "status" in data and data["status"] != old_status:
            FeedbackStatusHistory.objects.create(
                report=report,
                changed_by=request.user,
                old_status=old_status,
                new_status=data["status"],
                note=data.get("note", ""),
            )
            # Notify user of status change
            self._notify_user_status_change(report, old_status, data["status"])

        return ok(message="Report updated successfully.")

    def _notify_user_status_change(self, report, old_status, new_status):
        """Notify the report author about status change via WebSocket."""
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"user_notifications_{report.user.id}",
                    {
                        "type": "notification.new",
                        "notification": {
                            "type": "feedback_update",
                            "title": "Feedback Status Updated",
                            "message": f"Your report {report.tracking_id} status changed to {new_status}.",
                            "metadata": {
                                "tracking_id": report.tracking_id,
                                "report_id": str(report.id),
                                "old_status": old_status,
                                "new_status": new_status,
                            },
                        },
                        "unread_count": 0,
                    },
                )
        except Exception as e:
            logger.warning("Failed to send status change notification: %s", e)


class FeedbackAdminRespondView(APIView):
    """Add a response to a feedback report."""
    permission_classes = [IsAuthenticated, IsModeratorOrAdmin]

    def post(self, request, report_id):
        try:
            report = FeedbackReport.objects.get(id=report_id)
        except FeedbackReport.DoesNotExist:
            return err("Report not found.", code=status.HTTP_404_NOT_FOUND)

        serializer = FeedbackResponseCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return err(serializer.errors)

        data = serializer.validated_data
        response_obj = FeedbackResponse.objects.create(
            report=report,
            responder=request.user,
            message=data["message"],
            is_internal=data.get("is_internal", False),
        )

        # Notify user if not internal
        if not response_obj.is_internal:
            self._notify_user_response(report)

        return ok(message="Response added successfully.", code=status.HTTP_201_CREATED)

    def _notify_user_response(self, report):
        """Notify user about new response."""
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"user_notifications_{report.user.id}",
                    {
                        "type": "notification.new",
                        "notification": {
                            "type": "feedback_update",
                            "title": "New Response on Your Feedback",
                            "message": f"An admin responded to your report {report.tracking_id}.",
                            "metadata": {
                                "tracking_id": report.tracking_id,
                                "report_id": str(report.id),
                            },
                        },
                        "unread_count": 0,
                    },
                )
        except Exception as e:
            logger.warning("Failed to send response notification: %s", e)


class FeedbackAdminArchiveView(APIView):
    """Archive/unarchive a feedback report."""
    permission_classes = [IsAuthenticated, IsModeratorOrAdmin]

    def post(self, request, report_id):
        try:
            report = FeedbackReport.objects.get(id=report_id)
        except FeedbackReport.DoesNotExist:
            return err("Report not found.", code=status.HTTP_404_NOT_FOUND)

        report.is_archived = not report.is_archived
        report.save(update_fields=["is_archived"])

        action = "archived" if report.is_archived else "unarchived"
        return ok(message=f"Report {action} successfully.")


class FeedbackAnalyticsView(APIView):
    """Analytics dashboard data for feedback reports."""
    permission_classes = [IsAuthenticated, IsModeratorOrAdmin]

    def get(self, request):
        days = int(request.query_params.get("days", 30))
        since = timezone.now() - timedelta(days=days)

        qs = FeedbackReport.objects.filter(created_at__gte=since)

        # Summary counts
        total = qs.count()
        by_status = dict(qs.values_list("status").annotate(count=Count("id")).values_list("status", "count"))
        by_type = dict(qs.values_list("feedback_type").annotate(count=Count("id")).values_list("feedback_type", "count"))
        by_severity = dict(qs.values_list("severity").annotate(count=Count("id")).values_list("severity", "count"))
        by_priority = dict(qs.values_list("priority").annotate(count=Count("id")).values_list("priority", "count"))

        # Reports over time
        daily_reports = list(
            qs.annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
            .values("date", "count")
        )

        # Most reported pages
        top_pages = list(
            qs.exclude(route_path="")
            .values("route_path")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        # Average resolution time (for resolved reports)
        resolved = qs.filter(status="resolved", resolved_at__isnull=False)
        avg_resolution_hours = None
        if resolved.exists():
            from django.db.models import Avg, F, ExpressionWrapper, DurationField
            avg_duration = resolved.annotate(
                duration=ExpressionWrapper(
                    F("resolved_at") - F("created_at"),
                    output_field=DurationField()
                )
            ).aggregate(avg=Avg("duration"))["avg"]
            if avg_duration:
                avg_resolution_hours = round(avg_duration.total_seconds() / 3600, 1)

        # Top reporters
        top_reporters = list(
            qs.values("user__full_name", "user__email")
            .annotate(count=Count("id"))
            .order_by("-count")[:5]
        )

        return ok(data={
            "total": total,
            "by_status": by_status,
            "by_type": by_type,
            "by_severity": by_severity,
            "by_priority": by_priority,
            "daily_reports": [
                {"date": str(d["date"]), "count": d["count"]} for d in daily_reports
            ],
            "top_pages": top_pages,
            "avg_resolution_hours": avg_resolution_hours,
            "top_reporters": top_reporters,
        })
