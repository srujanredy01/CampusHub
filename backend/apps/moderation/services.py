"""
Moderation Services — business logic for moderation actions,
real-time notifications, and integration with other apps.
"""
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import F
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


def log_moderation_action(moderator, action, target_type="", target_id=None,
                          target_user=None, reason="", details=None, request=None,
                          is_automated=False):
    """Create immutable moderation action log and update moderator stats."""
    from .models import ModerationActionLog, ModeratorProfile

    ip = None
    if request:
        ip = (
            request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
            or request.META.get("REMOTE_ADDR")
        )

    ModerationActionLog.objects.create(
        moderator=moderator,
        action=action,
        target_type=target_type,
        target_id=target_id,
        target_user=target_user,
        reason=reason,
        details=details or {},
        ip_address=ip,
        is_automated=is_automated,
    )

    # Update moderator stats
    if moderator:
        profile = getattr(moderator, "moderator_profile", None)
        if profile:
            profile.total_actions = F("total_actions") + 1
            if "approved" in action:
                profile.total_approvals = F("total_approvals") + 1
            elif "rejected" in action:
                profile.total_rejections = F("total_rejections") + 1
            elif "warned" in action:
                profile.total_warnings_issued = F("total_warnings_issued") + 1
            elif "banned" in action or "suspended" in action:
                profile.total_bans_issued = F("total_bans_issued") + 1
            profile.save()


def notify_moderators_realtime(event_type, data):
    """Push real-time event to all connected moderators."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "moderators_all",
            {"type": event_type, "data": data},
        )
    except Exception as e:
        logger.warning("Failed to send moderator notification: %s", e)


def notify_user_realtime(user_id, event_type, data):
    """Push real-time notification to a specific user."""
    try:
        from apps.notifications.services import create_user_notification
        create_user_notification(
            user_id=user_id,
            notification_type="moderation",
            title=data.get("title", "Moderation Notice"),
            message=data.get("message", ""),
            priority=data.get("priority", "high"),
            metadata=data.get("metadata", {}),
        )
    except Exception as e:
        logger.warning("Failed to notify user %s: %s", user_id, e)


def add_moderators_to_channel(channel):
    """
    Automatically add all active moderators to a channel.
    Moderators cannot be removed by students.
    """
    from django.contrib.auth import get_user_model
    from apps.communication.models import ChannelMembership

    User = get_user_model()
    moderators = User.objects.filter(
        role__in=("moderator", "admin", "super_admin"), is_active=True
    )

    for mod in moderators:
        ChannelMembership.objects.get_or_create(
            channel=channel,
            user=mod,
            defaults={"role": "moderator"},
        )

    logger.info("Added %d moderators to channel %s", moderators.count(), channel.name)


def process_roadmap_submission(roadmap):
    """Handle roadmap submission — create approval request and notify moderators."""
    from .models import ApprovalRequest

    # Create approval request
    ApprovalRequest.objects.get_or_create(
        request_type="roadmap",
        content_id=roadmap.id,
        defaults={
            "title": roadmap.title,
            "description": roadmap.description[:500],
            "requested_by": roadmap.created_by,
            "metadata": {
                "category": roadmap.category,
                "difficulty": roadmap.difficulty,
                "total_steps": roadmap.total_steps,
                "slug": roadmap.slug,
            },
        },
    )

    # Notify moderators in real-time
    notify_moderators_realtime("roadmap_submitted", {
        "roadmap_id": str(roadmap.id),
        "title": roadmap.title,
        "creator": roadmap.created_by.full_name if roadmap.created_by else "",
        "category": roadmap.category,
        "difficulty": roadmap.difficulty,
        "steps_count": roadmap.total_steps,
        "submitted_at": timezone.now().isoformat(),
    })


def process_channel_request(channel_request):
    """Handle channel request — notify moderators in real-time."""
    notify_moderators_realtime("channel_requested", {
        "request_id": str(channel_request.id),
        "name": channel_request.name,
        "channel_type": channel_request.channel_type,
        "requested_by": channel_request.requested_by.full_name,
        "branch": channel_request.branch,
        "created_at": channel_request.created_at.isoformat(),
    })


def get_user_moderation_history(user):
    """Get complete moderation history for a user."""
    from .models import UserWarning, UserBan, UserMute, UserViolation, ModerationActionLog

    warnings = UserWarning.objects.filter(user=user).order_by("-created_at")[:20]
    bans = UserBan.objects.filter(user=user).order_by("-created_at")[:10]
    mutes = UserMute.objects.filter(user=user).order_by("-created_at")[:10]
    violations = UserViolation.objects.filter(user=user).order_by("-created_at")[:30]
    actions = ModerationActionLog.objects.filter(target_user=user).order_by("-created_at")[:30]

    return {
        "warnings": [
            {
                "id": str(w.id),
                "reason": w.reason,
                "severity": w.severity,
                "source": w.source,
                "issued_by": w.issued_by.full_name if w.issued_by else "System",
                "is_acknowledged": w.is_acknowledged,
                "created_at": w.created_at.isoformat(),
            }
            for w in warnings
        ],
        "bans": [
            {
                "id": str(b.id),
                "ban_type": b.ban_type,
                "scope": b.scope,
                "reason": b.reason,
                "is_active": b.is_active,
                "starts_at": b.starts_at.isoformat(),
                "expires_at": b.expires_at.isoformat() if b.expires_at else None,
                "banned_by": b.banned_by.full_name if b.banned_by else "System",
                "created_at": b.created_at.isoformat(),
            }
            for b in bans
        ],
        "mutes": [
            {
                "id": str(m.id),
                "reason": m.reason,
                "is_active": m.is_active,
                "expires_at": m.expires_at.isoformat(),
                "is_automated": m.is_automated,
                "created_at": m.created_at.isoformat(),
            }
            for m in mutes
        ],
        "violations": [
            {
                "id": str(v.id),
                "type": v.violation_type,
                "content_snapshot": v.content_snapshot[:100],
                "action_taken": v.action_taken,
                "created_at": v.created_at.isoformat(),
            }
            for v in violations
        ],
        "total_warnings": UserWarning.objects.filter(user=user).count(),
        "total_bans": UserBan.objects.filter(user=user).count(),
        "total_mutes": UserMute.objects.filter(user=user).count(),
        "total_violations": UserViolation.objects.filter(user=user).count(),
    }
