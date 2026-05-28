"""
Communication System Views — Channels, Messages, DMs, Moderation.
"""
import logging
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from campushub.permissions import IsAdmin, IsFacultyOrAdmin, IsModeratorOrAdmin
from .models import (
    Channel, ChannelMembership, Message, MessageReaction,
    MessageReadReceipt, DirectConversation, ConversationParticipant,
    UserPresence, BlockedUser, ModerationAction, MessageReport, ChannelRequest,
)
from .serializers import (
    ChannelSerializer, ChannelCreateSerializer, ChannelMembershipSerializer,
    MessageSerializer, MessageCreateSerializer, DirectConversationSerializer,
    UserPresenceSerializer, ModerationActionSerializer, MessageReportSerializer,
    BlockedUserSerializer, UserMiniSerializer,
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


# ─── Channel Views ─────────────────────────────────────────────────────────────

class ChannelListView(generics.ListAPIView):
    """GET /api/communication/channels — list channels user can see."""
    permission_classes = [IsAuthenticated]
    serializer_class = ChannelSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["channel_type", "visibility", "branch", "semester"]
    search_fields = ["name", "description", "subject_name"]
    ordering = ["-last_message_at", "name"]

    def get_queryset(self):
        user = self.request.user
        qs = Channel.objects.filter(is_active=True, is_archived=False)
        # Admin sees all
        if user.role in ("admin", "super_admin"):
            return qs
        # Public channels + channels user is member of
        return qs.filter(
            Q(visibility="public") |
            Q(memberships__user=user, memberships__is_banned=False)
        ).distinct()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class ChannelDetailView(APIView):
    """GET /api/communication/channels/<slug>"""
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        try:
            channel = Channel.objects.get(slug=slug, is_active=True)
        except Channel.DoesNotExist:
            return err("Channel not found.", 404)
        return ok(ChannelSerializer(channel, context={"request": request}).data)


class ChannelCreateView(APIView):
    """POST /api/communication/channels — create a channel."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def post(self, request):
        s = ChannelCreateSerializer(data=request.data, context={"request": request})
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        channel = s.save()
        # Auto-join creator as owner
        ChannelMembership.objects.create(channel=channel, user=request.user, role="owner")
        channel.member_count = 1
        channel.save(update_fields=["member_count"])
        try:
            from apps.audit.utils import log_activity
            log_activity(request, "page_visit", "success", 201,
                         {"action": "channel_created", "channel": channel.name})
        except Exception:
            pass
        return ok(ChannelSerializer(channel, context={"request": request}).data,
                  "Channel created.", 201)


class ChannelJoinView(APIView):
    """POST /api/communication/channels/<slug>/join"""
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        try:
            channel = Channel.objects.get(slug=slug, is_active=True)
        except Channel.DoesNotExist:
            return err("Channel not found.", 404)
        if channel.visibility == "private" and request.user.role not in ("admin", "super_admin"):
            return err("This channel is private. Request an invite.", 403)
        membership, created = ChannelMembership.objects.get_or_create(
            channel=channel, user=request.user,
            defaults={"role": "member"}
        )
        if membership.is_banned:
            return err("You are banned from this channel.", 403)
        if not created:
            return ok(message="Already a member.")
        channel.member_count = channel.memberships.filter(is_banned=False).count()
        channel.save(update_fields=["member_count"])
        return ok(message="Joined channel.")


class ChannelLeaveView(APIView):
    """POST /api/communication/channels/<slug>/leave"""
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        try:
            channel = Channel.objects.get(slug=slug, is_active=True)
        except Channel.DoesNotExist:
            return err("Channel not found.", 404)
        deleted, _ = ChannelMembership.objects.filter(
            channel=channel, user=request.user
        ).delete()
        if deleted:
            channel.member_count = channel.memberships.filter(is_banned=False).count()
            channel.save(update_fields=["member_count"])
        return ok(message="Left channel.")


class ChannelMembersView(APIView):
    """GET /api/communication/channels/<slug>/members"""
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        try:
            channel = Channel.objects.get(slug=slug, is_active=True)
        except Channel.DoesNotExist:
            return err("Channel not found.", 404)
        members = channel.memberships.filter(is_banned=False).select_related("user")
        return ok(ChannelMembershipSerializer(members, many=True).data)


# ─── Message Views ─────────────────────────────────────────────────────────────

class ChannelMessagesView(APIView):
    """GET /api/communication/channels/<slug>/messages"""
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        try:
            channel = Channel.objects.get(slug=slug, is_active=True)
        except Channel.DoesNotExist:
            return err("Channel not found.", 404)
        before = request.query_params.get("before")
        limit = min(int(request.query_params.get("limit", 50)), 100)
        qs = Message.objects.filter(
            channel=channel, is_deleted=False, thread_parent__isnull=True
        ).select_related("sender", "reply_to__sender").order_by("-created_at")
        if before:
            qs = qs.filter(created_at__lt=before)
        messages = list(qs[:limit])
        messages.reverse()
        return ok(MessageSerializer(messages, many=True).data)


class MessageSendView(APIView):
    """POST /api/communication/messages — send a message."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        data = request.data.copy()
        s = MessageCreateSerializer(data=data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        msg = s.save(sender=request.user)
        # Update channel stats
        if msg.channel:
            msg.channel.message_count = (msg.channel.message_count or 0) + 1
            msg.channel.last_message_at = msg.created_at
            msg.channel.save(update_fields=["message_count", "last_message_at"])
        if msg.conversation:
            msg.conversation.message_count = (msg.conversation.message_count or 0) + 1
            msg.conversation.last_message_at = msg.created_at
            msg.conversation.last_message_preview = msg.content[:200]
            msg.conversation.save(update_fields=["message_count", "last_message_at", "last_message_preview"])
        # Update thread count
        if msg.thread_parent:
            msg.thread_parent.thread_reply_count = (msg.thread_parent.thread_reply_count or 0) + 1
            msg.thread_parent.save(update_fields=["thread_reply_count"])
        return ok(MessageSerializer(msg).data, "Message sent.", 201)


class MessageEditView(APIView):
    """PUT /api/communication/messages/<id>"""
    permission_classes = [IsAuthenticated]

    def put(self, request, pk):
        try:
            msg = Message.objects.get(pk=pk, sender=request.user, is_deleted=False)
        except Message.DoesNotExist:
            return err("Message not found.", 404)
        content = request.data.get("content", "").strip()
        if not content:
            return err("Content required.")
        msg.content = content
        msg.is_edited = True
        msg.edited_at = timezone.now()
        msg.save(update_fields=["content", "is_edited", "edited_at"])
        return ok(MessageSerializer(msg).data, "Message updated.")


class MessageDeleteView(APIView):
    """DELETE /api/communication/messages/<id>"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            msg = Message.objects.get(pk=pk, is_deleted=False)
        except Message.DoesNotExist:
            return err("Message not found.", 404)
        # Owner or admin/moderator can delete
        if msg.sender != request.user and request.user.role not in ("admin", "super_admin", "moderator"):
            return err("Permission denied.", 403)
        msg.is_deleted = True
        msg.deleted_at = timezone.now()
        msg.deleted_by = request.user
        msg.save(update_fields=["is_deleted", "deleted_at", "deleted_by"])
        return ok(message="Message deleted.")


class MessagePinView(APIView):
    """POST /api/communication/messages/<id>/pin"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            msg = Message.objects.get(pk=pk, is_deleted=False)
        except Message.DoesNotExist:
            return err("Message not found.", 404)
        msg.is_pinned = not msg.is_pinned
        msg.save(update_fields=["is_pinned"])
        if msg.channel:
            msg.channel.pinned_message_count = msg.channel.messages.filter(is_pinned=True).count()
            msg.channel.save(update_fields=["pinned_message_count"])
        return ok({"is_pinned": msg.is_pinned})


class MessageReactionView(APIView):
    """POST /api/communication/messages/<id>/react"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        emoji = request.data.get("emoji", "").strip()
        if not emoji:
            return err("Emoji required.")
        try:
            msg = Message.objects.get(pk=pk, is_deleted=False)
        except Message.DoesNotExist:
            return err("Message not found.", 404)
        reaction, created = MessageReaction.objects.get_or_create(
            message=msg, user=request.user, emoji=emoji
        )
        if not created:
            reaction.delete()
            msg.reaction_count = msg.reactions.count()
            msg.save(update_fields=["reaction_count"])
            return ok({"action": "removed"})
        msg.reaction_count = msg.reactions.count()
        msg.save(update_fields=["reaction_count"])
        return ok({"action": "added"})


class ThreadMessagesView(APIView):
    """GET /api/communication/messages/<id>/thread"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            parent = Message.objects.get(pk=pk, is_deleted=False)
        except Message.DoesNotExist:
            return err("Message not found.", 404)
        replies = Message.objects.filter(
            thread_parent=parent, is_deleted=False
        ).select_related("sender").order_by("created_at")
        return ok({
            "parent": MessageSerializer(parent).data,
            "replies": MessageSerializer(replies, many=True).data,
        })


class PinnedMessagesView(APIView):
    """GET /api/communication/channels/<slug>/pinned"""
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        try:
            channel = Channel.objects.get(slug=slug, is_active=True)
        except Channel.DoesNotExist:
            return err("Channel not found.", 404)
        pinned = Message.objects.filter(
            channel=channel, is_pinned=True, is_deleted=False
        ).select_related("sender").order_by("-created_at")
        return ok(MessageSerializer(pinned, many=True).data)


class MessageSearchView(APIView):
    """GET /api/communication/messages/search?q=&channel="""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get("q", "").strip()
        channel_slug = request.query_params.get("channel", "")
        if len(q) < 2:
            return err("Query must be at least 2 characters.")
        qs = Message.objects.filter(is_deleted=False, content__icontains=q)
        if channel_slug:
            qs = qs.filter(channel__slug=channel_slug)
        qs = qs.select_related("sender", "channel").order_by("-created_at")[:50]
        return ok(MessageSerializer(qs, many=True).data)


# ─── Direct Messages ───────────────────────────────────────────────────────────

class ConversationListView(APIView):
    """GET /api/communication/conversations"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conversations = DirectConversation.objects.filter(
            participants__user=request.user, is_active=True
        ).order_by("-last_message_at")
        return ok(DirectConversationSerializer(
            conversations, many=True, context={"request": request}
        ).data)


class ConversationCreateView(APIView):
    """POST /api/communication/conversations — start a DM."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        target_user_id = request.data.get("user_id")
        if not target_user_id:
            return err("user_id required.")
        try:
            target = User.objects.get(id=target_user_id, is_active=True)
        except User.DoesNotExist:
            return err("User not found.", 404)
        if target == request.user:
            return err("Cannot message yourself.")
        # Check if blocked
        if BlockedUser.objects.filter(
            Q(blocker=request.user, blocked=target) |
            Q(blocker=target, blocked=request.user)
        ).exists():
            return err("Cannot message this user.", 403)
        # Check existing conversation
        existing = DirectConversation.objects.filter(
            is_group=False, participants__user=request.user
        ).filter(participants__user=target).first()
        if existing:
            return ok(DirectConversationSerializer(
                existing, context={"request": request}
            ).data)
        # Create new
        conv = DirectConversation.objects.create(is_group=False)
        ConversationParticipant.objects.create(conversation=conv, user=request.user)
        ConversationParticipant.objects.create(conversation=conv, user=target)
        return ok(DirectConversationSerializer(
            conv, context={"request": request}
        ).data, "Conversation created.", 201)


class ConversationMessagesView(APIView):
    """GET /api/communication/conversations/<id>/messages"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            conv = DirectConversation.objects.get(pk=pk, participants__user=request.user)
        except DirectConversation.DoesNotExist:
            return err("Conversation not found.", 404)
        before = request.query_params.get("before")
        limit = min(int(request.query_params.get("limit", 50)), 100)
        qs = Message.objects.filter(
            conversation=conv, is_deleted=False
        ).select_related("sender").order_by("-created_at")
        if before:
            qs = qs.filter(created_at__lt=before)
        messages = list(qs[:limit])
        messages.reverse()
        return ok(MessageSerializer(messages, many=True).data)


# ─── Presence ──────────────────────────────────────────────────────────────────

class PresenceView(APIView):
    """GET /api/communication/presence — online users."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        channel_slug = request.query_params.get("channel")
        online = UserPresence.objects.filter(
            status__in=["online", "away", "busy"]
        ).select_related("user")
        if channel_slug:
            online = online.filter(
                user__channel_memberships__channel__slug=channel_slug
            )
        return ok(UserPresenceSerializer(online[:100], many=True).data)


class UpdatePresenceView(APIView):
    """POST /api/communication/presence/update"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        status_val = request.data.get("status", "online")
        custom = request.data.get("custom_status", "")
        presence, _ = UserPresence.objects.update_or_create(
            user=request.user,
            defaults={"status": status_val, "custom_status": custom}
        )
        return ok(UserPresenceSerializer(presence).data)


# ─── Moderation ────────────────────────────────────────────────────────────────

class ReportMessageView(APIView):
    """POST /api/communication/messages/<id>/report"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            msg = Message.objects.get(pk=pk, is_deleted=False)
        except Message.DoesNotExist:
            return err("Message not found.", 404)
        reason = request.data.get("reason", "other")
        description = request.data.get("description", "")
        report, created = MessageReport.objects.get_or_create(
            reporter=request.user, message=msg,
            defaults={"channel": msg.channel, "reason": reason, "description": description}
        )
        if not created:
            return err("Already reported.")
        return ok(MessageReportSerializer(report).data, "Report submitted.", 201)


class ModerationMuteView(APIView):
    """POST /api/communication/channels/<slug>/mute/<user_id>"""
    permission_classes = [IsAuthenticated, IsModeratorOrAdmin]

    def post(self, request, slug, user_id):
        try:
            channel = Channel.objects.get(slug=slug)
            membership = ChannelMembership.objects.get(channel=channel, user_id=user_id)
        except (Channel.DoesNotExist, ChannelMembership.DoesNotExist):
            return err("Not found.", 404)
        duration = int(request.data.get("duration_minutes", 60))
        membership.is_muted = True
        membership.muted_until = timezone.now() + timezone.timedelta(minutes=duration)
        membership.save(update_fields=["is_muted", "muted_until"])
        ModerationAction.objects.create(
            moderator=request.user, channel=channel, target_user_id=user_id,
            action="mute", reason=request.data.get("reason", ""),
            duration_minutes=duration
        )
        return ok(message="User muted.")


class ModerationBanView(APIView):
    """POST /api/communication/channels/<slug>/ban/<user_id>"""
    permission_classes = [IsAuthenticated, IsModeratorOrAdmin]

    def post(self, request, slug, user_id):
        try:
            channel = Channel.objects.get(slug=slug)
            membership = ChannelMembership.objects.get(channel=channel, user_id=user_id)
        except (Channel.DoesNotExist, ChannelMembership.DoesNotExist):
            return err("Not found.", 404)
        membership.is_banned = True
        membership.banned_reason = request.data.get("reason", "")
        membership.save(update_fields=["is_banned", "banned_reason"])
        channel.member_count = channel.memberships.filter(is_banned=False).count()
        channel.save(update_fields=["member_count"])
        ModerationAction.objects.create(
            moderator=request.user, channel=channel, target_user_id=user_id,
            action="ban", reason=request.data.get("reason", "")
        )
        return ok(message="User banned from channel.")


# ─── Block Users ───────────────────────────────────────────────────────────────

class BlockUserView(APIView):
    """POST /api/communication/block"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user_id = request.data.get("user_id")
        if not user_id:
            return err("user_id required.")
        try:
            target = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return err("User not found.", 404)
        BlockedUser.objects.get_or_create(
            blocker=request.user, blocked=target,
            defaults={"reason": request.data.get("reason", "")}
        )
        return ok(message="User blocked.")

    def delete(self, request):
        user_id = request.data.get("user_id")
        BlockedUser.objects.filter(blocker=request.user, blocked_id=user_id).delete()
        return ok(message="User unblocked.")


class BlockedUsersListView(APIView):
    """GET /api/communication/blocked"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        blocked = BlockedUser.objects.filter(blocker=request.user).select_related("blocked")
        return ok(BlockedUserSerializer(blocked, many=True).data)


# ─── Admin Communication Views ────────────────────────────────────────────────

class AdminChannelListView(generics.ListAPIView):
    """GET /api/admin/communication/channels — all channels."""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = ChannelSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["channel_type", "visibility", "is_active", "is_archived"]
    search_fields = ["name", "description"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Channel.objects.all()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class AdminAllMessagesView(generics.ListAPIView):
    """GET /api/admin/communication/messages — all messages (audit mode)."""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = MessageSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["channel", "sender", "message_type", "is_pinned", "is_deleted"]
    search_fields = ["content", "sender__full_name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Message.objects.select_related("sender", "channel").all()


class AdminDMListView(generics.ListAPIView):
    """GET /api/admin/communication/dms — all DM conversations."""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = DirectConversationSerializer
    ordering = ["-last_message_at"]

    def get_queryset(self):
        return DirectConversation.objects.all()

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class AdminReportsView(generics.ListAPIView):
    """GET /api/admin/communication/reports — all message reports."""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = MessageReportSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "reason"]
    search_fields = ["description", "reporter__full_name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return MessageReport.objects.select_related("reporter", "message", "channel").all()


class AdminResolveReportView(APIView):
    """POST /api/admin/communication/reports/<id>/resolve"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            report = MessageReport.objects.get(pk=pk)
        except MessageReport.DoesNotExist:
            return err("Report not found.", 404)
        action = request.data.get("action", "resolved")  # resolved or dismissed
        report.status = action
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.resolution_note = request.data.get("note", "")
        report.save(update_fields=["status", "reviewed_by", "reviewed_at", "resolution_note"])
        return ok(MessageReportSerializer(report).data, "Report resolved.")


class AdminModerationLogView(generics.ListAPIView):
    """GET /api/admin/communication/moderation-log"""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = ModerationActionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["action", "channel"]
    search_fields = ["reason"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return ModerationAction.objects.select_related("moderator", "target_user", "channel").all()


class AdminOnlineUsersView(APIView):
    """GET /api/admin/communication/online-users"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        online = UserPresence.objects.filter(
            status__in=["online", "away", "busy"]
        ).select_related("user").order_by("-last_seen")
        return ok(UserPresenceSerializer(online, many=True).data)


class AdminCommStatsView(APIView):
    """GET /api/admin/communication/stats"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from datetime import timedelta
        now = timezone.now()
        d7 = now - timedelta(days=7)
        return ok({
            "total_channels": Channel.objects.filter(is_active=True).count(),
            "total_messages": Message.objects.count(),
            "messages_7d": Message.objects.filter(created_at__gte=d7).count(),
            "total_dms": DirectConversation.objects.count(),
            "online_users": UserPresence.objects.filter(status="online").count(),
            "pending_reports": MessageReport.objects.filter(status="pending").count(),
            "banned_users": ChannelMembership.objects.filter(is_banned=True).values("user").distinct().count(),
            "muted_users": ChannelMembership.objects.filter(is_muted=True).values("user").distinct().count(),
            "pending_channel_requests": ChannelRequest.objects.filter(status="pending").count(),
        })


# ─── Channel Request Views ─────────────────────────────────────────────────────

class ChannelRequestCreateView(APIView):
    """POST /api/communication/channels/request — student requests a new channel."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from .models import ChannelRequest
        name = request.data.get("name", "").strip()
        if not name or len(name) < 3:
            return err("Channel name must be at least 3 characters.")
        if len(name) > 100:
            return err("Channel name too long.")

        # Check for duplicate pending requests
        if ChannelRequest.objects.filter(
            requested_by=request.user, name__iexact=name, status="pending"
        ).exists():
            return err("You already have a pending request for this channel name.")

        channel_request = ChannelRequest.objects.create(
            requested_by=request.user,
            name=name,
            description=request.data.get("description", ""),
            channel_type=request.data.get("channel_type", "general"),
            visibility=request.data.get("visibility", "public"),
            purpose=request.data.get("purpose", ""),
            rules=request.data.get("rules", ""),
            branch=request.data.get("branch", ""),
            semester=request.data.get("semester"),
            section=request.data.get("section", ""),
        )

        # Notify admins
        try:
            from apps.notifications.services import create_admin_alert
            create_admin_alert(
                "system_event", "info",
                f"Channel request: #{name}",
                f"{request.user.full_name} requested a new channel",
                user=request.user,
                metadata={"request_id": str(channel_request.id)},
            )
        except Exception:
            pass

        return ok({
            "id": str(channel_request.id),
            "name": channel_request.name,
            "status": channel_request.status,
        }, "Channel request submitted for review.", 201)


class ChannelRequestListView(APIView):
    """GET /api/communication/channels/requests — user's own requests."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import ChannelRequest
        requests = ChannelRequest.objects.filter(
            requested_by=request.user
        ).order_by("-created_at")[:20]
        data = [
            {
                "id": str(r.id),
                "name": r.name,
                "channel_type": r.channel_type,
                "visibility": r.visibility,
                "status": r.status,
                "review_notes": r.review_notes,
                "rejection_reason": r.rejection_reason,
                "created_at": r.created_at.isoformat(),
            }
            for r in requests
        ]
        return ok(data)


class AdminChannelRequestQueueView(APIView):
    """GET /api/admin/communication/channel-requests — pending requests for review."""
    permission_classes = [IsAuthenticated, IsModeratorOrAdmin]

    def get(self, request):
        from .models import ChannelRequest
        status_filter = request.query_params.get("status", "pending")
        qs = ChannelRequest.objects.select_related("requested_by")
        if status_filter != "all":
            qs = qs.filter(status=status_filter)
        qs = qs.order_by("-created_at")[:50]
        data = [
            {
                "id": str(r.id),
                "name": r.name,
                "description": r.description,
                "channel_type": r.channel_type,
                "visibility": r.visibility,
                "purpose": r.purpose,
                "rules": r.rules,
                "branch": r.branch,
                "semester": r.semester,
                "section": r.section,
                "status": r.status,
                "requested_by_name": r.requested_by.full_name,
                "requested_by_email": r.requested_by.email,
                "requested_by_role": r.requested_by.role,
                "created_at": r.created_at.isoformat(),
            }
            for r in qs
        ]
        return ok(data)


class AdminChannelRequestReviewView(APIView):
    """POST /api/admin/communication/channel-requests/<id>/review — approve/reject."""
    permission_classes = [IsAuthenticated, IsModeratorOrAdmin]

    def post(self, request, pk):
        from .models import ChannelRequest
        from django.utils.text import slugify

        try:
            channel_request = ChannelRequest.objects.get(pk=pk)
        except ChannelRequest.DoesNotExist:
            return err("Request not found.", 404)

        action = request.data.get("action")
        if action not in ("approve", "reject", "needs_changes"):
            return err("Action must be 'approve', 'reject', or 'needs_changes'.")

        notes = request.data.get("notes", "")

        if action == "approve":
            # Create the channel
            base_slug = slugify(channel_request.name)[:110]
            slug = base_slug
            n = 1
            while Channel.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{n}"
                n += 1

            channel = Channel.objects.create(
                name=channel_request.name,
                slug=slug,
                description=channel_request.description,
                channel_type=channel_request.channel_type,
                visibility=channel_request.visibility,
                branch=channel_request.branch,
                semester=channel_request.semester,
                section=channel_request.section,
                created_by=channel_request.requested_by,
            )
            # Add requester as owner
            ChannelMembership.objects.create(
                channel=channel, user=channel_request.requested_by, role="owner"
            )
            channel.member_count = 1
            channel.save(update_fields=["member_count"])

            channel_request.status = "approved"
            channel_request.created_channel = channel
            channel_request.review_notes = notes

        elif action == "reject":
            channel_request.status = "rejected"
            channel_request.rejection_reason = notes or "Does not meet guidelines."
            channel_request.review_notes = notes

        elif action == "needs_changes":
            channel_request.status = "needs_changes"
            channel_request.review_notes = notes

        channel_request.reviewed_by = request.user
        channel_request.reviewed_at = timezone.now()
        channel_request.save()

        # Notify the requester
        try:
            from apps.notifications.services import create_user_notification
            status_msg = {
                "approve": f"Your channel request '#{channel_request.name}' has been approved!",
                "reject": f"Your channel request '#{channel_request.name}' was rejected: {channel_request.rejection_reason}",
                "needs_changes": f"Your channel request '#{channel_request.name}' needs changes: {notes}",
            }
            create_user_notification(
                channel_request.requested_by, "system",
                f"Channel Request: {channel_request.name}",
                status_msg[action],
                priority="high" if action == "approve" else "normal",
            )
        except Exception:
            pass

        return ok({"status": channel_request.status}, f"Request {action}d.")
