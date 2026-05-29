"""
Admin Dashboard Extended Views — Department, Section, Announcement,
User Management (Faculty/Moderator), Analytics, Moderation Overview.
"""
import logging
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q, F, ExpressionWrapper, FloatField, Avg
from django.db.models.functions import TruncDate, TruncWeek
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from campushub.permissions import IsAdmin
from .models import Department, Section, Announcement
from .serializers import DepartmentSerializer, SectionSerializer, AnnouncementSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    r = {"success": True, "message": message}
    if data is not None:
        r["data"] = data
    return Response(r, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": {"message": message}}, status=code)


# ─── Department Management ─────────────────────────────────────────────────────

class AdminDepartmentListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/admin/departments"""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = DepartmentSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name", "code"]
    ordering = ["name"]

    def get_queryset(self):
        qs = Department.objects.select_related("head")
        is_active = self.request.query_params.get("is_active")
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ("true", "1"))
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        try:
            from apps.audit.utils import log_action
            log_action(
                self.request, "department_create",
                f"Created department {serializer.instance.name}",
                "Department", str(serializer.instance.id)
            )
        except Exception:
            pass


class AdminDepartmentDetailView(APIView):
    """GET/PUT/DELETE /api/admin/departments/<id>"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def _get(self, pk):
        try:
            return Department.objects.select_related("head").get(pk=pk)
        except Department.DoesNotExist:
            return None

    def get(self, request, pk):
        dept = self._get(pk)
        if not dept:
            return err("Department not found.", 404)
        data = DepartmentSerializer(dept).data
        # Include students and faculty in this department
        students = User.objects.filter(
            branch=dept.code, role="student", is_active=True
        ).count()
        faculty = User.objects.filter(
            branch=dept.code, role="faculty", is_active=True
        ).count()
        sections = Section.objects.filter(
            department=dept, is_active=True
        )
        data["students"] = students
        data["faculty"] = faculty
        data["sections_list"] = SectionSerializer(sections, many=True).data
        return ok(data)

    def put(self, request, pk):
        dept = self._get(pk)
        if not dept:
            return err("Department not found.", 404)
        serializer = DepartmentSerializer(dept, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            try:
                from apps.audit.utils import log_action
                log_action(
                    request, "department_update",
                    f"Updated department {dept.name}",
                    "Department", str(pk)
                )
            except Exception:
                pass
            return ok(serializer.data, "Department updated.")
        return err(str(serializer.errors))

    def delete(self, request, pk):
        dept = self._get(pk)
        if not dept:
            return err("Department not found.", 404)
        # Archive instead of hard delete
        dept.is_active = False
        dept.save(update_fields=["is_active", "updated_at"])
        try:
            from apps.audit.utils import log_action
            log_action(
                request, "department_archive",
                f"Archived department {dept.name}",
                "Department", str(pk)
            )
        except Exception:
            pass
        return ok(message="Department archived.")


# ─── Section Management ────────────────────────────────────────────────────────

class AdminSectionListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/admin/sections"""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = SectionSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["department", "semester", "is_active"]
    search_fields = ["name"]
    ordering = ["department__code", "semester", "name"]

    def get_queryset(self):
        return Section.objects.select_related(
            "department", "faculty_advisor", "moderator"
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        try:
            from apps.audit.utils import log_action
            log_action(
                self.request, "section_create",
                f"Created section {serializer.instance.display_name}",
                "Section", str(serializer.instance.id)
            )
        except Exception:
            pass


class AdminSectionDetailView(APIView):
    """GET/PUT/DELETE /api/admin/sections/<id>"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def _get(self, pk):
        try:
            return Section.objects.select_related(
                "department", "faculty_advisor", "moderator"
            ).get(pk=pk)
        except Section.DoesNotExist:
            return None

    def get(self, request, pk):
        section = self._get(pk)
        if not section:
            return err("Section not found.", 404)
        data = SectionSerializer(section).data
        return ok(data)

    def put(self, request, pk):
        section = self._get(pk)
        if not section:
            return err("Section not found.", 404)
        serializer = SectionSerializer(section, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            try:
                from apps.audit.utils import log_action
                log_action(
                    request, "section_update",
                    f"Updated section {section.display_name}",
                    "Section", str(pk)
                )
            except Exception:
                pass
            return ok(serializer.data, "Section updated.")
        return err(str(serializer.errors))

    def delete(self, request, pk):
        section = self._get(pk)
        if not section:
            return err("Section not found.", 404)
        section.is_active = False
        section.save(update_fields=["is_active", "updated_at"])
        try:
            from apps.audit.utils import log_action
            log_action(
                request, "section_archive",
                f"Archived section {section.display_name}",
                "Section", str(pk)
            )
        except Exception:
            pass
        return ok(message="Section archived.")


class AdminSectionMoveStudentView(APIView):
    """POST /api/admin/sections/<id>/move-student — move student to section."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            section = Section.objects.select_related("department").get(pk=pk)
        except Section.DoesNotExist:
            return err("Section not found.", 404)

        student_id = request.data.get("student_id")
        if not student_id:
            return err("student_id is required.")

        try:
            student = User.objects.get(pk=student_id, role="student")
        except User.DoesNotExist:
            return err("Student not found.", 404)

        student.branch = section.department.code
        student.section = section.name
        student.semester = section.semester
        student.save(update_fields=["branch", "section", "semester", "updated_at"])

        try:
            from apps.audit.utils import log_action
            log_action(
                request, "student_move",
                f"Moved {student.email} to {section.display_name}",
                "Section", str(pk)
            )
        except Exception:
            pass
        return ok(message=f"Student moved to {section.display_name}.")


# ─── Announcement Management ──────────────────────────────────────────────────

class AdminAnnouncementListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/admin/announcements"""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = AnnouncementSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["title", "content"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Announcement.objects.select_related(
            "created_by", "target_department", "target_section"
        )

    def perform_create(self, serializer):
        announcement = serializer.save(created_by=self.request.user)
        # Send real-time notification
        self._broadcast_announcement(announcement)

    def _broadcast_announcement(self, announcement):
        """Push announcement via WebSocket to admin dashboard."""
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "admin_dashboard",
                {
                    "type": "notification_update",
                    "data": {
                        "action": "announcement_created",
                        "title": announcement.title,
                        "target": announcement.target,
                        "priority": announcement.priority,
                    },
                }
            )
        except Exception:
            pass


class AdminAnnouncementDetailView(APIView):
    """GET/PUT/DELETE /api/admin/announcements/<id>"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        try:
            ann = Announcement.objects.select_related(
                "created_by", "target_department", "target_section"
            ).get(pk=pk)
        except Announcement.DoesNotExist:
            return err("Announcement not found.", 404)
        return ok(AnnouncementSerializer(ann).data)

    def put(self, request, pk):
        try:
            ann = Announcement.objects.get(pk=pk)
        except Announcement.DoesNotExist:
            return err("Announcement not found.", 404)
        serializer = AnnouncementSerializer(ann, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return ok(serializer.data, "Announcement updated.")
        return err(str(serializer.errors))

    def delete(self, request, pk):
        try:
            ann = Announcement.objects.get(pk=pk)
        except Announcement.DoesNotExist:
            return err("Announcement not found.", 404)
        ann.is_active = False
        ann.save(update_fields=["is_active", "updated_at"])
        return ok(message="Announcement archived.")


# ─── Faculty Management ────────────────────────────────────────────────────────

class AdminFacultyListView(generics.ListAPIView):
    """GET /api/admin/faculty — list all faculty."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.accounts.serializers import UserSerializer
        qs = User.objects.filter(role="faculty")
        search = request.query_params.get("search", "")
        branch = request.query_params.get("branch", "")
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) | Q(email__icontains=search)
            )
        if branch:
            qs = qs.filter(branch=branch)
        data = UserSerializer(qs, many=True).data
        return ok(data)


class AdminFacultyDetailView(APIView):
    """GET/PUT /api/admin/faculty/<id>"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        try:
            faculty = User.objects.get(pk=pk, role="faculty")
        except User.DoesNotExist:
            return err("Faculty not found.", 404)
        from apps.accounts.serializers import UserSerializer
        sections = Section.objects.filter(faculty_advisor=faculty, is_active=True)
        data = UserSerializer(faculty).data
        data["sections"] = SectionSerializer(sections, many=True).data
        return ok(data)

    def put(self, request, pk):
        try:
            faculty = User.objects.get(pk=pk, role="faculty")
        except User.DoesNotExist:
            return err("Faculty not found.", 404)
        allowed = ["full_name", "branch", "section", "is_active"]
        for f in allowed:
            if f in request.data:
                setattr(faculty, f, request.data[f])
        faculty.save()
        from apps.accounts.serializers import UserSerializer
        return ok(UserSerializer(faculty).data, "Faculty updated.")


# ─── Moderator Management ─────────────────────────────────────────────────────

class AdminModeratorListView(APIView):
    """GET /api/admin/moderators — list all moderators."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.accounts.serializers import UserSerializer
        qs = User.objects.filter(role="moderator")
        search = request.query_params.get("search", "")
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) | Q(email__icontains=search)
            )
        data = UserSerializer(qs, many=True).data
        return ok(data)


class AdminModeratorDetailView(APIView):
    """GET/PUT /api/admin/moderators/<id>"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        try:
            mod = User.objects.get(pk=pk, role="moderator")
        except User.DoesNotExist:
            return err("Moderator not found.", 404)
        from apps.accounts.serializers import UserSerializer
        sections = Section.objects.filter(moderator=mod, is_active=True)
        data = UserSerializer(mod).data
        data["sections"] = SectionSerializer(sections, many=True).data
        return ok(data)

    def put(self, request, pk):
        try:
            mod = User.objects.get(pk=pk, role="moderator")
        except User.DoesNotExist:
            return err("Moderator not found.", 404)
        allowed = ["full_name", "branch", "section", "is_active"]
        for f in allowed:
            if f in request.data:
                setattr(mod, f, request.data[f])
        mod.save()
        from apps.accounts.serializers import UserSerializer
        return ok(UserSerializer(mod).data, "Moderator updated.")


# ─── User Creation (Admin can create students/faculty/moderators) ──────────────

class AdminCreateUserView(APIView):
    """POST /api/admin/users/create — create a new user."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        email = request.data.get("email", "").strip().lower()
        full_name = request.data.get("full_name", "").strip()
        role = request.data.get("role", "student").strip()
        password = request.data.get("password", "CampusHub@123")

        if not email or not full_name:
            return err("email and full_name are required.")

        # Admin cannot create super_admin
        if role == "super_admin":
            return err("Admin cannot create Super Admin accounts.", 403)

        valid_roles = {"student", "faculty", "moderator"}
        if role not in valid_roles:
            return err(f"role must be one of: {', '.join(sorted(valid_roles))}.")

        if User.objects.filter(email=email).exists():
            return err("A user with this email already exists.")

        user = User.objects.create_user(
            email=email,
            password=password,
            full_name=full_name,
            role=role,
            branch=request.data.get("branch", ""),
            section=request.data.get("section", ""),
            semester=int(request.data.get("semester", 1)),
            student_id=request.data.get("student_id", ""),
            is_staff=role in ("faculty",),
        )

        try:
            from apps.audit.utils import log_action
            log_action(
                request, "user_create",
                f"Created {role} user {email}",
                "User", str(user.id)
            )
        except Exception:
            pass

        # Broadcast to admin dashboard
        self._broadcast_user_created(user)

        from apps.accounts.serializers import UserSerializer
        return ok(UserSerializer(user).data, f"{role.title()} created.", 201)

    def _broadcast_user_created(self, user):
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "admin_dashboard",
                {
                    "type": "user_activity",
                    "data": {
                        "action": "user_created",
                        "user_name": user.full_name,
                        "role": user.role,
                        "email": user.email,
                    },
                }
            )
        except Exception:
            pass


# ─── Enhanced Analytics ────────────────────────────────────────────────────────

class AdminLiveAnalyticsView(APIView):
    """GET /api/admin/live-analytics — real-time analytics data."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        now = timezone.now()
        d30 = now - timedelta(days=30)
        d7 = now - timedelta(days=7)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        # Student growth trend (last 30 days)
        student_growth = list(
            User.objects.filter(role="student", created_at__gte=d30)
            .annotate(date=TruncDate("created_at"))
            .values("date").annotate(count=Count("id")).order_by("date")
        )

        # Faculty activity (last 7 days)
        from apps.audit.models import UserActivityLog
        faculty_activity = list(
            UserActivityLog.objects.filter(
                role="faculty", created_at__gte=d7
            ).annotate(date=TruncDate("created_at"))
            .values("date").annotate(count=Count("id")).order_by("date")
        )

        # Attendance trends (last 30 days)
        from apps.attendance.models import SubjectAttendance
        attendance_trend = list(
            SubjectAttendance.objects.filter(updated_at__gte=d30)
            .annotate(date=TruncDate("updated_at"))
            .values("date").annotate(count=Count("id")).order_by("date")
        )

        # Assignment completion (last 30 days)
        from apps.assignments.models import AssignmentSubmission
        assignment_trend = list(
            AssignmentSubmission.objects.filter(submitted_at__gte=d30)
            .annotate(date=TruncDate("submitted_at"))
            .values("date").annotate(count=Count("id")).order_by("date")
        )

        # Resource upload trends
        from apps.resources.models import Resource
        resource_trend = list(
            Resource.objects.filter(created_at__gte=d30)
            .annotate(date=TruncDate("created_at"))
            .values("date").annotate(count=Count("id")).order_by("date")
        )

        # Study group activity
        from apps.study_groups.models import StudyGroup
        group_trend = list(
            StudyGroup.objects.filter(created_at__gte=d30)
            .annotate(date=TruncDate("created_at"))
            .values("date").annotate(count=Count("id")).order_by("date")
        )

        # Event participation
        from apps.events.models import EventRegistration
        event_trend = list(
            EventRegistration.objects.filter(registered_at__gte=d30)
            .annotate(date=TruncDate("registered_at"))
            .values("date").annotate(count=Count("id")).order_by("date")
        )

        # Placement activity
        from apps.placement.models import PlacementApplication
        placement_trend = list(
            PlacementApplication.objects.filter(created_at__gte=d30)
            .annotate(date=TruncDate("created_at"))
            .values("date").annotate(count=Count("id")).order_by("date")
        )

        # Department-wise student distribution
        dept_distribution = list(
            User.objects.filter(role="student", is_active=True)
            .values("branch").annotate(count=Count("id")).order_by("-count")
        )

        return ok({
            "student_growth": student_growth,
            "faculty_activity": faculty_activity,
            "attendance_trend": attendance_trend,
            "assignment_trend": assignment_trend,
            "resource_trend": resource_trend,
            "group_trend": group_trend,
            "event_trend": event_trend,
            "placement_trend": placement_trend,
            "dept_distribution": dept_distribution,
        })


# ─── Moderation Overview ───────────────────────────────────────────────────────

class AdminModerationOverviewView(APIView):
    """GET /api/admin/moderation-overview — pending items for admin."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        # Pending reports
        try:
            from apps.communication.models import MessageReport
            pending_reports = MessageReport.objects.filter(
                status="pending"
            ).count()
            recent_reports = list(
                MessageReport.objects.filter(status="pending")
                .order_by("-created_at")[:10]
                .values("id", "reason", "created_at")
            )
        except Exception:
            pending_reports = 0
            recent_reports = []

        # Channel requests
        try:
            from apps.communication.models import ChannelRequest
            pending_channels = ChannelRequest.objects.filter(
                status="pending"
            ).count()
        except Exception:
            pending_channels = 0

        # Pending roadmap reviews
        try:
            from apps.roadmaps.models import Roadmap
            pending_roadmaps = Roadmap.objects.filter(
                status="pending"
            ).count()
        except Exception:
            pending_roadmaps = 0

        # Content flags (notes pending moderation)
        try:
            from apps.notes.models import Note
            pending_notes = Note.objects.filter(
                status="pending", is_active=True
            ).count()
        except Exception:
            pending_notes = 0

        return ok({
            "pending_reports": pending_reports,
            "pending_channel_requests": pending_channels,
            "pending_roadmap_reviews": pending_roadmaps,
            "pending_content_flags": pending_notes,
            "recent_reports": recent_reports,
            "total_pending": (
                pending_reports + pending_channels +
                pending_roadmaps + pending_notes
            ),
        })


# ─── Academic Overview ─────────────────────────────────────────────────────────

class AdminAcademicOverviewView(APIView):
    """GET /api/admin/academic-overview — academic stats (read-only)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.attendance.models import SubjectAttendance
        from apps.assignments.models import Assignment, AssignmentSubmission
        from apps.cgpa.models import SemesterGrade

        # Department-wise attendance
        dept_attendance = []
        departments = Department.objects.filter(is_active=True)
        for dept in departments:
            records = SubjectAttendance.objects.filter(
                student__branch=dept.code
            )
            total = records.count()
            if total > 0:
                avg_pct = records.annotate(
                    pct=ExpressionWrapper(
                        F("attended_classes") * 100.0 / F("total_classes"),
                        output_field=FloatField(),
                    )
                ).filter(total_classes__gt=0).aggregate(avg=Avg("pct"))["avg"] or 0
            else:
                avg_pct = 0
            dept_attendance.append({
                "department": dept.code,
                "name": dept.name,
                "avg_attendance": round(avg_pct, 1),
                "total_records": total,
            })

        # Assignment completion rates
        total_assignments = Assignment.objects.filter(is_active=True).count()
        total_submissions = AssignmentSubmission.objects.count()
        graded_submissions = AssignmentSubmission.objects.filter(
            status="graded"
        ).count()

        # Low attendance students
        low_attendance = SubjectAttendance.objects.filter(
            total_classes__gt=0
        ).annotate(
            pct=ExpressionWrapper(
                F("attended_classes") * 100.0 / F("total_classes"),
                output_field=FloatField(),
            )
        ).filter(pct__lt=F("required_percentage")).select_related(
            "student"
        ).order_by("pct")[:20].values(
            "student__full_name", "student__branch",
            "subject_name", "pct"
        )

        # CGPA distribution
        try:
            cgpa_dist = list(
                SemesterGrade.objects.values("semester")
                .annotate(avg_sgpa=Avg("sgpa"))
                .order_by("semester")
            )
        except Exception:
            cgpa_dist = []

        return ok({
            "dept_attendance": dept_attendance,
            "assignments": {
                "total": total_assignments,
                "submissions": total_submissions,
                "graded": graded_submissions,
            },
            "low_attendance_students": list(low_attendance),
            "cgpa_distribution": cgpa_dist,
        })


# ─── Study Group Overview ──────────────────────────────────────────────────────

class AdminStudyGroupOverviewView(APIView):
    """GET /api/admin/study-groups — overview of all study groups."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.study_groups.models import StudyGroup, GroupMembership
        groups = StudyGroup.objects.all()
        active = groups.filter(is_active=True).count()
        total = groups.count()

        recent_groups = list(
            groups.order_by("-created_at")[:20].values(
                "id", "name", "subject", "branch", "visibility",
                "is_active", "created_at"
            )
        )
        # Add member counts
        for g in recent_groups:
            g["member_count"] = GroupMembership.objects.filter(
                group_id=g["id"], is_active=True
            ).count()

        return ok({
            "total": total,
            "active": active,
            "archived": total - active,
            "groups": recent_groups,
        })


class AdminStudyGroupActionView(APIView):
    """POST /api/admin/study-groups/<id>/action — archive/lock/remove."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        from apps.study_groups.models import StudyGroup
        try:
            group = StudyGroup.objects.get(pk=pk)
        except StudyGroup.DoesNotExist:
            return err("Study group not found.", 404)

        action = request.data.get("action")
        if action == "archive":
            group.is_active = False
            group.save(update_fields=["is_active", "updated_at"])
            return ok(message="Study group archived.")
        elif action == "activate":
            group.is_active = True
            group.save(update_fields=["is_active", "updated_at"])
            return ok(message="Study group activated.")
        else:
            return err("Invalid action. Use 'archive' or 'activate'.")


# ─── Channel Overview ──────────────────────────────────────────────────────────

class AdminChannelOverviewView(APIView):
    """GET /api/admin/channels-overview — overview of all channels."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.communication.models import Channel
        channels = Channel.objects.all()
        active = channels.filter(is_active=True).count()
        total = channels.count()
        locked = channels.filter(is_locked=True).count()
        archived = channels.filter(is_archived=True).count()

        recent_channels = list(
            channels.order_by("-created_at")[:20].values(
                "id", "name", "channel_type", "visibility",
                "member_count", "message_count", "is_active",
                "is_locked", "is_archived", "created_at"
            )
        )

        return ok({
            "total": total,
            "active": active,
            "locked": locked,
            "archived": archived,
            "channels": recent_channels,
        })


class AdminChannelActionView(APIView):
    """POST /api/admin/channels-overview/<id>/action — lock/archive."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        from apps.communication.models import Channel
        try:
            channel = Channel.objects.get(pk=pk)
        except Channel.DoesNotExist:
            return err("Channel not found.", 404)

        action = request.data.get("action")
        if action == "lock":
            channel.is_locked = True
            channel.save(update_fields=["is_locked", "updated_at"])
            return ok(message="Channel locked.")
        elif action == "unlock":
            channel.is_locked = False
            channel.save(update_fields=["is_locked", "updated_at"])
            return ok(message="Channel unlocked.")
        elif action == "archive":
            channel.is_archived = True
            channel.is_active = False
            channel.save(update_fields=["is_archived", "is_active", "updated_at"])
            return ok(message="Channel archived.")
        else:
            return err("Invalid action. Use 'lock', 'unlock', or 'archive'.")


# ─── Placement Overview ────────────────────────────────────────────────────────

class AdminPlacementOverviewView(APIView):
    """GET /api/admin/placement-overview — placement stats (view only)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.placement.models import PlacementApplication
        total = PlacementApplication.objects.count()
        by_status = list(
            PlacementApplication.objects.values("status")
            .annotate(count=Count("id")).order_by("-count")
        )
        recent = list(
            PlacementApplication.objects.select_related("student")
            .order_by("-created_at")[:20]
            .values(
                "id", "student__full_name", "company_name",
                "role_title", "status", "created_at"
            )
        )
        return ok({
            "total_applications": total,
            "by_status": by_status,
            "recent_applications": recent,
        })


# ─── Resource Overview ─────────────────────────────────────────────────────────

class AdminResourceOverviewView(APIView):
    """GET /api/admin/resource-overview — resource stats."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        from apps.resources.models import Resource
        total = Resource.objects.filter(is_active=True).count()
        by_type = list(
            Resource.objects.filter(is_active=True)
            .values("file_type").annotate(count=Count("id")).order_by("-count")
        )
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_uploads = Resource.objects.filter(created_at__gte=today_start).count()

        return ok({
            "total": total,
            "by_type": by_type,
            "today_uploads": today_uploads,
        })
