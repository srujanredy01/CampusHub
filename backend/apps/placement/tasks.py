"""
Placement service functions for CampusHub.
"""

from datetime import timedelta

from django.utils import timezone
from django.db.models import Q


def send_placement_deadline_reminders():
    from apps.placement.models import PlacementApplication
    from apps.notifications.models import Notification

    today = timezone.now().date()
    upcoming = today + timedelta(days=2)
    applications = PlacementApplication.objects.filter(
        reminder_enabled=True,
        deadline__isnull=False,
        deadline__range=(today, upcoming),
        status__in=["applied", "shortlisted", "interview"],
    ).select_related("student", "company")

    sent_count = 0
    for app in applications:
        if app.reminder_sent_at and app.reminder_sent_at.date() == today:
            continue
        days_left = (app.deadline - today).days
        Notification.objects.create(
            user=app.student,
            notification_type="system",
            title=f"Placement deadline approaching: {app.company.name}",
            message=f"Your application deadline for {app.role} is in {days_left} day(s).",
            metadata={"placement_application_id": str(app.id), "company": app.company.name, "deadline": str(app.deadline)},
        )
        app.reminder_sent_at = timezone.now()
        app.save(update_fields=["reminder_sent_at"])
        sent_count += 1
    return sent_count
