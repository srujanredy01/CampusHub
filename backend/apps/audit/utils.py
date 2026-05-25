"""
Audit & Activity tracking helpers.
All functions are safe — they never raise exceptions.
"""
import logging
import ipaddress
from .models import AuditLog, UserActivityLog

logger = logging.getLogger(__name__)


# ── IP / UA helpers ───────────────────────────────────────────────────────────

def _get_ip(request):
    """
    Extract the real client IP.
    Trusts X-Forwarded-For only if it contains a valid IP address.
    Takes the LAST entry (closest trusted proxy) to prevent spoofing.
    """
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if xff:
        # Take the last IP in the chain (set by the trusted proxy closest to us)
        candidates = [ip.strip() for ip in xff.split(",")]
        for candidate in reversed(candidates):
            try:
                ipaddress.ip_address(candidate)
                return candidate
            except ValueError:
                continue
    return request.META.get("REMOTE_ADDR", "")


def _parse_ua(ua_string):
    """Very lightweight UA parsing — no external library needed."""
    ua = ua_string.lower()
    browser = "Unknown"
    os_name = "Unknown"
    device  = "Desktop"

    # Browser
    if "edg/" in ua or "edge/" in ua:
        browser = "Edge"
    elif "chrome/" in ua and "chromium" not in ua:
        browser = "Chrome"
    elif "firefox/" in ua:
        browser = "Firefox"
    elif "safari/" in ua and "chrome" not in ua:
        browser = "Safari"
    elif "opera" in ua or "opr/" in ua:
        browser = "Opera"

    # OS
    if "windows" in ua:
        os_name = "Windows"
    elif "android" in ua:
        os_name = "Android"
        device  = "Mobile"
    elif "iphone" in ua or "ipad" in ua:
        os_name = "iOS"
        device  = "Mobile" if "iphone" in ua else "Tablet"
    elif "mac os" in ua or "macos" in ua:
        os_name = "macOS"
    elif "linux" in ua:
        os_name = "Linux"

    return browser, os_name, device


# ── Admin audit log ───────────────────────────────────────────────────────────

def log_action(request, action, description, target_model="", target_id="", metadata=None):
    """Create an admin AuditLog entry. Safe to call from any view."""
    try:
        AuditLog.objects.create(
            admin=request.user if request.user.is_authenticated else None,
            action=action,
            target_model=target_model,
            target_id=str(target_id),
            description=description,
            ip_address=_get_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
            metadata=metadata or {},
        )
    except Exception as e:
        logger.warning("AuditLog write failed: %s", e)


# ── User activity log ─────────────────────────────────────────────────────────

def log_activity(
    request,
    action,
    status="success",
    status_code=None,
    metadata=None,
    user=None,
):
    """
    Create a UserActivityLog entry.
    Can be called with request.user or an explicit user object.
    Safe — never raises.
    """
    try:
        # Safely resolve user — request.user may be AnonymousUser or missing
        if user is None:
            req_user = getattr(request, "user", None)
            is_auth = getattr(req_user, "is_authenticated", False)
            u = req_user if is_auth else None
        else:
            u = user
        ua_string = request.META.get("HTTP_USER_AGENT", "")
        browser, os_name, device = _parse_ua(ua_string)

        activity = UserActivityLog.objects.create(
            user=u,
            username=u.full_name if u else "",
            student_id=(u.student_id or "") if u else "",
            role=u.role if u else "",
            action=action,
            endpoint=request.path,
            method=request.method,
            status=status,
            status_code=status_code,
            ip_address=_get_ip(request),
            user_agent=ua_string[:1000],
            browser=browser,
            os=os_name,
            device=device,
            metadata=metadata or {},
        )

        # Push live activity to admin dashboard via WebSocket
        try:
            from apps.notifications.services import push_activity_to_admin
            push_activity_to_admin({
                "id": str(activity.id),
                "username": activity.username,
                "student_id": activity.student_id,
                "role": activity.role,
                "action": activity.action,
                "status": activity.status,
                "endpoint": activity.endpoint,
                "created_at": activity.created_at.isoformat(),
                "metadata": activity.metadata,
            })
        except Exception:
            pass

    except Exception as e:
        logger.warning("UserActivityLog write failed: %s", e)


def log_login_success(request, user):
    log_activity(request, "login", "success", 200, {"student_id": user.student_id}, user=user)
    # Fire signal for admin alert
    try:
        from apps.notifications.signals import user_login
        user_login.send(sender=user, ip_address=_get_ip(request))
    except Exception:
        pass


def log_login_failed(request, student_id):
    log_activity(request, "login_failed", "failed", 401, {"attempted_id": student_id})
    # Fire signal for admin alert
    try:
        from apps.notifications.signals import user_login_failed
        user_login_failed.send(sender=None, student_id=student_id, ip_address=_get_ip(request))
    except Exception:
        pass
    # Check for multiple failed logins (security alert)
    try:
        _check_multiple_failures(student_id, _get_ip(request))
    except Exception:
        pass


def log_logout(request, user):
    log_activity(request, "logout", "success", 200, user=user)
    try:
        from apps.notifications.signals import user_logout
        user_logout.send(sender=user)
    except Exception:
        pass


def log_signup(request, user):
    log_activity(request, "signup", "success", 201, {"email": user.email}, user=user)
    # Fire signal for admin alert
    try:
        from apps.notifications.signals import user_signup
        user_signup.send(sender=user)
    except Exception:
        pass


def log_page_visit(request, page_name):
    log_activity(request, "page_visit", "success", 200, {"page": page_name})


def log_resource_download(request, resource_id, resource_title):
    log_activity(request, "resource_download", "success", 200,
                 {"resource_id": str(resource_id), "title": resource_title})


def log_code_run(request, language, status="success"):
    log_activity(request, "code_run", status, 200, {"language": language})


def log_code_submit(request, question_id, language, result_status):
    log_activity(request, "code_submit", "success", 200,
                 {"question_id": str(question_id), "language": language, "result": result_status})
    # Fire signal for admin alert
    try:
        from apps.notifications.signals import code_submitted
        code_submitted.send(
            sender=request.user,
            question_title=str(question_id),
            language=language,
            result=result_status,
        )
    except Exception:
        pass


def log_profile_update(request, user):
    log_activity(request, "profile_update", "success", 200, user=user)
    try:
        from apps.notifications.signals import profile_updated
        profile_updated.send(sender=user)
    except Exception:
        pass


def log_admin_action(request, action_type, description, target_id=None):
    log_activity(request, "admin_action", "success", 200,
                 {"action": action_type, "description": description, "target_id": str(target_id) if target_id else ""})


# ── Extended activity logging helpers ─────────────────────────────────────────

def log_note_upload(request, note_title):
    """Log note upload and fire admin alert."""
    log_activity(request, "resource_view", "success", 200, {"note_title": note_title, "action": "note_upload"})
    try:
        from apps.notifications.signals import note_uploaded
        note_uploaded.send(sender=request.user, note_title=note_title)
    except Exception:
        pass


def log_attendance_update(request, subject, percentage):
    """Log attendance update and fire admin alert."""
    log_activity(request, "page_visit", "success", 200,
                 {"subject": subject, "percentage": percentage, "action": "attendance_update"})
    try:
        from apps.notifications.signals import attendance_updated
        attendance_updated.send(sender=request.user, subject=subject, percentage=percentage)
    except Exception:
        pass


def log_cgpa_save(request, cgpa_value):
    """Log CGPA save and fire admin alert."""
    log_activity(request, "page_visit", "success", 200, {"cgpa": cgpa_value, "action": "cgpa_save"})
    try:
        from apps.notifications.signals import cgpa_saved
        cgpa_saved.send(sender=request.user, cgpa_value=cgpa_value)
    except Exception:
        pass


def log_placement_update(request, company, status_val):
    """Log placement update and fire admin alert."""
    log_activity(request, "page_visit", "success", 200,
                 {"company": company, "status": status_val, "action": "placement_update"})
    try:
        from apps.notifications.signals import placement_updated
        placement_updated.send(sender=request.user, company=company, status=status_val)
    except Exception:
        pass


def log_group_created(request, group_name):
    """Log study group creation and fire admin alert."""
    log_activity(request, "page_visit", "success", 200, {"group_name": group_name, "action": "group_created"})
    try:
        from apps.notifications.signals import group_created
        group_created.send(sender=request.user, group_name=group_name)
    except Exception:
        pass


def log_password_reset(request, user):
    """Log password reset and fire admin alert."""
    log_activity(request, "password_reset_request", "success", 200, user=user)
    try:
        from apps.notifications.signals import password_reset
        password_reset.send(sender=user)
    except Exception:
        pass


# ── Security helpers ──────────────────────────────────────────────────────────

def _check_multiple_failures(student_id, ip_address):
    """Check if there are multiple failed login attempts — trigger security alert."""
    from django.utils import timezone
    from datetime import timedelta

    window = timezone.now() - timedelta(minutes=15)
    failure_count = UserActivityLog.objects.filter(
        action="login_failed",
        created_at__gte=window,
        metadata__attempted_id=student_id,
    ).count()

    if failure_count >= 5:
        from apps.notifications.signals import security_alert
        security_alert.send(
            sender=None,
            alert_type="multiple_failed_logins",
            description=f"Multiple failed login attempts ({failure_count}) for student ID '{student_id}' from IP {ip_address} in the last 15 minutes.",
            user=None,
            ip_address=ip_address,
        )
