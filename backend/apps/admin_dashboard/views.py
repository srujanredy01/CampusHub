"""
Admin Dashboard Views — full CRUD + analytics + monitoring.
"""
import csv
import logging
import secrets
from io import StringIO
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.accounts.serializers import UserSerializer
from apps.resources.models import Resource
from apps.resources.serializers import ResourceSerializer, ResourceUploadSerializer
from apps.news.models import NewsAnnouncement
from apps.news.serializers import NewsAnnouncementSerializer
from apps.coding.models import CodingQuestion, Submission
from apps.coding.serializers import CodingQuestionAdminSerializer
from apps.notifications.models import Notification, ScheduledNotification
from apps.notifications.serializers import ScheduledNotificationSerializer
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from campushub.permissions import IsAdmin

User = get_user_model()
logger = logging.getLogger(__name__)


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    r = {"success": True, "message": message}
    if data is not None:
        r["data"] = data
    return Response(r, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": {"message": message}}, status=code)


def _parse_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return None
    value = str(value).strip().lower()
    if value in {"1", "true", "yes", "y"}:
        return True
    if value in {"0", "false", "no", "n"}:
        return False
    return None


# ─── Dashboard Home ────────────────────────────────────────────────────────────

class AdminDashboardView(APIView):
    """GET /api/admin/dashboard — platform-wide stats."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        now = timezone.now()
        d30 = now - timedelta(days=30)
        d7  = now - timedelta(days=7)
        d1  = now - timedelta(days=1)

        total_students   = User.objects.filter(role="student").count()
        active_students  = User.objects.filter(role="student", is_active=True).count()
        dau              = User.objects.filter(role="student", last_login__gte=d1).count()
        wau              = User.objects.filter(role="student", last_login__gte=d7).count()
        new_7d           = User.objects.filter(role="student", created_at__gte=d7).count()
        new_30d          = User.objects.filter(role="student", created_at__gte=d30).count()

        total_resources  = Resource.objects.filter(is_active=True).count()
        total_news       = NewsAnnouncement.objects.filter(is_active=True).count()
        total_questions  = CodingQuestion.objects.filter(is_active=True).count()
        total_subs       = Submission.objects.count()
        accepted_subs    = Submission.objects.filter(status="accepted").count()
        failed_subs      = Submission.objects.filter(
            status__in=["wrong_answer","runtime_error","compilation_error","time_limit_exceeded"]
        ).count()
        subs_7d          = Submission.objects.filter(created_at__gte=d7).count()

        # Registrations per day (last 30 days)
        reg_trend = list(
            User.objects.filter(role="student", created_at__gte=d30)
            .annotate(date=TruncDate("created_at"))
            .values("date").annotate(count=Count("id")).order_by("date")
        )

        # Submissions per day (last 30 days)
        sub_trend = list(
            Submission.objects.filter(created_at__gte=d30)
            .annotate(date=TruncDate("created_at"))
            .values("date").annotate(count=Count("id")).order_by("date")
        )

        # Branch distribution
        branch_dist = list(
            User.objects.filter(role="student", is_active=True)
            .values("branch").annotate(count=Count("id")).order_by("-count")
        )

        # Difficulty distribution
        diff_dist = list(
            CodingQuestion.objects.filter(is_active=True)
            .values("difficulty").annotate(count=Count("id"))
        )

        # Recent activity
        recent_subs = list(
            Submission.objects.select_related("user","question")
            .order_by("-created_at")[:10]
            .values("id","user__full_name","question__title","language","status","created_at")
        )
        recent_users = list(
            User.objects.filter(role="student").order_by("-created_at")[:10]
            .values("id","full_name","email","branch","created_at")
        )

        from apps.notes.models import Note
        from apps.placement.models import PlacementApplication
        from apps.attendance.models import SubjectAttendance
        from apps.audit.models import AuditLog, UserActivityLog

        notes_total = Note.objects.filter(is_active=True).count()
        notes_pending = Note.objects.filter(is_active=True, status="pending").count()
        notes_uploaded_7d = Note.objects.filter(created_at__gte=d7).count()

        placement_total = PlacementApplication.objects.count()
        placement_offers = PlacementApplication.objects.filter(status__in=["offer", "accepted"]).count()
        placement_active = PlacementApplication.objects.exclude(status__in=["rejected", "withdrawn"]).count()

        attendance_records = SubjectAttendance.objects.count()
        # Use DB-level calculation to avoid loading all records into Python
        from django.db.models import F, ExpressionWrapper, FloatField
        attendance_shortage = SubjectAttendance.objects.filter(
            total_classes__gt=0
        ).annotate(
            pct=ExpressionWrapper(
                F("attended_classes") * 100.0 / F("total_classes"),
                output_field=FloatField(),
            )
        ).filter(pct__lt=F("required_percentage")).count()

        audit_actions_7d = AuditLog.objects.filter(created_at__gte=d7).count()
        login_failures_7d = UserActivityLog.objects.filter(action="login_failed", created_at__gte=d7).count()
        recent_activity = list(
            UserActivityLog.objects.select_related("user")
            .order_by("-created_at")[:12]
            .values("id", "username", "role", "action", "status", "created_at", "metadata")
        )

        # Communication & Events stats
        try:
            from apps.communication.models import Channel, Message, UserPresence
            comm_channels = Channel.objects.filter(is_active=True).count()
            comm_messages = Message.objects.count()
            comm_online = UserPresence.objects.filter(status="online").count()
        except Exception:
            comm_channels = comm_messages = comm_online = 0

        try:
            from apps.events.models import Event, EventRegistration
            events_total = Event.objects.filter(is_active=True).exclude(status="draft").count()
            events_upcoming = Event.objects.filter(starts_at__gte=now, is_active=True).count()
            events_registrations = EventRegistration.objects.exclude(status="cancelled").count()
        except Exception:
            events_total = events_upcoming = events_registrations = 0

        return ok({
            "users": {
                "total": total_students,
                "active": active_students,
                "dau": dau,
                "wau": wau,
                "new_7d": new_7d,
                "new_30d": new_30d,
            },
            "resources": {"total": total_resources},
            "news": {"total": total_news},
            "coding": {
                "total_questions": total_questions,
                "total_submissions": total_subs,
                "accepted": accepted_subs,
                "failed": failed_subs,
                "acceptance_rate": round((accepted_subs/total_subs*100) if total_subs else 0, 1),
                "submissions_7d": subs_7d,
            },
            "notes": {
                "total": notes_total,
                "pending": notes_pending,
                "uploaded_7d": notes_uploaded_7d,
            },
            "placement": {
                "total_applications": placement_total,
                "active_applications": placement_active,
                "offers": placement_offers,
            },
            "attendance": {
                "records": attendance_records,
                "shortage_count": attendance_shortage,
            },
            "audit": {
                "admin_actions_7d": audit_actions_7d,
                "login_failures_7d": login_failures_7d,
            },
            "communication": {
                "channels": comm_channels,
                "messages": comm_messages,
                "online_users": comm_online,
            },
            "events": {
                "total": events_total,
                "upcoming": events_upcoming,
                "registrations": events_registrations,
            },
            "trends": {
                "registrations": reg_trend,
                "submissions": sub_trend,
            },
            "distributions": {
                "branch": branch_dist,
                "difficulty": diff_dist,
            },
            "recent": {
                "submissions": recent_subs,
                "registrations": recent_users,
                "activity": recent_activity,
            },
        })


# ─── Student Management ────────────────────────────────────────────────────────

class AdminStudentListView(generics.ListAPIView):
    """GET /api/admin/students — list all students with search/filter."""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = UserSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["is_active", "email_verified", "branch", "section", "semester", "role"]
    search_fields = ["full_name", "email", "student_id"]
    ordering_fields = ["created_at", "full_name", "last_login"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return User.objects.filter(role="student")


class AdminStudentDetailView(APIView):
    """GET/PUT/DELETE /api/admin/students/<id>"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def _get(self, pk):
        try:
            return User.objects.get(pk=pk, role="student")
        except User.DoesNotExist:
            return None

    def get(self, request, pk):
        user = self._get(pk)
        if not user:
            return err("Student not found.", 404)
        from apps.profiles.models import StudentProfile, ActivityLog
        from apps.coding.models import SavedQuestion
        profile = getattr(user, "profile", None)
        saved_count = SavedQuestion.objects.filter(user=user).count()
        recent_activity = list(
            ActivityLog.objects.filter(user=user).order_by("-created_at")[:20]
            .values("activity_type","description","created_at")
        )
        return ok({
            "user": UserSerializer(user).data,
            "profile": {
                "bio": profile.bio if profile else "",
                "github_url": profile.github_url if profile else "",
                "total_questions_solved": profile.total_questions_solved if profile else 0,
                "easy_solved": profile.easy_solved if profile else 0,
                "medium_solved": profile.medium_solved if profile else 0,
                "hard_solved": profile.hard_solved if profile else 0,
                "total_submissions": profile.total_submissions if profile else 0,
            },
            "saved_questions_count": saved_count,
            "recent_activity": recent_activity,
        })

    def put(self, request, pk):
        user = self._get(pk)
        if not user:
            return err("Student not found.", 404)
        allowed = ["full_name", "branch", "section", "semester", "is_active"]
        for f in allowed:
            if f in request.data:
                setattr(user, f, request.data[f])
        user.save()
        try:
            from apps.audit.utils import log_action
            log_action(request, "student_view", f"Updated student {user.email}", "User", str(pk))
        except Exception:
            pass
        return ok(UserSerializer(user).data, "Student updated.")

    def delete(self, request, pk):
        user = self._get(pk)
        if not user:
            return err("Student not found.", 404)
        email = user.email
        user.delete()
        try:
            from apps.audit.utils import log_action
            log_action(request, "student_delete", f"Deleted student {email}", "User", str(pk))
        except Exception:
            pass
        return ok(message="Student deleted.")


class AdminStudentActivateView(APIView):
    """POST /api/admin/students/<id>/activate"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role="student")
        except User.DoesNotExist:
            return err("Student not found.", 404)
        user.is_active = True
        user.save(update_fields=["is_active"])
        try:
            from apps.audit.utils import log_action
            log_action(request, "student_activate", f"Activated {user.email}", "User", str(pk))
        except Exception:
            pass
        return ok(message="Student activated.")


class AdminStudentDeactivateView(APIView):
    """POST /api/admin/students/<id>/deactivate"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role="student")
        except User.DoesNotExist:
            return err("Student not found.", 404)
        user.is_active = False
        user.save(update_fields=["is_active"])
        try:
            from apps.audit.utils import log_action
            log_action(request, "student_deactivate", f"Deactivated {user.email}", "User", str(pk))
        except Exception:
            pass
        return ok(message="Student deactivated.")


class AdminStudentResetPasswordView(APIView):
    """POST /api/admin/students/<id>/reset-password"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk, role="student")
        except User.DoesNotExist:
            return err("Student not found.", 404)
        token = secrets.token_urlsafe(32)
        user.password_reset_token = token
        user.password_reset_sent_at = timezone.now()
        user.save(update_fields=["password_reset_token","password_reset_sent_at"])
        try:
            from apps.notifications.tasks import send_password_reset_email
            send_password_reset_email(str(user.id))
        except Exception:
            pass
        try:
            from apps.audit.utils import log_action
            log_action(request, "student_password_reset", f"Reset password for {user.email}", "User", str(pk))
        except Exception:
            pass
        return ok(message="Password reset email sent.")


class AdminStudentRoleUpdateView(APIView):
    """PATCH /api/admin/students/<id>/role"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return err("Student not found.", 404)
        role = request.data.get("role", "").strip()
        valid_roles = {"student", "admin", "faculty", "moderator"}
        # Only super_admin can assign admin role
        if role == "admin" and request.user.role != "super_admin":
            return err("Only super admins can assign admin role.")
        if role not in valid_roles:
            return err(f"role must be one of: {', '.join(sorted(valid_roles))}.")
        user.role = role
        user.is_staff = role in ("admin", "super_admin", "faculty")
        user.save(update_fields=["role", "is_staff", "updated_at"])
        try:
            from apps.audit.utils import log_action
            log_action(request, "settings_change", f"Changed role for {user.email} to {role}", "User", str(pk))
        except Exception:
            pass
        return ok(UserSerializer(user).data, "Role updated.")


class AdminStudentImportView(APIView):
    """POST /api/admin/students/import"""
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return err("CSV file is required.")

        # Enforce a reasonable size limit (5 MB) to prevent DoS via huge CSV
        MAX_CSV_SIZE = 5 * 1024 * 1024
        if upload.size > MAX_CSV_SIZE:
            return err("CSV file is too large. Maximum allowed size is 5 MB.")

        try:
            decoded = upload.read().decode("utf-8-sig")
            rows = list(csv.DictReader(StringIO(decoded)))
        except Exception:
            return err("Invalid CSV file.")

        if not rows:
            return err("CSV file is empty.")

        created = 0
        updated = 0
        errors = []

        for index, row in enumerate(rows, start=2):
            email = (row.get("email") or "").strip().lower()
            full_name = (row.get("full_name") or "").strip()
            student_id = (row.get("student_id") or "").strip()
            if not email or not full_name:
                errors.append({"row": index, "message": "email and full_name are required."})
                continue

            defaults = {
                "full_name": full_name,
                "student_id": student_id or None,
                "branch": (row.get("branch") or "").strip(),
                "semester": int((row.get("semester") or "1").strip() or 1),
                "section": (row.get("section") or "").strip(),
                "role": (row.get("role") or "student").strip() or "student",
            }
            defaults["is_active"] = _parse_bool(row.get("is_active"))
            if defaults["is_active"] is None:
                defaults["is_active"] = False
            defaults["is_staff"] = defaults["role"] == "admin"

            try:
                user = User.objects.filter(email=email).first()
                if user:
                    for field, value in defaults.items():
                        setattr(user, field, value)
                    user.save()
                    updated += 1
                else:
                    user = User.objects.create_user(
                        email=email,
                        password=(row.get("password") or student_id or "ChangeMe123!"),
                        **defaults,
                    )
                    created += 1
            except Exception as exc:
                errors.append({"row": index, "message": str(exc)})

        try:
            from apps.audit.utils import log_action
            log_action(
                request,
                "settings_change",
                f"Imported students from CSV. created={created}, updated={updated}",
                "User",
                metadata={"created": created, "updated": updated, "errors": len(errors)},
            )
        except Exception:
            pass

        return ok(
            {
                "created": created,
                "updated": updated,
                "errors": errors[:50],
            },
            "CSV import completed.",
        )


class AdminStudentExportView(APIView):
    """GET /api/admin/students/export"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        queryset = User.objects.filter(role__in=["student", "admin"]).order_by("created_at")
        search = request.query_params.get("search", "").strip()
        branch = request.query_params.get("branch", "").strip()
        is_active = _parse_bool(request.query_params.get("is_active"))
        role = request.query_params.get("role", "").strip()

        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) | Q(email__icontains=search) | Q(student_id__icontains=search)
            )
        if branch:
            queryset = queryset.filter(branch__icontains=branch)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        if role in {"student", "admin"}:
            queryset = queryset.filter(role=role)

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="campushub-students.csv"'
        writer = csv.writer(response)
        writer.writerow(["full_name", "student_id", "email", "branch", "semester", "section", "role", "is_active", "email_verified", "created_at"])
        for user in queryset:
            writer.writerow([
                user.full_name,
                user.student_id or "",
                user.email,
                user.branch,
                user.semester,
                user.section,
                user.role,
                "true" if user.is_active else "false",
                "true" if user.email_verified else "false",
                user.created_at.isoformat(),
            ])
        try:
            from apps.audit.utils import log_action
            log_action(request, "student_export", f"Exported {queryset.count()} users", "User")
        except Exception:
            pass
        return response


# ─── Resources Management ──────────────────────────────────────────────────────

class AdminResourceListView(generics.ListAPIView):
    """GET /api/admin/resources — all resources including inactive."""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = ResourceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["branch", "semester", "academic_year", "file_type", "is_active"]
    search_fields = ["title", "description", "subject", "tags"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Resource.objects.all().select_related("uploaded_by")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


# ─── News Management ───────────────────────────────────────────────────────────

class AdminNewsListView(generics.ListAPIView):
    """GET /api/admin/news — all news including inactive."""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = NewsAnnouncementSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category","priority","is_active","is_pinned"]
    search_fields = ["title","content"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return NewsAnnouncement.objects.all().select_related("created_by")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


# ─── Coding Questions Management ───────────────────────────────────────────────

class AdminQuestionListView(generics.ListAPIView):
    """GET /api/admin/questions"""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = CodingQuestionAdminSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["topic","difficulty","is_active"]
    search_fields = ["title","description"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return CodingQuestion.objects.all()


# ─── Execution Monitoring ──────────────────────────────────────────────────────

class AdminExecutionStatsView(APIView):
    """GET /api/admin/executions — execution service monitoring."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        now = timezone.now()
        d1  = now - timedelta(days=1)
        d7  = now - timedelta(days=7)

        total_24h   = Submission.objects.filter(created_at__gte=d1).count()
        success_24h = Submission.objects.filter(created_at__gte=d1, status="accepted").count()
        failed_24h  = Submission.objects.filter(
            created_at__gte=d1,
            status__in=["runtime_error","compilation_error","wrong_answer"]
        ).count()
        tle_24h     = Submission.objects.filter(created_at__gte=d1, status="time_limit_exceeded").count()

        by_lang = list(
            Submission.objects.filter(created_at__gte=d7)
            .values("language").annotate(count=Count("id")).order_by("-count")
        )
        by_status = list(
            Submission.objects.filter(created_at__gte=d7)
            .values("status").annotate(count=Count("id")).order_by("-count")
        )

        # Hourly trend last 24h
        from django.db.models.functions import TruncHour
        hourly = list(
            Submission.objects.filter(created_at__gte=d1)
            .annotate(hour=TruncHour("created_at"))
            .values("hour").annotate(count=Count("id")).order_by("hour")
        )

        return ok({
            "last_24h": {
                "total": total_24h,
                "success": success_24h,
                "failed": failed_24h,
                "timeout": tle_24h,
            },
            "by_language": by_lang,
            "by_status": by_status,
            "hourly_trend": hourly,
        })


# ─── Analytics ─────────────────────────────────────────────────────────────────

class AdminAnalyticsView(APIView):
    """GET /api/admin/analytics — deep analytics."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        now = timezone.now()
        d30 = now - timedelta(days=30)

        # Top students by submissions
        top_students = list(
            Submission.objects.filter(created_at__gte=d30)
            .values("user__full_name","user__email","user__branch")
            .annotate(count=Count("id")).order_by("-count")[:10]
        )

        # Most accessed resources
        top_resources = list(
            Resource.objects.filter(is_active=True)
            .order_by("-view_count")[:10]
            .values("id","title","file_type","subject","view_count","download_count")
        )

        # Most attempted questions
        top_questions = list(
            CodingQuestion.objects.filter(is_active=True)
            .order_by("-total_submissions")[:10]
            .values("id","title","difficulty","topic","total_submissions","accepted_submissions")
        )

        # Section distribution
        section_dist = list(
            User.objects.filter(role="student", is_active=True)
            .values("section").annotate(count=Count("id")).order_by("-count")
        )

        # Semester distribution
        semester_dist = list(
            User.objects.filter(role="student", is_active=True)
            .values("semester").annotate(count=Count("id")).order_by("semester")
        )

        # Submissions per day last 30 days
        sub_trend = list(
            Submission.objects.filter(created_at__gte=d30)
            .annotate(date=TruncDate("created_at"))
            .values("date").annotate(count=Count("id")).order_by("date")
        )

        # Registrations per day last 30 days
        reg_trend = list(
            User.objects.filter(role="student", created_at__gte=d30)
            .annotate(date=TruncDate("created_at"))
            .values("date").annotate(count=Count("id")).order_by("date")
        )

        return ok({
            "top_students": top_students,
            "top_resources": top_resources,
            "top_questions": top_questions,
            "section_distribution": section_dist,
            "semester_distribution": semester_dist,
            "submission_trend": sub_trend,
            "registration_trend": reg_trend,
        })


# ─── Notifications ─────────────────────────────────────────────────────────────

class AdminSendNotificationView(APIView):
    """POST /api/admin/notifications — broadcast notification to all/branch students."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        title   = request.data.get("title","").strip()
        message = request.data.get("message","").strip()
        ntype   = request.data.get("notification_type","system")
        branch  = request.data.get("target_branch","")

        if not title or not message:
            return err("title and message are required.")

        users = User.objects.filter(is_active=True, role="student")
        if branch:
            users = users.filter(branch=branch)

        notifications = [
            Notification(
                user=u,
                notification_type=ntype,
                title=title,
                message=message,
                metadata={"sent_by": str(request.user.id)},
            )
            for u in users
        ]
        Notification.objects.bulk_create(notifications, batch_size=500)

        try:
            from apps.audit.utils import log_action
            log_action(request, "notification_send",
                       f"Sent '{title}' to {len(notifications)} students", "Notification")
        except Exception:
            pass

        return ok({"sent_to": len(notifications)}, "Notification sent.")


class AdminScheduledNotificationListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/admin/notifications/scheduled"""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = ScheduledNotificationSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "notification_type", "target_branch", "target_semester"]
    search_fields = ["title", "message"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return ScheduledNotification.objects.select_related("created_by", "approved_by").all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class AdminScheduledNotificationDetailView(APIView):
    """PUT/DELETE /api/admin/notifications/scheduled/<id>"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def _get(self, pk):
        try:
            return ScheduledNotification.objects.get(pk=pk)
        except ScheduledNotification.DoesNotExist:
            return None

    def put(self, request, pk):
        campaign = self._get(pk)
        if not campaign:
            return err("Notification campaign not found.", 404)
        serializer = ScheduledNotificationSerializer(campaign, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)
        serializer.save()
        return ok(serializer.data, "Notification campaign updated.")

    def delete(self, request, pk):
        campaign = self._get(pk)
        if not campaign:
            return err("Notification campaign not found.", 404)
        campaign.status = "cancelled"
        campaign.save(update_fields=["status", "updated_at"])
        return ok(message="Notification campaign cancelled.")


class AdminScheduledNotificationApproveView(APIView):
    """POST /api/admin/notifications/scheduled/<id>/approve"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            campaign = ScheduledNotification.objects.get(pk=pk)
        except ScheduledNotification.DoesNotExist:
            return err("Notification campaign not found.", 404)
        campaign.status = "approved"
        campaign.approved_by = request.user
        campaign.approved_at = timezone.now()
        campaign.save(update_fields=["status", "approved_by", "approved_at", "updated_at"])
        try:
            from apps.audit.utils import log_action
            log_action(request, "notification_send", f"Approved scheduled notification {campaign.title}", "ScheduledNotification", str(pk))
        except Exception:
            pass
        return ok(ScheduledNotificationSerializer(campaign).data, "Notification campaign approved.")


class AdminScheduledNotificationDispatchView(APIView):
    """POST /api/admin/notifications/scheduled/<id>/dispatch"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            campaign = ScheduledNotification.objects.get(pk=pk)
        except ScheduledNotification.DoesNotExist:
            return err("Notification campaign not found.", 404)
        from apps.notifications.tasks import dispatch_scheduled_notification
        result = dispatch_scheduled_notification(str(campaign.id))
        return ok({"notifications_sent": result}, "Notification dispatch completed.")


class AdminApprovalsView(APIView):
    """GET /api/admin/approvals"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.notes.models import Note

        pending_notes = list(
            Note.objects.filter(status="pending", is_active=True)
            .select_related("uploaded_by")
            .order_by("created_at")[:25]
            .values("id", "title", "subject", "branch", "semester", "uploaded_by__full_name", "created_at")
        )
        pending_notifications = ScheduledNotification.objects.filter(status__in=["draft", "scheduled"]).order_by("created_at")[:25]
        return ok({
            "notes": pending_notes,
            "scheduled_notifications": ScheduledNotificationSerializer(pending_notifications, many=True).data,
        })


class AdminLoginLogView(generics.ListAPIView):
    """GET /api/admin/login-logs"""
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "role", "browser", "device"]
    search_fields = ["username", "student_id", "ip_address"]
    ordering = ["-created_at"]

    def get_queryset(self):
        from apps.audit.models import UserActivityLog

        return UserActivityLog.objects.filter(action__in=["login", "login_failed", "logout"]).all()

    def get_serializer_class(self):
        from apps.audit.serializers import UserActivityLogSerializer
        return UserActivityLogSerializer


class AdminGlobalSearchView(APIView):
    """GET /api/admin/search?q=..."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if len(query) < 2:
            return err("q must be at least 2 characters.")

        from apps.notes.models import Note

        students = list(
            User.objects.filter(role__in=["student", "admin"])
            .filter(Q(full_name__icontains=query) | Q(email__icontains=query) | Q(student_id__icontains=query))
            .values("id", "full_name", "email", "student_id", "role")[:10]
        )
        notes = list(
            Note.objects.filter(Q(title__icontains=query) | Q(subject__icontains=query))
            .values("id", "title", "subject", "status")[:10]
        )
        news = list(
            NewsAnnouncement.objects.filter(Q(title__icontains=query) | Q(content__icontains=query))
            .values("id", "title", "category", "is_active")[:10]
        )
        questions = list(
            CodingQuestion.objects.filter(Q(title__icontains=query) | Q(description__icontains=query))
            .values("id", "title", "difficulty", "topic", "is_active")[:10]
        )

        # Communication channels
        try:
            from apps.communication.models import Channel
            channels = list(
                Channel.objects.filter(Q(name__icontains=query) | Q(description__icontains=query))
                .values("id", "name", "channel_type", "is_active")[:10]
            )
        except Exception:
            channels = []

        # Events
        try:
            from apps.events.models import Event
            events = list(
                Event.objects.filter(Q(title__icontains=query) | Q(description__icontains=query))
                .values("id", "title", "event_type", "status", "starts_at")[:10]
            )
        except Exception:
            events = []

        return ok({
            "students": students,
            "notes": notes,
            "news": news,
            "questions": questions,
            "channels": channels,
            "events": events,
        })


# ─── Audit Logs ────────────────────────────────────────────────────────────────

class AdminAuditLogView(generics.ListAPIView):
    """GET /api/admin/logs — admin audit trail."""
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["action"]
    search_fields = ["description","admin__email"]
    ordering = ["-created_at"]

    def get_queryset(self):
        try:
            from apps.audit.models import AuditLog
            from apps.audit.serializers import AuditLogSerializer
            self.serializer_class = AuditLogSerializer
            return AuditLog.objects.select_related("admin").all()
        except Exception:
            return []

    def get_serializer_class(self):
        try:
            from apps.audit.serializers import AuditLogSerializer
            return AuditLogSerializer
        except Exception:
            from rest_framework import serializers
            class Empty(serializers.Serializer):
                pass
            return Empty


# ─── System Health ─────────────────────────────────────────────────────────────

class AdminSystemHealthView(APIView):
    """GET /api/admin/system/health — DB and executor health."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        health = {}

        # Database
        try:
            from django.db import connection
            with connection.cursor() as c:
                c.execute("SELECT 1")
            health["database"] = {"status": "healthy"}
        except Exception as e:
            health["database"] = {"status": "unhealthy", "error": str(e)}

        # Executor
        try:
            import requests as req
            from django.conf import settings
            r = req.get(f"{settings.EXECUTOR_SERVICE_URL}/health", timeout=3)
            health["executor"] = {"status": "healthy" if r.status_code == 200 else "degraded"}
        except Exception as e:
            health["executor"] = {"status": "unreachable", "error": str(e)}

        overall = "healthy" if all(v["status"] == "healthy" for v in health.values()) else "degraded"
        return ok({"overall": overall, "services": health})


# ─── Admin Resource CRUD ───────────────────────────────────────────────────────

class AdminResourceUploadView(APIView):
    """POST /api/admin/resources/upload — upload a new resource."""
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        from django.core.cache import cache
        s = ResourceUploadSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        resource = s.save(uploaded_by=request.user)
        cache.delete("resource_counts")
        try:
            from apps.audit.utils import log_action
            log_action(request, "resource_upload", f"Uploaded '{resource.title}'", "Resource", str(resource.id))
        except Exception:
            pass
        return ok(
            ResourceSerializer(resource, context={"request": request}).data,
            "Resource uploaded successfully.",
            201,
        )


class AdminResourceDetailView(APIView):
    """GET/PUT/DELETE /api/admin/resources/<id>"""
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get(self, pk):
        try:
            return Resource.objects.get(pk=pk)
        except Resource.DoesNotExist:
            return None

    def get(self, request, pk):
        r = self._get(pk)
        if not r:
            return err("Resource not found.", 404)
        return ok(ResourceSerializer(r, context={"request": request}).data)

    def put(self, request, pk):
        from django.core.cache import cache
        r = self._get(pk)
        if not r:
            return err("Resource not found.", 404)
        s = ResourceUploadSerializer(r, data=request.data, partial=True)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        r = s.save()
        cache.delete("resource_counts")
        try:
            from apps.audit.utils import log_action
            log_action(request, "resource_edit", f"Edited '{r.title}'", "Resource", str(pk))
        except Exception:
            pass
        return ok(ResourceSerializer(r, context={"request": request}).data, "Resource updated.")

    def delete(self, request, pk):
        from django.core.cache import cache
        r = self._get(pk)
        if not r:
            return err("Resource not found.", 404)
        title = r.title
        r.is_active = False
        r.save(update_fields=["is_active"])
        cache.delete("resource_counts")
        try:
            from apps.audit.utils import log_action
            log_action(request, "resource_delete", f"Deleted '{title}'", "Resource", str(pk))
        except Exception:
            pass
        return ok(message="Resource deleted.")


class AdminResourceToggleView(APIView):
    """POST /api/admin/resources/<id>/toggle"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        from django.core.cache import cache
        try:
            r = Resource.objects.get(pk=pk)
        except Resource.DoesNotExist:
            return err("Resource not found.", 404)
        r.is_active = not r.is_active
        r.save(update_fields=["is_active"])
        cache.delete("resource_counts")
        return ok(
            {"is_active": r.is_active},
            f"Resource {'activated' if r.is_active else 'deactivated'}.",
        )


class AdminResourceStatsView(APIView):
    """GET /api/admin/resources/stats — resource analytics."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from django.db.models import Sum
        total = Resource.objects.count()
        active = Resource.objects.filter(is_active=True).count()
        total_downloads = Resource.objects.aggregate(t=Sum("download_count"))["t"] or 0

        by_year = list(
            Resource.objects.filter(is_active=True)
            .values("academic_year").annotate(count=Count("id")).order_by("academic_year")
        )
        by_semester = list(
            Resource.objects.filter(is_active=True)
            .values("semester").annotate(count=Count("id")).order_by("semester")
        )
        by_type = list(
            Resource.objects.filter(is_active=True)
            .values("file_type").annotate(count=Count("id")).order_by("-count")
        )
        top_downloaded = list(
            Resource.objects.filter(is_active=True)
            .order_by("-download_count")[:10]
            .values("id", "title", "file_type", "subject", "download_count", "view_count")
        )

        return ok({
            "total": total,
            "active": active,
            "total_downloads": total_downloads,
            "by_year": by_year,
            "by_semester": by_semester,
            "by_file_type": by_type,
            "top_downloaded": top_downloaded,
        })


# ─── Admin News CRUD ───────────────────────────────────────────────────────────

class AdminNewsCreateView(APIView):
    """POST /api/admin/news/create"""
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        from apps.news.serializers import NewsCreateUpdateSerializer
        s = NewsCreateUpdateSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        news = s.save(created_by=request.user)
        try:
            from apps.audit.utils import log_action
            log_action(request, "news_create", f"Created '{news.title}'", "News", str(news.id))
        except Exception:
            pass
        return ok(
            NewsAnnouncementSerializer(news, context={"request": request}).data,
            "Article created.",
            201,
        )


class AdminNewsDetailView(APIView):
    """GET/PUT/DELETE /api/admin/news/<id>"""
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get(self, pk):
        try:
            return NewsAnnouncement.objects.get(pk=pk)
        except NewsAnnouncement.DoesNotExist:
            return None

    def get(self, request, pk):
        n = self._get(pk)
        if not n:
            return err("Article not found.", 404)
        return ok(NewsAnnouncementSerializer(n, context={"request": request}).data)

    def put(self, request, pk):
        from apps.news.serializers import NewsCreateUpdateSerializer
        n = self._get(pk)
        if not n:
            return err("Article not found.", 404)
        s = NewsCreateUpdateSerializer(n, data=request.data, partial=True)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        n = s.save()
        try:
            from apps.audit.utils import log_action
            log_action(request, "news_edit", f"Edited '{n.title}'", "News", str(pk))
        except Exception:
            pass
        return ok(NewsAnnouncementSerializer(n, context={"request": request}).data, "Article updated.")

    def delete(self, request, pk):
        n = self._get(pk)
        if not n:
            return err("Article not found.", 404)
        title = n.title
        n.is_active = False
        n.save(update_fields=["is_active"])
        try:
            from apps.audit.utils import log_action
            log_action(request, "news_delete", f"Deleted '{title}'", "News", str(pk))
        except Exception:
            pass
        return ok(message="Article deleted.")


class AdminNewsPinView(APIView):
    """POST /api/admin/news/<id>/pin"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            n = NewsAnnouncement.objects.get(pk=pk)
        except NewsAnnouncement.DoesNotExist:
            return err("Article not found.", 404)
        n.is_pinned = not n.is_pinned
        n.save(update_fields=["is_pinned"])
        try:
            from apps.audit.utils import log_action
            log_action(request, "news_pin", f"{'Pinned' if n.is_pinned else 'Unpinned'} '{n.title}'", "News", str(pk))
        except Exception:
            pass
        return ok({"is_pinned": n.is_pinned}, f"Article {'pinned' if n.is_pinned else 'unpinned'}.")


class AdminNewsStatsView(APIView):
    """GET /api/admin/news/stats"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.news.models import SavedNews
        now = timezone.now()
        total   = NewsAnnouncement.objects.count()
        active  = NewsAnnouncement.objects.filter(is_active=True).count()
        pinned  = NewsAnnouncement.objects.filter(is_pinned=True, is_active=True).count()
        weekly  = NewsAnnouncement.objects.filter(created_at__gte=now - timedelta(days=7)).count()
        monthly = NewsAnnouncement.objects.filter(created_at__gte=now - timedelta(days=30)).count()
        total_saves = SavedNews.objects.count()

        by_category = list(
            NewsAnnouncement.objects.filter(is_active=True)
            .values("category").annotate(count=Count("id")).order_by("-count")
        )
        top_read = list(
            NewsAnnouncement.objects.filter(is_active=True)
            .order_by("-read_count")[:10]
            .values("id", "title", "category", "read_count", "view_count", "created_at")
        )

        return ok({
            "total": total,
            "active": active,
            "pinned": pinned,
            "weekly": weekly,
            "monthly": monthly,
            "total_saves": total_saves,
            "by_category": by_category,
            "top_read": top_read,
        })


# ─── User Activity Logs ────────────────────────────────────────────────────────

class AdminActivityLogView(generics.ListAPIView):
    """
    GET /api/admin/activity-logs
    Full user activity log with filtering by user, action, date, status.
    """
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ["action", "status", "role", "device", "browser"]
    search_fields      = ["username", "student_id", "ip_address", "endpoint"]
    ordering_fields    = ["created_at", "action", "status"]
    ordering           = ["-created_at"]

    def get_queryset(self):
        from apps.audit.models import UserActivityLog
        qs = UserActivityLog.objects.select_related("user").all()

        # Optional date range filter
        date_from = self.request.query_params.get("date_from")
        date_to   = self.request.query_params.get("date_to")
        user_id   = self.request.query_params.get("user_id")

        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        if user_id:
            qs = qs.filter(user_id=user_id)

        return qs

    def get_serializer_class(self):
        from apps.audit.serializers import UserActivityLogSerializer
        return UserActivityLogSerializer


class AdminActivityStatsView(APIView):
    """
    GET /api/admin/activity-stats
    Aggregated activity statistics for the admin dashboard.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.audit.models import UserActivityLog
        now = timezone.now()
        d1  = now - timedelta(days=1)
        d7  = now - timedelta(days=7)
        d30 = now - timedelta(days=30)

        total_events   = UserActivityLog.objects.count()
        events_today   = UserActivityLog.objects.filter(created_at__gte=d1).count()
        events_week    = UserActivityLog.objects.filter(created_at__gte=d7).count()
        failed_logins  = UserActivityLog.objects.filter(action="login_failed", created_at__gte=d7).count()
        active_users   = UserActivityLog.objects.filter(
            created_at__gte=d1
        ).values("user").distinct().count()

        # Events by action (last 7 days)
        by_action = list(
            UserActivityLog.objects.filter(created_at__gte=d7)
            .values("action").annotate(count=Count("id")).order_by("-count")
        )

        # Events by device
        by_device = list(
            UserActivityLog.objects.filter(created_at__gte=d30)
            .values("device").annotate(count=Count("id")).order_by("-count")
        )

        # Events by browser
        by_browser = list(
            UserActivityLog.objects.filter(created_at__gte=d30)
            .values("browser").annotate(count=Count("id")).order_by("-count")
        )

        # Daily trend (last 30 days)
        daily_trend = list(
            UserActivityLog.objects.filter(created_at__gte=d30)
            .annotate(date=TruncDate("created_at"))
            .values("date").annotate(count=Count("id")).order_by("date")
        )

        # Top active users (last 7 days)
        top_users = list(
            UserActivityLog.objects.filter(created_at__gte=d7)
            .exclude(user=None)
            .values("username", "student_id", "role")
            .annotate(count=Count("id")).order_by("-count")[:10]
        )

        # Failed login attempts by IP (last 24h) — security monitoring
        suspicious_ips = list(
            UserActivityLog.objects.filter(
                action="login_failed", created_at__gte=d1
            ).values("ip_address").annotate(count=Count("id"))
            .filter(count__gte=3).order_by("-count")
        )

        return ok({
            "summary": {
                "total_events":  total_events,
                "events_today":  events_today,
                "events_week":   events_week,
                "failed_logins_week": failed_logins,
                "active_users_today": active_users,
            },
            "by_action":     by_action,
            "by_device":     by_device,
            "by_browser":    by_browser,
            "daily_trend":   daily_trend,
            "top_users":     top_users,
            "suspicious_ips": suspicious_ips,
        })
