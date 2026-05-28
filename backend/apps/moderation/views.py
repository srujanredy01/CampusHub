"""
Moderation Dashboard API views — production-grade moderation system.
Complete moderation ecosystem for CampusHub.
"""
import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import (
    ModeratorProfile, ContentReport, ModerationActionLog,
    ApprovalRequest, UserWarning, UserBan, UserMute,
    UserViolation, AutoModerationRule, AutoModerationLog,
    EscalationConfig,
)
from .serializers import (
    ModeratorProfileSerializer, ContentReportSerializer,
    ContentReportCreateSerializer, ContentReportResolveSerializer,
    ModerationActionLogSerializer,
    ApprovalRequestSerializer, ApprovalActionSerializer,
    UserWarningSerializer, UserWarningCreateSerializer,
    UserBanSerializer, UserBanCreateSerializer,
    UserMuteSerializer, UserMuteCreateSerializer,
    UserViolationSerializer, AutoModerationRuleSerializer,
    AutoModerationLogSerializer, EscalationConfigSerializer,
)
from .permissions import IsModerator, IsGlobalModerator, ScopedModerator
from .services import log_moderation_action, notify_moderators_realtime, notify_user_realtime

User = get_user_model()
logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD & PROFILE
# ═══════════════════════════════════════════════════════════════════════════════


class ModerationDashboardView(APIView):
    """GET /api/moderation/dashboard — moderator overview stats."""
    permission_classes = [IsAuthenticated, IsModerator]

    def get(self, request):
        now = timezone.now()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        pending_reports = ContentReport.objects.filter(status="pending").count()
        investigating_reports = ContentReport.objects.filter(status="investigating").count()
        critical_reports = ContentReport.objects.filter(status="pending", priority="critical").count()

        from apps.communication.models import ChannelRequest
        pending_channel_requests = ChannelRequest.objects.filter(status="pending").count()

        pending_approvals = ApprovalRequest.objects.filter(status="pending")
        pending_roadmaps = pending_approvals.filter(request_type="roadmap").count()
        pending_notes = pending_approvals.filter(request_type="note").count()
        pending_study_groups = pending_approvals.filter(request_type="study_group").count()

        active_bans = UserBan.objects.filter(is_active=True).count()
        active_mutes = UserMute.objects.filter(is_active=True, expires_at__gt=now).count()
        recent_violations = ModerationActionLog.objects.filter(
            created_at__gte=now - timedelta(days=7)
        ).count()

        from apps.communication.models import UserPresence
        active_users = UserPresence.objects.filter(status="online").count()

        total_actions_today = ModerationActionLog.objects.filter(
            created_at__gte=today
        ).count()
        auto_actions_today = ModerationActionLog.objects.filter(
            created_at__gte=today, is_automated=True
        ).count()

        # Suspended users
        suspended_users = UserBan.objects.filter(
            is_active=True, ban_type="temporary", scope="platform"
        ).count()

        return Response({
            "status": "success",
            "data": {
                "pending_reports": pending_reports,
                "investigating_reports": investigating_reports,
                "critical_reports": critical_reports,
                "pending_channel_requests": pending_channel_requests,
                "pending_roadmaps": pending_roadmaps,
                "pending_notes": pending_notes,
                "pending_study_groups": pending_study_groups,
                "active_bans": active_bans,
                "active_mutes": active_mutes,
                "suspended_users": suspended_users,
                "recent_violations_7d": recent_violations,
                "active_users_online": active_users,
                "total_actions_today": total_actions_today,
                "auto_actions_today": auto_actions_today,
            }
        })


class ModeratorProfileView(APIView):
    """GET/PUT moderator profile."""
    permission_classes = [IsAuthenticated, IsModerator]

    def get(self, request):
        profile, _ = ModeratorProfile.objects.get_or_create(user=request.user)
        serializer = ModeratorProfileSerializer(profile)
        return Response({"status": "success", "data": serializer.data})

    def put(self, request):
        profile, _ = ModeratorProfile.objects.get_or_create(user=request.user)
        serializer = ModeratorProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "success", "data": serializer.data})
        return Response({"status": "error", "errors": serializer.errors}, status=400)


# ═══════════════════════════════════════════════════════════════════════════════
# CONTENT REPORTS
# ═══════════════════════════════════════════════════════════════════════════════


class ContentReportListView(generics.ListAPIView):
    """GET /api/moderation/reports — list all content reports."""
    permission_classes = [IsAuthenticated, IsModerator]
    serializer_class = ContentReportSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "priority", "content_type", "reason"]
    search_fields = ["content_preview", "description"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = ContentReport.objects.select_related("reporter", "reported_user", "assigned_to")
        profile = getattr(self.request.user, "moderator_profile", None)
        if profile and profile.scope == "section" and profile.section:
            qs = qs.filter(
                Q(reported_user__section=profile.section) |
                Q(reporter__section=profile.section)
            )
        elif profile and profile.scope == "department" and profile.department:
            qs = qs.filter(
                Q(reported_user__branch=profile.department) |
                Q(reporter__branch=profile.department)
            )
        return qs


class ContentReportCreateView(APIView):
    """POST /api/moderation/reports/create — file a report (any user)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ContentReportCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=400)

        data = serializer.validated_data
        report = ContentReport.objects.create(
            reporter=request.user,
            content_type=data["content_type"],
            content_id=data["content_id"],
            content_preview=data.get("content_preview", ""),
            reported_user_id=data.get("reported_user"),
            reason=data["reason"],
            description=data.get("description", ""),
        )

        # Auto-escalate critical reports
        if data["reason"] in ("violence", "hate_speech"):
            report.priority = "critical"
            report.save(update_fields=["priority"])

        # Notify moderators in real-time
        notify_moderators_realtime("new_report", {
            "report_id": str(report.id),
            "content_type": report.content_type,
            "reason": report.reason,
            "priority": report.priority,
            "reporter": request.user.full_name,
            "created_at": report.created_at.isoformat(),
        })

        return Response({"status": "success", "message": "Report submitted"}, status=201)


class ContentReportDetailView(APIView):
    """GET/POST resolve a content report."""
    permission_classes = [IsAuthenticated, IsModerator]

    def get(self, request, pk):
        try:
            report = ContentReport.objects.select_related(
                "reporter", "reported_user", "assigned_to", "resolved_by"
            ).get(pk=pk)
        except ContentReport.DoesNotExist:
            return Response({"status": "error", "message": "Report not found"}, status=404)
        return Response({"status": "success", "data": ContentReportSerializer(report).data})

    def post(self, request, pk):
        """Resolve/update a report."""
        try:
            report = ContentReport.objects.get(pk=pk)
        except ContentReport.DoesNotExist:
            return Response({"status": "error", "message": "Report not found"}, status=404)

        serializer = ContentReportResolveSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=400)

        data = serializer.validated_data
        report.status = data["status"]
        report.resolution_note = data.get("resolution_note", "")
        report.action_taken = data.get("action_taken", "")

        if data["status"] == "resolved":
            report.resolved_by = request.user
            report.resolved_at = timezone.now()
        elif data["status"] == "investigating":
            report.assigned_to = request.user

        report.save()

        log_moderation_action(
            request.user,
            f"report_{data['status']}",
            "ContentReport", report.id,
            target_user=report.reported_user,
            reason=data.get("resolution_note", ""),
            request=request,
        )

        return Response({"status": "success", "message": f"Report {data['status']}"})


# ═══════════════════════════════════════════════════════════════════════════════
# CHANNEL MODERATION
# ═══════════════════════════════════════════════════════════════════════════════


class ChannelModerationView(APIView):
    """Channel moderation actions — approve/reject/lock/archive/slow-mode."""
    permission_classes = [IsAuthenticated, IsModerator]

    def get(self, request):
        """List channel requests and active channels."""
        from apps.communication.models import ChannelRequest, Channel

        pending = ChannelRequest.objects.filter(status="pending").order_by("-created_at")
        data = [{
            "id": str(r.id),
            "name": r.name,
            "description": r.description,
            "channel_type": r.channel_type,
            "requested_by": r.requested_by.full_name,
            "branch": r.branch,
            "semester": r.semester,
            "section": r.section,
            "created_at": r.created_at.isoformat(),
        } for r in pending[:20]]

        channels = Channel.objects.filter(is_active=True).order_by("-last_message_at")[:20]
        channel_data = [{
            "id": str(c.id),
            "name": c.name,
            "slug": c.slug,
            "channel_type": c.channel_type,
            "member_count": c.member_count,
            "message_count": c.message_count,
            "is_locked": c.is_locked,
            "is_archived": c.is_archived,
            "slow_mode_seconds": c.slow_mode_seconds,
            "profanity_filter": c.profanity_filter,
            "auto_moderation": c.auto_moderation,
        } for c in channels]

        return Response({
            "status": "success",
            "data": {"pending_requests": data, "channels": channel_data}
        })

    def post(self, request):
        """Approve/reject/lock/archive/slow-mode a channel."""
        from apps.communication.models import ChannelRequest, Channel, ChannelMembership
        from .services import add_moderators_to_channel

        action = request.data.get("action")
        target_id = request.data.get("target_id")
        reason = request.data.get("reason", "")

        if not action or not target_id:
            return Response({"status": "error", "message": "action and target_id required"}, status=400)

        if action in ("approve_request", "reject_request"):
            try:
                req = ChannelRequest.objects.get(pk=target_id)
            except ChannelRequest.DoesNotExist:
                return Response({"status": "error", "message": "Request not found"}, status=404)

            if action == "approve_request":
                req.status = "approved"
                req.reviewed_by = request.user
                req.reviewed_at = timezone.now()
                req.save()
                channel = Channel.objects.create(
                    name=req.name,
                    slug=req.name.lower().replace(" ", "-"),
                    description=req.description,
                    channel_type=req.channel_type,
                    visibility=req.visibility,
                    branch=req.branch,
                    semester=req.semester,
                    section=req.section,
                    created_by=req.requested_by,
                )
                # Add requester as owner
                ChannelMembership.objects.create(channel=channel, user=req.requested_by, role="owner")
                # Auto-add all moderators
                add_moderators_to_channel(channel)
                channel.member_count = channel.memberships.filter(is_banned=False).count()
                channel.save(update_fields=["member_count"])
                req.created_channel = channel
                req.save()
                log_moderation_action(request.user, "channel_approved", "Channel", channel.id, reason=reason, request=request)

                # Notify requester
                notify_user_realtime(req.requested_by, "channel_approved", {
                    "title": "Channel Approved",
                    "message": f"Your channel '#{req.name}' has been approved!",
                })
            else:
                req.status = "rejected"
                req.reviewed_by = request.user
                req.reviewed_at = timezone.now()
                req.rejection_reason = reason
                req.save()
                log_moderation_action(request.user, "channel_rejected", "ChannelRequest", req.id, reason=reason, request=request)

                notify_user_realtime(req.requested_by, "channel_rejected", {
                    "title": "Channel Rejected",
                    "message": f"Your channel request '#{req.name}' was rejected: {reason}",
                })

        elif action in ("lock", "unlock", "archive", "delete", "slow_mode"):
            try:
                channel = Channel.objects.get(pk=target_id)
            except Channel.DoesNotExist:
                return Response({"status": "error", "message": "Channel not found"}, status=404)

            if action == "lock":
                channel.is_locked = True
                log_moderation_action(request.user, "channel_locked", "Channel", channel.id, reason=reason, request=request)
            elif action == "unlock":
                channel.is_locked = False
                log_moderation_action(request.user, "channel_unlocked", "Channel", channel.id, reason=reason, request=request)
            elif action == "archive":
                channel.is_archived = True
                log_moderation_action(request.user, "channel_archived", "Channel", channel.id, reason=reason, request=request)
            elif action == "delete":
                channel.is_active = False
                log_moderation_action(request.user, "channel_deleted", "Channel", channel.id, reason=reason, request=request)
            elif action == "slow_mode":
                seconds = int(request.data.get("slow_mode_seconds", 30))
                channel.slow_mode_seconds = seconds
                log_moderation_action(request.user, "channel_slow_mode", "Channel", channel.id, reason=reason, details={"seconds": seconds}, request=request)
            channel.save()

        return Response({"status": "success", "message": f"Action '{action}' completed"})


# ═══════════════════════════════════════════════════════════════════════════════
# APPROVAL REQUESTS (Roadmaps, Notes, Study Groups)
# ═══════════════════════════════════════════════════════════════════════════════


class ApprovalRequestListView(generics.ListAPIView):
    """List approval requests."""
    permission_classes = [IsAuthenticated, IsModerator]
    serializer_class = ApprovalRequestSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["request_type", "status"]
    search_fields = ["title", "description"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return ApprovalRequest.objects.select_related("requested_by", "reviewed_by")


class ApprovalRequestActionView(APIView):
    """Approve/reject an approval request."""
    permission_classes = [IsAuthenticated, IsModerator]

    def get(self, request, pk):
        """Get approval request detail with full metadata."""
        try:
            approval = ApprovalRequest.objects.select_related("requested_by", "reviewed_by").get(pk=pk)
        except ApprovalRequest.DoesNotExist:
            return Response({"status": "error", "message": "Request not found"}, status=404)
        return Response({"status": "success", "data": ApprovalRequestSerializer(approval).data})

    def post(self, request, pk):
        try:
            approval = ApprovalRequest.objects.get(pk=pk)
        except ApprovalRequest.DoesNotExist:
            return Response({"status": "error", "message": "Request not found"}, status=404)

        serializer = ApprovalActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=400)

        data = serializer.validated_data
        approval.status = data["status"]
        approval.reviewed_by = request.user
        approval.review_notes = data.get("review_notes", "")
        approval.reviewed_at = timezone.now()
        approval.save()

        action_map = {
            "approved": f"{approval.request_type}_approved",
            "rejected": f"{approval.request_type}_rejected",
            "needs_changes": f"{approval.request_type}_changes_requested",
        }
        log_moderation_action(
            request.user,
            action_map.get(data["status"], "report_resolved"),
            "ApprovalRequest", approval.id,
            target_user=approval.requested_by,
            reason=data.get("review_notes", ""),
            request=request,
        )

        # Notify the requester
        status_messages = {
            "approved": f"Your {approval.request_type} '{approval.title}' has been approved!",
            "rejected": f"Your {approval.request_type} '{approval.title}' was rejected.",
            "needs_changes": f"Your {approval.request_type} '{approval.title}' needs changes.",
        }
        notify_user_realtime(approval.requested_by, f"{approval.request_type}_{data['status']}", {
            "title": f"{approval.request_type.title()} Review",
            "message": status_messages.get(data["status"], ""),
            "metadata": {"content_id": str(approval.content_id)},
        })

        return Response({"status": "success", "message": f"Request {data['status']}"})


# ═══════════════════════════════════════════════════════════════════════════════
# CHAT MODERATION
# ═══════════════════════════════════════════════════════════════════════════════


class ChatModerationView(APIView):
    """Chat moderation — delete messages, mute/kick/ban users."""
    permission_classes = [IsAuthenticated, IsModerator]

    def post(self, request):
        action = request.data.get("action")
        target_id = request.data.get("target_id")
        reason = request.data.get("reason", "")
        duration = request.data.get("duration_minutes")

        if not action or not target_id:
            return Response({"status": "error", "message": "action and target_id required"}, status=400)

        from apps.communication.models import Message, ChannelMembership

        if action == "delete_message":
            try:
                msg = Message.objects.get(pk=target_id)
            except Message.DoesNotExist:
                return Response({"status": "error", "message": "Message not found"}, status=404)
            msg.is_deleted = True
            msg.deleted_at = timezone.now()
            msg.deleted_by = request.user
            msg.save()
            log_moderation_action(request.user, "message_deleted", "Message", msg.id, target_user=msg.sender, reason=reason, request=request)

        elif action == "mute_user":
            try:
                user = User.objects.get(pk=target_id)
            except User.DoesNotExist:
                return Response({"status": "error", "message": "User not found"}, status=404)
            channel_id = request.data.get("channel_id")
            mute_duration = int(duration or 60)
            expires_at = timezone.now() + timedelta(minutes=mute_duration)

            UserMute.objects.create(
                user=user,
                muted_by=request.user,
                channel_id=channel_id,
                reason=reason,
                expires_at=expires_at,
            )
            # Also update channel membership
            if channel_id:
                ChannelMembership.objects.filter(user=user, channel_id=channel_id).update(
                    is_muted=True, muted_until=expires_at
                )
            else:
                ChannelMembership.objects.filter(user=user).update(
                    is_muted=True, muted_until=expires_at
                )
            log_moderation_action(request.user, "user_muted", "User", user.id, target_user=user, reason=reason, details={"duration_minutes": mute_duration}, request=request)

            notify_user_realtime(user, "user_muted", {
                "title": "You have been muted",
                "message": f"Reason: {reason}. Duration: {mute_duration} minutes.",
            })

        elif action == "unmute_user":
            try:
                user = User.objects.get(pk=target_id)
            except User.DoesNotExist:
                return Response({"status": "error", "message": "User not found"}, status=404)
            UserMute.objects.filter(user=user, is_active=True).update(is_active=False)
            ChannelMembership.objects.filter(user=user).update(is_muted=False, muted_until=None)
            log_moderation_action(request.user, "user_unmuted", "User", user.id, target_user=user, reason=reason, request=request)

        elif action == "kick_user":
            try:
                user = User.objects.get(pk=target_id)
            except User.DoesNotExist:
                return Response({"status": "error", "message": "User not found"}, status=404)
            channel_id = request.data.get("channel_id")
            if channel_id:
                ChannelMembership.objects.filter(user=user, channel_id=channel_id).delete()
            log_moderation_action(request.user, "user_kicked", "User", user.id, target_user=user, reason=reason, details={"channel_id": channel_id}, request=request)

            notify_user_realtime(user, "user_kicked", {
                "title": "You have been removed from a channel",
                "message": f"Reason: {reason}",
            })

        return Response({"status": "success", "message": f"Action '{action}' completed"})


# ═══════════════════════════════════════════════════════════════════════════════
# WARNINGS
# ═══════════════════════════════════════════════════════════════════════════════


class UserWarningListView(APIView):
    """GET warnings, POST issue a warning."""
    permission_classes = [IsAuthenticated, IsModerator]

    def get(self, request):
        user_id = request.query_params.get("user_id")
        qs = UserWarning.objects.select_related("user", "issued_by").order_by("-created_at")
        if user_id:
            qs = qs.filter(user_id=user_id)
        serializer = UserWarningSerializer(qs[:50], many=True)
        return Response({"status": "success", "data": serializer.data})

    def post(self, request):
        serializer = UserWarningCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=400)

        data = serializer.validated_data
        try:
            user = User.objects.get(pk=data["user_id"])
        except User.DoesNotExist:
            return Response({"status": "error", "message": "User not found"}, status=404)

        warning = UserWarning.objects.create(
            user=user,
            issued_by=request.user,
            reason=data["reason"],
            severity=data["severity"],
            source="manual",
            related_content_type=data.get("related_content_type", ""),
            related_content_id=data.get("related_content_id"),
        )

        log_moderation_action(request.user, "user_warned", "UserWarning", warning.id, target_user=user, reason=data["reason"], request=request)

        # Notify user
        notify_user_realtime(user, "warning_issued", {
            "title": "Warning Issued",
            "message": f"You have received a {data['severity']} warning: {data['reason']}",
            "priority": "high",
        })

        return Response({"status": "success", "message": "Warning issued"}, status=201)


# ═══════════════════════════════════════════════════════════════════════════════
# BANS
# ═══════════════════════════════════════════════════════════════════════════════


class UserBanListView(APIView):
    """GET active bans, POST issue a ban."""
    permission_classes = [IsAuthenticated, IsModerator]

    def get(self, request):
        scope = request.query_params.get("scope")
        qs = UserBan.objects.select_related("user", "banned_by").filter(is_active=True).order_by("-created_at")
        if scope:
            qs = qs.filter(scope=scope)
        serializer = UserBanSerializer(qs[:50], many=True)
        return Response({"status": "success", "data": serializer.data})

    def post(self, request):
        """Issue a ban."""
        serializer = UserBanCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=400)

        data = serializer.validated_data
        profile = getattr(request.user, "moderator_profile", None)
        if profile and not profile.can_ban_users and request.user.role not in ("admin", "super_admin"):
            return Response({"status": "error", "message": "No ban permission"}, status=403)

        try:
            user = User.objects.get(pk=data["user_id"])
        except User.DoesNotExist:
            return Response({"status": "error", "message": "User not found"}, status=404)

        # Prevent banning admins/super_admins
        if user.role in ("admin", "super_admin"):
            return Response({"status": "error", "message": "Cannot ban admin users"}, status=403)

        expires_at = None
        if data["ban_type"] == "temporary" and data.get("duration_hours"):
            expires_at = timezone.now() + timedelta(hours=data["duration_hours"])

        ban = UserBan.objects.create(
            user=user,
            banned_by=request.user,
            ban_type=data["ban_type"],
            scope=data["scope"],
            scope_target_id=data.get("scope_target_id"),
            reason=data["reason"],
            expires_at=expires_at,
        )

        log_moderation_action(request.user, "user_banned", "UserBan", ban.id, target_user=user, reason=data["reason"], request=request)

        notify_user_realtime(user, "user_banned", {
            "title": "Account Action",
            "message": f"Your account has been restricted ({data['scope']}). Reason: {data['reason']}",
            "priority": "critical",
        })

        return Response({"status": "success", "message": "User banned"}, status=201)


class UserBanLiftView(APIView):
    """Lift a ban."""
    permission_classes = [IsAuthenticated, IsModerator]

    def post(self, request, pk):
        try:
            ban = UserBan.objects.get(pk=pk, is_active=True)
        except UserBan.DoesNotExist:
            return Response({"status": "error", "message": "Ban not found"}, status=404)

        ban.is_active = False
        ban.lifted_by = request.user
        ban.lifted_at = timezone.now()
        ban.lift_reason = request.data.get("reason", "")
        ban.save()

        log_moderation_action(request.user, "user_unbanned", "UserBan", ban.id, target_user=ban.user, reason=ban.lift_reason, request=request)

        notify_user_realtime(ban.user, "ban_lifted", {
            "title": "Restriction Removed",
            "message": "Your account restriction has been lifted.",
        })

        return Response({"status": "success", "message": "Ban lifted"})


# ═══════════════════════════════════════════════════════════════════════════════
# MUTES
# ═══════════════════════════════════════════════════════════════════════════════


class UserMuteListView(APIView):
    """GET active mutes, POST issue a mute."""
    permission_classes = [IsAuthenticated, IsModerator]

    def get(self, request):
        now = timezone.now()
        qs = UserMute.objects.select_related("user", "muted_by").filter(
            is_active=True, expires_at__gt=now
        ).order_by("-created_at")
        serializer = UserMuteSerializer(qs[:50], many=True)
        return Response({"status": "success", "data": serializer.data})

    def post(self, request):
        serializer = UserMuteCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=400)

        data = serializer.validated_data
        try:
            user = User.objects.get(pk=data["user_id"])
        except User.DoesNotExist:
            return Response({"status": "error", "message": "User not found"}, status=404)

        mute = UserMute.objects.create(
            user=user,
            muted_by=request.user,
            channel_id=data.get("channel_id"),
            reason=data.get("reason", ""),
            expires_at=timezone.now() + timedelta(minutes=data["duration_minutes"]),
        )

        log_moderation_action(request.user, "user_muted", "UserMute", mute.id, target_user=user, reason=data.get("reason", ""), request=request)

        return Response({"status": "success", "message": "User muted"}, status=201)


# ═══════════════════════════════════════════════════════════════════════════════
# USER MODERATION HISTORY
# ═══════════════════════════════════════════════════════════════════════════════


class UserModerationHistoryView(APIView):
    """GET /api/moderation/users/<user_id>/history — complete moderation history."""
    permission_classes = [IsAuthenticated, IsModerator]

    def get(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"status": "error", "message": "User not found"}, status=404)

        from .services import get_user_moderation_history
        history = get_user_moderation_history(user)
        history["user"] = {
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "branch": user.branch,
            "section": user.section,
            "is_active": user.is_active,
            "is_locked": user.is_locked,
            "created_at": user.created_at.isoformat(),
        }
        return Response({"status": "success", "data": history})


# ═══════════════════════════════════════════════════════════════════════════════
# AUDIT LOGS
# ═══════════════════════════════════════════════════════════════════════════════


class ModerationActionLogView(generics.ListAPIView):
    """Immutable audit log of all moderation actions."""
    permission_classes = [IsAuthenticated, IsModerator]
    serializer_class = ModerationActionLogSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["action", "is_automated"]
    search_fields = ["reason", "target_type"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = ModerationActionLog.objects.select_related("moderator", "target_user")
        if self.request.user.role not in ("admin", "super_admin"):
            profile = getattr(self.request.user, "moderator_profile", None)
            if profile and not profile.can_view_audit_logs:
                qs = qs.filter(moderator=self.request.user)
        return qs


# ═══════════════════════════════════════════════════════════════════════════════
# ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════════


class ModerationAnalyticsView(APIView):
    """Moderation analytics and stats."""
    permission_classes = [IsAuthenticated, IsModerator]

    def get(self, request):
        now = timezone.now()
        d7 = now - timedelta(days=7)
        d30 = now - timedelta(days=30)

        # Most reported users
        most_reported = list(
            ContentReport.objects.filter(created_at__gte=d30, reported_user__isnull=False)
            .values("reported_user__full_name", "reported_user__id")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        # Most active moderators
        active_moderators = list(
            ModerationActionLog.objects.filter(created_at__gte=d7, moderator__isnull=False)
            .values("moderator__full_name")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )

        # Reports by type
        reports_by_type = list(
            ContentReport.objects.filter(created_at__gte=d30)
            .values("content_type")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        # Reports by reason
        reports_by_reason = list(
            ContentReport.objects.filter(created_at__gte=d30)
            .values("reason")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        # Resolution rate
        total_reports_30d = ContentReport.objects.filter(created_at__gte=d30).count()
        resolved_30d = ContentReport.objects.filter(created_at__gte=d30, status="resolved").count()
        resolution_rate = round((resolved_30d / total_reports_30d * 100) if total_reports_30d else 0, 1)

        # Daily actions trend (7 days)
        daily_actions = list(
            ModerationActionLog.objects.filter(created_at__gte=d7)
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        # Auto vs manual actions
        auto_actions_30d = ModerationActionLog.objects.filter(created_at__gte=d30, is_automated=True).count()
        manual_actions_30d = ModerationActionLog.objects.filter(created_at__gte=d30, is_automated=False).count()

        # Violation types distribution
        violation_types = list(
            UserViolation.objects.filter(created_at__gte=d30)
            .values("violation_type")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        return Response({
            "status": "success",
            "data": {
                "most_reported_users": most_reported,
                "active_moderators": active_moderators,
                "reports_by_type": reports_by_type,
                "reports_by_reason": reports_by_reason,
                "resolution_rate": resolution_rate,
                "total_reports_30d": total_reports_30d,
                "resolved_30d": resolved_30d,
                "daily_actions": daily_actions,
                "auto_actions_30d": auto_actions_30d,
                "manual_actions_30d": manual_actions_30d,
                "violation_types": violation_types,
            }
        })


# ═══════════════════════════════════════════════════════════════════════════════
# STUDY GROUP MODERATION
# ═══════════════════════════════════════════════════════════════════════════════


class StudyGroupModerationView(APIView):
    """Moderate study groups."""
    permission_classes = [IsAuthenticated, IsModerator]

    def get(self, request):
        from apps.study_groups.models import StudyGroup
        groups = StudyGroup.objects.filter(is_active=True).order_by("-created_at")[:30]
        data = [{
            "id": str(g.id),
            "name": g.name,
            "description": g.description[:100] if g.description else "",
            "member_count": g.member_count,
            "created_by": g.created_by.full_name if g.created_by else "",
            "visibility": g.visibility,
            "branch": g.branch,
            "is_active": g.is_active,
            "last_activity_at": g.last_activity_at.isoformat() if g.last_activity_at else None,
            "created_at": g.created_at.isoformat(),
        } for g in groups]
        return Response({"status": "success", "data": data})

    def post(self, request):
        """Suspend/remove/ban member from a study group."""
        from apps.study_groups.models import StudyGroup, GroupMembership
        action = request.data.get("action")
        group_id = request.data.get("group_id")
        reason = request.data.get("reason", "")
        user_id = request.data.get("user_id")

        if not action or not group_id:
            return Response({"status": "error", "message": "action and group_id required"}, status=400)

        try:
            group = StudyGroup.objects.get(pk=group_id)
        except StudyGroup.DoesNotExist:
            return Response({"status": "error", "message": "Group not found"}, status=404)

        if action == "suspend":
            group.is_active = False
            group.save()
            log_moderation_action(request.user, "group_suspended", "StudyGroup", group.id, reason=reason, request=request)
        elif action == "remove":
            group.is_active = False
            group.save()
            log_moderation_action(request.user, "group_removed", "StudyGroup", group.id, reason=reason, request=request)
        elif action == "remove_member" and user_id:
            GroupMembership.objects.filter(group=group, user_id=user_id).update(is_active=False)
            log_moderation_action(request.user, "user_kicked", "StudyGroup", group.id, target_user_id=user_id, reason=reason, request=request)

        return Response({"status": "success", "message": f"Group {action} completed"})


# ═══════════════════════════════════════════════════════════════════════════════
# NOTES MODERATION
# ═══════════════════════════════════════════════════════════════════════════════


class NotesModerationView(APIView):
    """Moderate uploaded notes."""
    permission_classes = [IsAuthenticated, IsModerator]

    def get(self, request):
        from apps.notes.models import Note
        notes = Note.objects.filter(status="pending", is_active=True).order_by("-created_at")[:30]
        data = [{
            "id": str(n.id),
            "title": n.title,
            "subject": n.subject,
            "branch": getattr(n, "branch", ""),
            "semester": getattr(n, "semester", None),
            "uploaded_by": n.uploaded_by.full_name if n.uploaded_by else "",
            "created_at": n.created_at.isoformat(),
        } for n in notes]
        return Response({"status": "success", "data": data})

    def post(self, request, pk=None):
        """Approve/reject/flag/delete a note."""
        from apps.notes.models import Note
        note_id = pk or request.data.get("note_id")
        action = request.data.get("action")
        reason = request.data.get("reason", "")

        if not note_id or not action:
            return Response({"status": "error", "message": "note_id and action required"}, status=400)

        try:
            note = Note.objects.get(pk=note_id)
        except Note.DoesNotExist:
            return Response({"status": "error", "message": "Note not found"}, status=404)

        if action == "approve":
            note.status = "approved"
            log_moderation_action(request.user, "note_approved", "Note", note.id, reason=reason, request=request)
        elif action == "reject":
            note.status = "rejected"
            log_moderation_action(request.user, "note_rejected", "Note", note.id, reason=reason, request=request)
        elif action == "flag":
            note.status = "flagged"
            log_moderation_action(request.user, "note_flagged", "Note", note.id, reason=reason, request=request)
        elif action == "delete":
            note.is_active = False
            log_moderation_action(request.user, "note_deleted", "Note", note.id, reason=reason, request=request)

        note.save()
        return Response({"status": "success", "message": f"Note {action}d"})


# ═══════════════════════════════════════════════════════════════════════════════
# AUTO-MODERATION RULES MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════════


class AutoModerationRuleListView(APIView):
    """GET/POST auto-moderation rules."""
    permission_classes = [IsAuthenticated, IsModerator]

    def get(self, request):
        rules = AutoModerationRule.objects.all().order_by("rule_type", "name")
        serializer = AutoModerationRuleSerializer(rules, many=True)
        return Response({"status": "success", "data": serializer.data})

    def post(self, request):
        """Create a new auto-moderation rule."""
        if request.user.role not in ("admin", "super_admin"):
            profile = getattr(request.user, "moderator_profile", None)
            if not profile or profile.scope != "global":
                return Response({"status": "error", "message": "Only global moderators can create rules"}, status=403)

        serializer = AutoModerationRuleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=400)
        serializer.save(created_by=request.user)
        return Response({"status": "success", "data": serializer.data}, status=201)


class AutoModerationRuleDetailView(APIView):
    """PUT/DELETE auto-moderation rules."""
    permission_classes = [IsAuthenticated, IsModerator]

    def put(self, request, pk):
        try:
            rule = AutoModerationRule.objects.get(pk=pk)
        except AutoModerationRule.DoesNotExist:
            return Response({"status": "error", "message": "Rule not found"}, status=404)
        serializer = AutoModerationRuleSerializer(rule, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=400)
        serializer.save()
        return Response({"status": "success", "data": serializer.data})

    def delete(self, request, pk):
        try:
            rule = AutoModerationRule.objects.get(pk=pk)
        except AutoModerationRule.DoesNotExist:
            return Response({"status": "error", "message": "Rule not found"}, status=404)
        rule.is_active = False
        rule.save(update_fields=["is_active"])
        return Response({"status": "success", "message": "Rule deactivated"})


class AutoModerationLogListView(generics.ListAPIView):
    """GET auto-moderation action logs."""
    permission_classes = [IsAuthenticated, IsModerator]
    serializer_class = AutoModerationLogSerializer
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["action_taken"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return AutoModerationLog.objects.select_related("rule", "user")[:100]


# ═══════════════════════════════════════════════════════════════════════════════
# ESCALATION CONFIG
# ═══════════════════════════════════════════════════════════════════════════════


class EscalationConfigView(APIView):
    """GET/PUT escalation configuration."""
    permission_classes = [IsAuthenticated, IsModerator]

    def get(self, request):
        configs = EscalationConfig.objects.all()
        serializer = EscalationConfigSerializer(configs, many=True)
        return Response({"status": "success", "data": serializer.data})

    def post(self, request):
        if request.user.role not in ("admin", "super_admin"):
            return Response({"status": "error", "message": "Admin access required"}, status=403)
        serializer = EscalationConfigSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=400)
        serializer.save()
        return Response({"status": "success", "data": serializer.data}, status=201)

    def put(self, request):
        config_id = request.data.get("id")
        if not config_id:
            return Response({"status": "error", "message": "id required"}, status=400)
        try:
            config = EscalationConfig.objects.get(pk=config_id)
        except EscalationConfig.DoesNotExist:
            return Response({"status": "error", "message": "Config not found"}, status=404)
        serializer = EscalationConfigSerializer(config, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=400)
        serializer.save()
        return Response({"status": "success", "data": serializer.data})


# ═══════════════════════════════════════════════════════════════════════════════
# VIOLATIONS
# ═══════════════════════════════════════════════════════════════════════════════


class UserViolationListView(generics.ListAPIView):
    """GET user violations."""
    permission_classes = [IsAuthenticated, IsModerator]
    serializer_class = UserViolationSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["violation_type"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = UserViolation.objects.select_related("user")
        user_id = self.request.query_params.get("user_id")
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs[:100]


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN OVERRIDE
# ═══════════════════════════════════════════════════════════════════════════════


class AdminModerationOverrideView(APIView):
    """Super Admin override — can override any moderator action."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ("admin", "super_admin"):
            return Response({"status": "error", "message": "Admin access required"}, status=403)

        action = request.data.get("action")
        target_id = request.data.get("target_id")
        reason = request.data.get("reason", "Admin override")

        if action == "lift_all_bans":
            try:
                user = User.objects.get(pk=target_id)
            except User.DoesNotExist:
                return Response({"status": "error", "message": "User not found"}, status=404)
            UserBan.objects.filter(user=user, is_active=True).update(
                is_active=False, lifted_by=request.user, lifted_at=timezone.now(), lift_reason=reason
            )
            UserMute.objects.filter(user=user, is_active=True).update(is_active=False)
            log_moderation_action(request.user, "user_unbanned", "User", user.id, target_user=user, reason=reason, request=request)
            return Response({"status": "success", "message": "All bans and mutes lifted"})

        elif action == "clear_warnings":
            try:
                user = User.objects.get(pk=target_id)
            except User.DoesNotExist:
                return Response({"status": "error", "message": "User not found"}, status=404)
            UserWarning.objects.filter(user=user, is_active=True).update(is_active=False)
            return Response({"status": "success", "message": "All warnings cleared"})

        return Response({"status": "error", "message": "Unknown action"}, status=400)
