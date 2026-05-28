"""
Auto-Moderation Engine for CampusHub.
Real-time content filtering, violation detection, and escalation logic.
"""
import re
import logging
from datetime import timedelta
from django.utils import timezone
from django.db.models import Count
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


# Default prohibited words (configurable via AutoModerationRule)
DEFAULT_PROHIBITED_WORDS = [
    # Placeholder — actual words loaded from DB rules
]


class AutoModerationEngine:
    """
    Processes messages in real-time for content violations.
    Returns moderation result with action to take.
    """

    def __init__(self):
        self._rules_cache = None
        self._rules_loaded_at = None
        self._cache_ttl = 300  # 5 minutes

    def _load_rules(self):
        """Load active rules from DB with caching."""
        now = timezone.now()
        if (
            self._rules_cache is not None
            and self._rules_loaded_at
            and (now - self._rules_loaded_at).total_seconds() < self._cache_ttl
        ):
            return self._rules_cache

        from .models import AutoModerationRule
        self._rules_cache = list(
            AutoModerationRule.objects.filter(is_active=True)
        )
        self._rules_loaded_at = now
        return self._rules_cache

    def check_message(self, content, user, channel_id=None, context="channel"):
        """
        Check a message against all active rules.
        Returns: {
            "allowed": bool,
            "violations": [{"rule_type": ..., "matched": ..., "action": ...}],
            "action": "allow" | "delete" | "warn" | "mute" | "flag" | "block"
        }
        """
        if not content or not content.strip():
            return {"allowed": True, "violations": [], "action": "allow"}

        # Exempt roles skip auto-moderation
        if user.role in ("admin", "super_admin", "moderator"):
            return {"allowed": True, "violations": [], "action": "allow"}

        rules = self._load_rules()
        violations = []
        highest_action = "allow"
        action_priority = {"allow": 0, "flag": 1, "warn": 2, "delete": 3, "mute": 4, "block": 5}

        for rule in rules:
            # Check context applicability
            if context == "channel" and not rule.applies_to_channels:
                continue
            if context == "group" and not rule.applies_to_groups:
                continue
            if context == "dm" and not rule.applies_to_dms:
                continue

            # Check role exemptions
            if user.role in (rule.exempt_roles or []):
                continue

            match = self._check_rule(rule, content)
            if match:
                violations.append({
                    "rule_id": str(rule.id),
                    "rule_type": rule.rule_type,
                    "rule_name": rule.name,
                    "matched": match,
                    "action": rule.action,
                    "severity": rule.severity,
                })
                if action_priority.get(rule.action, 0) > action_priority.get(highest_action, 0):
                    highest_action = rule.action

        allowed = highest_action in ("allow", "flag")
        return {
            "allowed": allowed,
            "violations": violations,
            "action": highest_action,
        }

    def _check_rule(self, rule, content):
        """Check a single rule against content. Returns matched text or None."""
        content_lower = content.lower()

        if rule.rule_type == "keyword":
            keywords = [k.strip().lower() for k in rule.pattern.split(",") if k.strip()]
            for kw in keywords:
                if kw in content_lower:
                    return kw
            return None

        elif rule.rule_type == "regex":
            try:
                match = re.search(rule.pattern, content, re.IGNORECASE)
                return match.group(0) if match else None
            except re.error:
                return None

        elif rule.rule_type == "caps_filter":
            # Flag if >70% uppercase and message is longer than 10 chars
            if len(content) > 10:
                upper_count = sum(1 for c in content if c.isupper())
                ratio = upper_count / len(content)
                threshold = float(rule.pattern) if rule.pattern else 0.7
                if ratio > threshold:
                    return f"caps_ratio:{ratio:.2f}"
            return None

        elif rule.rule_type == "link_filter":
            # Detect URLs
            url_pattern = r'https?://[^\s<>\"\']+|www\.[^\s<>\"\']+' 
            urls = re.findall(url_pattern, content)
            if urls:
                blocked_domains = [d.strip().lower() for d in rule.pattern.split(",") if d.strip()]
                if not blocked_domains:
                    return None  # No blocked domains = allow all links
                for url in urls:
                    for domain in blocked_domains:
                        if domain in url.lower():
                            return url
            return None

        elif rule.rule_type == "mention_limit":
            # Count @mentions
            mentions = re.findall(r'@\w+', content)
            limit = int(rule.pattern) if rule.pattern.isdigit() else 5
            if len(mentions) > limit:
                return f"mentions:{len(mentions)}"
            return None

        return None

    def record_violation(self, user, violation_type, content, channel_id=None, message_id=None):
        """Record a violation and return the escalation action."""
        from .models import UserViolation, AutoModerationLog
        UserViolation.objects.create(
            user=user,
            violation_type=violation_type,
            content_snapshot=content[:500],
            channel_id=channel_id,
            message_id=message_id,
            detected_by="auto",
        )
        return self.check_escalation(user)

    def check_escalation(self, user):
        """
        Check if user should be escalated based on violation history.
        Returns: "warning" | "mute" | "suspend" | "ban" | None
        """
        from .models import UserViolation, UserWarning, UserMute, UserBan, EscalationConfig

        config = EscalationConfig.objects.filter(is_active=True).first()
        if not config:
            # Default escalation thresholds
            warnings_before_mute = 3
            mutes_before_suspend = 3
            suspensions_before_ban = 3
            window_hours = 168
            mute_duration = 60
            suspend_hours = 24
        else:
            warnings_before_mute = config.warnings_before_mute
            mutes_before_suspend = config.mutes_before_suspend
            suspensions_before_ban = config.suspensions_before_ban
            window_hours = config.violation_window_hours
            mute_duration = config.mute_duration_minutes
            suspend_hours = config.suspend_duration_hours

        window_start = timezone.now() - timedelta(hours=window_hours)

        # Count active warnings in window
        active_warnings = UserWarning.objects.filter(
            user=user, is_active=True, created_at__gte=window_start
        ).count()

        # Count active mutes in window
        active_mutes = UserMute.objects.filter(
            user=user, created_at__gte=window_start
        ).count()

        # Count suspensions (temporary bans) in window
        suspensions = UserBan.objects.filter(
            user=user, ban_type="temporary", scope="platform",
            created_at__gte=window_start
        ).count()

        if suspensions >= suspensions_before_ban:
            return {"action": "ban", "reason": "Repeated suspensions exceeded threshold"}
        elif active_mutes >= mutes_before_suspend:
            return {"action": "suspend", "duration_hours": suspend_hours}
        elif active_warnings >= warnings_before_mute:
            return {"action": "mute", "duration_minutes": mute_duration}
        else:
            return {"action": "warning"}

    def apply_escalation(self, user, escalation_result, reason="Auto-moderation violation"):
        """Apply the escalation action to the user."""
        from .models import UserWarning, UserMute, UserBan, ModerationActionLog

        action = escalation_result["action"]

        if action == "warning":
            warning = UserWarning.objects.create(
                user=user,
                issued_by=None,
                reason=reason,
                severity="mild",
                source="auto",
            )
            ModerationActionLog.objects.create(
                moderator=None,
                action="auto_warning",
                target_type="User",
                target_id=user.id,
                target_user=user,
                reason=reason,
                is_automated=True,
            )
            self._notify_moderators("auto_warning", user, reason)
            return {"type": "warning", "id": str(warning.id)}

        elif action == "mute":
            duration = escalation_result.get("duration_minutes", 60)
            mute = UserMute.objects.create(
                user=user,
                muted_by=None,
                reason=reason,
                is_automated=True,
                expires_at=timezone.now() + timedelta(minutes=duration),
            )
            ModerationActionLog.objects.create(
                moderator=None,
                action="auto_mute",
                target_type="User",
                target_id=user.id,
                target_user=user,
                reason=reason,
                details={"duration_minutes": duration},
                is_automated=True,
            )
            self._notify_moderators("auto_mute", user, reason)
            return {"type": "mute", "id": str(mute.id), "duration": duration}

        elif action == "suspend":
            duration_hours = escalation_result.get("duration_hours", 24)
            ban = UserBan.objects.create(
                user=user,
                banned_by=None,
                ban_type="temporary",
                scope="platform",
                reason=reason,
                is_automated=True,
                expires_at=timezone.now() + timedelta(hours=duration_hours),
            )
            ModerationActionLog.objects.create(
                moderator=None,
                action="auto_suspend",
                target_type="User",
                target_id=user.id,
                target_user=user,
                reason=reason,
                details={"duration_hours": duration_hours},
                is_automated=True,
            )
            self._notify_moderators("auto_suspend", user, reason)
            return {"type": "suspend", "id": str(ban.id), "duration_hours": duration_hours}

        elif action == "ban":
            ban = UserBan.objects.create(
                user=user,
                banned_by=None,
                ban_type="permanent",
                scope="platform",
                reason=escalation_result.get("reason", reason),
                is_automated=True,
            )
            ModerationActionLog.objects.create(
                moderator=None,
                action="user_banned",
                target_type="User",
                target_id=user.id,
                target_user=user,
                reason=reason,
                is_automated=True,
            )
            self._notify_moderators("auto_ban", user, reason)
            return {"type": "ban", "id": str(ban.id)}

        return None

    def _notify_moderators(self, event_type, user, reason):
        """Send real-time notification to all connected moderators."""
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "moderators_all",
                {
                    "type": "moderation_alert",
                    "data": {
                        "event": event_type,
                        "user_id": str(user.id),
                        "user_name": user.full_name,
                        "reason": reason,
                        "timestamp": timezone.now().isoformat(),
                    },
                },
            )
        except Exception as e:
            logger.warning("Failed to notify moderators: %s", e)

    def check_duplicate_message(self, user, content, channel_id, window_seconds=30):
        """Check if user is sending duplicate messages (spam detection)."""
        from apps.communication.models import Message
        window_start = timezone.now() - timedelta(seconds=window_seconds)
        recent_same = Message.objects.filter(
            sender=user,
            channel_id=channel_id,
            content=content,
            created_at__gte=window_start,
            is_deleted=False,
        ).count()
        return recent_same > 0

    def check_rate_limit(self, user, channel_id, max_messages=10, window_seconds=60):
        """Check if user is exceeding message rate limit."""
        from apps.communication.models import Message
        window_start = timezone.now() - timedelta(seconds=window_seconds)
        count = Message.objects.filter(
            sender=user,
            channel_id=channel_id,
            created_at__gte=window_start,
            is_deleted=False,
        ).count()
        return count >= max_messages

    def is_user_muted(self, user, channel_id=None):
        """Check if user is currently muted."""
        from .models import UserMute
        now = timezone.now()
        query = UserMute.objects.filter(user=user, is_active=True, expires_at__gt=now)
        if channel_id:
            from django.db.models import Q
            query = query.filter(Q(channel_id=channel_id) | Q(channel_id__isnull=True))
        return query.exists()

    def is_user_banned(self, user, scope="platform"):
        """Check if user has an active ban for the given scope."""
        from .models import UserBan
        from django.db.models import Q
        now = timezone.now()
        return UserBan.objects.filter(
            Q(user=user, is_active=True, scope=scope) &
            (Q(ban_type="permanent") | Q(expires_at__gt=now))
        ).exists()


# Singleton instance
moderation_engine = AutoModerationEngine()
