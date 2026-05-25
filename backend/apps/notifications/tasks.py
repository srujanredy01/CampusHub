"""
Notification service functions for CampusHub.
"""

import logging
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


def _recipient_queryset(campaign):
    from django.contrib.auth import get_user_model

    user_model = get_user_model()
    recipients = user_model.objects.filter(is_active=True, role="student")
    if campaign.target_branch:
        recipients = recipients.filter(branch=campaign.target_branch)
    if campaign.target_semester:
        recipients = recipients.filter(semester=campaign.target_semester)
    return recipients


def dispatch_scheduled_notification(campaign_id):
    """Deliver a scheduled notification campaign to target students."""
    try:
        from django.utils import timezone
        from .models import Notification, ScheduledNotification
        from .services import _push_user_notification

        campaign = ScheduledNotification.objects.get(pk=campaign_id)
        if campaign.status not in {"approved", "scheduled"}:
            return 0

        recipients = _recipient_queryset(campaign)
        notifications = [
            Notification(
                user=recipient,
                notification_type=campaign.notification_type,
                title=campaign.title,
                message=campaign.message,
                priority=getattr(campaign, "priority", "normal") or "normal",
                metadata={**campaign.metadata, "campaign_id": str(campaign.id)},
            )
            for recipient in recipients
        ]
        created = Notification.objects.bulk_create(notifications, batch_size=500)

        # Push via WebSocket to each user
        for notification in created:
            try:
                _push_user_notification(notification.user, notification)
            except Exception:
                pass

        campaign.status = "sent"
        campaign.sent_at = timezone.now()
        campaign.sent_count = len(created)
        campaign.save(update_fields=["status", "sent_at", "sent_count", "updated_at"])
        return len(created)
    except Exception as exc:
        logger.exception("Failed to dispatch scheduled notification %s", campaign_id)
        raise


def send_verification_email(user_id):
    """Send email verification link to a new user."""
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(id=user_id)

        verification_url = (
            f"{settings.FRONTEND_URL}/verify-email?token={user.email_verification_token}"
        )

        subject = "Verify your CampusHub account"
        message = (
            f"Hi {user.full_name},\n\n"
            f"Please verify your email by clicking the link below:\n"
            f"{verification_url}\n\n"
            f"This link expires in 24 hours.\n\n"
            f"If you didn't create an account, please ignore this email.\n\n"
            f"CampusHub Team"
        )

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info("Verification email sent to %s", user.email)
    except Exception as exc:
        logger.error("Failed to send verification email to user %s: %s", user_id, exc)


def send_password_reset_email(user_id):
    """Send password reset email."""
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        user = User.objects.get(id=user_id)

        reset_url = (
            f"{settings.FRONTEND_URL}/reset-password?token={user.password_reset_token}"
        )

        subject = "Reset your CampusHub password"
        message = (
            f"Hi {user.full_name},\n\n"
            f"You requested a password reset. Click the link below:\n"
            f"{reset_url}\n\n"
            f"This link expires in 1 hour.\n\n"
            f"If you didn't request this, please ignore this email.\n\n"
            f"CampusHub Team"
        )

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        logger.info("Password reset email sent to %s", user.email)
    except Exception as exc:
        logger.error("Failed to send password reset email to user %s: %s", user_id, exc)


def send_news_notification(news_id):
    """Create in-app notifications for all active students when news is published."""
    try:
        from apps.news.models import NewsAnnouncement
        from apps.notifications.models import Notification
        from apps.notifications.services import _push_user_notification
        from apps.notifications.signals import admin_news_published
        from django.contrib.auth import get_user_model

        User = get_user_model()
        news = NewsAnnouncement.objects.get(id=news_id)

        # Target users
        users = User.objects.filter(is_active=True, role="student")
        if news.target_branch:
            users = users.filter(branch=news.target_branch)

        # Bulk create notifications
        notifications = [
            Notification(
                user=user,
                notification_type="campus_news",
                title=f"New Announcement: {news.title}",
                message=news.content[:200],
                metadata={"news_id": str(news_id), "category": news.category},
            )
            for user in users
        ]
        created = Notification.objects.bulk_create(notifications, batch_size=500)

        # Push via WebSocket
        for notification in created:
            try:
                _push_user_notification(notification.user, notification)
            except Exception:
                pass

        # Fire signal for admin alert
        admin_news_published.send(sender=None, news_title=news.title, news_id=news_id)

        logger.info("Created %d notifications for news %s", len(created), news_id)
    except Exception as exc:
        logger.error("Failed to send news notifications for %s: %s", news_id, exc)


def send_resource_notification(resource_id):
    """Notify students when a new resource is uploaded."""
    try:
        from apps.resources.models import Resource
        from apps.notifications.models import Notification
        from apps.notifications.services import _push_user_notification
        from apps.notifications.signals import admin_resource_published
        from django.contrib.auth import get_user_model

        User = get_user_model()
        resource = Resource.objects.get(id=resource_id)

        users = User.objects.filter(
            is_active=True,
            role="student",
            branch=resource.branch,
        )

        notifications = [
            Notification(
                user=user,
                notification_type="new_resource",
                title=f"New Resource: {resource.title}",
                message=f"A new {resource.file_type} has been uploaded for {resource.subject} (Sem {resource.semester})",
                metadata={"resource_id": str(resource_id), "subject": resource.subject},
            )
            for user in users
        ]
        created = Notification.objects.bulk_create(notifications, batch_size=500)

        # Push via WebSocket
        for notification in created:
            try:
                _push_user_notification(notification.user, notification)
            except Exception:
                pass

        # Fire signal for admin alert
        admin_resource_published.send(
            sender=None,
            resource_title=resource.title,
            resource_id=resource_id,
            branch=resource.branch,
            semester=resource.semester,
        )

        logger.info("Created %d notifications for resource %s", len(created), resource_id)
    except Exception as exc:
        logger.error("Failed to send resource notifications for %s: %s", resource_id, exc)


def send_coding_reminders():
    """Send daily coding reminders to students who haven't solved a question today."""
    from apps.notifications.models import Notification
    from apps.coding.models import Submission
    from django.contrib.auth import get_user_model
    from django.utils import timezone

    User = get_user_model()
    today = timezone.now().date()

    # Find students who haven't submitted today
    active_students = User.objects.filter(is_active=True, role="student")
    students_submitted_today = Submission.objects.filter(
        created_at__date=today
    ).values_list("user_id", flat=True).distinct()

    inactive_students = active_students.exclude(id__in=students_submitted_today)

    notifications = [
        Notification(
            user=student,
            notification_type="coding_reminder",
            title="Daily Coding Challenge",
            message="Keep your streak going! Solve a coding question today.",
            metadata={},
        )
        for student in inactive_students
    ]
    Notification.objects.bulk_create(notifications, batch_size=500)
    logger.info("Sent coding reminders to %d students", len(notifications))
