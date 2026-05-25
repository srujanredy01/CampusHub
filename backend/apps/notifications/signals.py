"""
Django signals for triggering notifications and admin alerts.
Connects to model save/delete events across the platform.
"""
import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver, Signal

logger = logging.getLogger(__name__)

# ── Custom signals for activity events ────────────────────────────────────────
# These are fired from views/middleware when specific actions occur.

user_signup = Signal()          # sender=User instance
user_login = Signal()           # sender=User instance, kwargs: ip_address
user_login_failed = Signal()    # kwargs: student_id, ip_address
user_logout = Signal()          # sender=User instance
password_reset = Signal()       # sender=User instance
password_changed = Signal()     # sender=User instance
profile_updated = Signal()      # sender=User instance

code_submitted = Signal()       # sender=User, kwargs: question_title, language, result
note_uploaded = Signal()        # sender=User, kwargs: note_title
resource_uploaded = Signal()    # sender=User, kwargs: resource_title
attendance_updated = Signal()   # sender=User, kwargs: subject, percentage
cgpa_saved = Signal()           # sender=User, kwargs: cgpa_value
placement_updated = Signal()    # sender=User, kwargs: company, status
group_created = Signal()        # sender=User, kwargs: group_name

# Admin content signals (trigger user notifications)
admin_resource_published = Signal()   # kwargs: resource_title, resource_id, branch, semester
admin_news_published = Signal()       # kwargs: news_title, news_id
admin_contest_created = Signal()      # kwargs: contest_title
admin_announcement = Signal()         # kwargs: title, message, target_type, target_value

security_alert = Signal()       # kwargs: alert_type, description, user, ip_address


# ── Signal handlers ───────────────────────────────────────────────────────────

@receiver(user_signup)
def handle_user_signup(sender, **kwargs):
    """Admin alert: new student signup."""
    from .services import create_admin_alert_async
    user = sender
    create_admin_alert_async(
        alert_type="new_signup",
        category="info",
        title=f"New student signup: {user.full_name}",
        message=f"{user.full_name} ({user.email}) registered on the platform.",
        user=user,
        metadata={"student_id": user.student_id or "", "branch": user.branch},
    )


@receiver(user_login)
def handle_user_login(sender, **kwargs):
    """Admin alert: user login (info level)."""
    from .services import create_admin_alert_async
    user = sender
    ip = kwargs.get("ip_address", "")
    create_admin_alert_async(
        alert_type="user_login",
        category="info",
        title=f"User login: {user.full_name}",
        message=f"{user.full_name} logged in from {ip}.",
        user=user,
        metadata={"ip_address": ip},
    )


@receiver(user_login_failed)
def handle_login_failed(sender, **kwargs):
    """Admin alert: failed login attempt."""
    from .services import create_admin_alert_async
    student_id = kwargs.get("student_id", "")
    ip = kwargs.get("ip_address", "")
    create_admin_alert_async(
        alert_type="failed_login",
        category="warning",
        title=f"Failed login attempt: {student_id}",
        message=f"Failed login for student ID '{student_id}' from IP {ip}.",
        metadata={"student_id": student_id, "ip_address": ip},
    )


@receiver(password_reset)
def handle_password_reset(sender, **kwargs):
    """Admin alert: password reset requested."""
    from .services import create_admin_alert_async
    user = sender
    create_admin_alert_async(
        alert_type="password_reset",
        category="info",
        title=f"Password reset: {user.full_name}",
        message=f"{user.full_name} ({user.email}) requested a password reset.",
        user=user,
    )


@receiver(profile_updated)
def handle_profile_updated(sender, **kwargs):
    """Admin alert: profile change."""
    from .services import create_admin_alert_async
    user = sender
    create_admin_alert_async(
        alert_type="profile_change",
        category="info",
        title=f"Profile updated: {user.full_name}",
        message=f"{user.full_name} updated their profile.",
        user=user,
    )


@receiver(code_submitted)
def handle_code_submitted(sender, **kwargs):
    """Admin alert: code submission."""
    from .services import create_admin_alert_async
    user = sender
    question_title = kwargs.get("question_title", "Unknown")
    result = kwargs.get("result", "")
    create_admin_alert_async(
        alert_type="code_submission",
        category="info",
        title=f"Code submission: {user.full_name}",
        message=f"{user.full_name} submitted solution for '{question_title}' — {result}.",
        user=user,
        metadata={"question": question_title, "result": result, "language": kwargs.get("language", "")},
    )


@receiver(note_uploaded)
def handle_note_uploaded(sender, **kwargs):
    """Admin alert: note upload."""
    from .services import create_admin_alert_async
    user = sender
    note_title = kwargs.get("note_title", "Untitled")
    create_admin_alert_async(
        alert_type="note_upload",
        category="info",
        title=f"Note uploaded: {user.full_name}",
        message=f"{user.full_name} uploaded note '{note_title}'.",
        user=user,
        metadata={"note_title": note_title},
    )


@receiver(resource_uploaded)
def handle_resource_uploaded(sender, **kwargs):
    """Admin alert: resource upload."""
    from .services import create_admin_alert_async
    user = sender
    resource_title = kwargs.get("resource_title", "Untitled")
    create_admin_alert_async(
        alert_type="resource_upload",
        category="info",
        title=f"Resource uploaded: {user.full_name}",
        message=f"{user.full_name} uploaded resource '{resource_title}'.",
        user=user,
        metadata={"resource_title": resource_title},
    )


@receiver(attendance_updated)
def handle_attendance_updated(sender, **kwargs):
    """Admin alert: attendance update."""
    from .services import create_admin_alert_async
    user = sender
    subject = kwargs.get("subject", "")
    percentage = kwargs.get("percentage", 0)
    category = "warning" if percentage < 75 else "info"
    create_admin_alert_async(
        alert_type="attendance_update",
        category=category,
        title=f"Attendance update: {user.full_name}",
        message=f"{user.full_name} updated attendance for {subject} ({percentage}%).",
        user=user,
        metadata={"subject": subject, "percentage": percentage},
    )


@receiver(cgpa_saved)
def handle_cgpa_saved(sender, **kwargs):
    """Admin alert: CGPA save."""
    from .services import create_admin_alert_async
    user = sender
    cgpa_value = kwargs.get("cgpa_value", "")
    create_admin_alert_async(
        alert_type="cgpa_save",
        category="info",
        title=f"CGPA saved: {user.full_name}",
        message=f"{user.full_name} saved CGPA: {cgpa_value}.",
        user=user,
        metadata={"cgpa": cgpa_value},
    )


@receiver(placement_updated)
def handle_placement_updated(sender, **kwargs):
    """Admin alert: placement update."""
    from .services import create_admin_alert_async
    user = sender
    company = kwargs.get("company", "")
    status = kwargs.get("status", "")
    create_admin_alert_async(
        alert_type="placement_update",
        category="info",
        title=f"Placement update: {user.full_name}",
        message=f"{user.full_name} updated placement for {company} — {status}.",
        user=user,
        metadata={"company": company, "status": status},
    )


@receiver(group_created)
def handle_group_created(sender, **kwargs):
    """Admin alert: study group created."""
    from .services import create_admin_alert_async
    user = sender
    group_name = kwargs.get("group_name", "")
    create_admin_alert_async(
        alert_type="group_created",
        category="info",
        title=f"Study group created: {group_name}",
        message=f"{user.full_name} created study group '{group_name}'.",
        user=user,
        metadata={"group_name": group_name},
    )


@receiver(security_alert)
def handle_security_alert(sender, **kwargs):
    """Admin alert: security event."""
    from .services import create_admin_alert_async
    alert_type = kwargs.get("alert_type", "suspicious_activity")
    description = kwargs.get("description", "")
    user = kwargs.get("user")
    ip = kwargs.get("ip_address", "")
    create_admin_alert_async(
        alert_type=alert_type,
        category="security",
        title=f"Security alert: {description[:50]}",
        message=description,
        user=user,
        metadata={"ip_address": ip},
    )


# ── Admin content → User notification handlers ───────────────────────────────

@receiver(admin_resource_published)
def handle_admin_resource_published(sender, **kwargs):
    """Notify students when admin publishes a new resource."""
    from .services import notify_all_students, notify_branch
    title = kwargs.get("resource_title", "New Resource")
    branch = kwargs.get("branch", "")

    if branch:
        notify_branch(
            branch,
            "new_resource",
            f"New Resource: {title}",
            f"A new resource '{title}' has been uploaded for your branch.",
            priority="normal",
            metadata={"resource_id": str(kwargs.get("resource_id", ""))},
        )
    else:
        notify_all_students(
            "new_resource",
            f"New Resource: {title}",
            f"A new resource '{title}' has been uploaded.",
            priority="normal",
            metadata={"resource_id": str(kwargs.get("resource_id", ""))},
        )


@receiver(admin_news_published)
def handle_admin_news_published(sender, **kwargs):
    """Notify all students when admin publishes news."""
    from .services import notify_all_students
    title = kwargs.get("news_title", "New Announcement")
    notify_all_students(
        "campus_news",
        f"News: {title}",
        f"New announcement: '{title}'. Check the news section for details.",
        priority="normal",
        metadata={"news_id": str(kwargs.get("news_id", ""))},
    )


@receiver(admin_contest_created)
def handle_admin_contest_created(sender, **kwargs):
    """Notify all students about new coding contest."""
    from .services import notify_all_students
    title = kwargs.get("contest_title", "New Contest")
    notify_all_students(
        "coding_contest",
        f"New Contest: {title}",
        f"A new coding contest '{title}' has been created. Join now!",
        priority="high",
        metadata={"contest_title": title},
    )


@receiver(admin_announcement)
def handle_admin_announcement(sender, **kwargs):
    """Handle targeted admin announcements."""
    from .services import notify_all_students, notify_branch, notify_semester
    title = kwargs.get("title", "Announcement")
    message = kwargs.get("message", "")
    target_type = kwargs.get("target_type", "all")
    target_value = kwargs.get("target_value", "")

    if target_type == "branch" and target_value:
        notify_branch(target_value, "system", title, message, priority="high")
    elif target_type == "semester" and target_value:
        notify_semester(int(target_value), "system", title, message, priority="high")
    else:
        notify_all_students("system", title, message, priority="high")
