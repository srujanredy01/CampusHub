"""
Faculty Dashboard API views.
"""
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.contrib.auth import get_user_model
from django.db.models import Q, Count, Avg, Sum, F
from django.utils import timezone
from datetime import timedelta
import csv
import io

from .models import (
    FacultyProfile, FacultyAnnouncement, FacultyResource,
    AttendanceSession, AttendanceRecord, GradeEntry,
    FacultyChat, FacultyChatMessage, FacultyEvent,
    FacultyEventRegistration, AttendanceAlert,
    AdminFacultyAnnouncement, AdminFacultyAnnouncementRead,
)
from .serializers import (
    FacultyProfileSerializer, StudentListSerializer,
    FacultyAnnouncementSerializer, FacultyResourceSerializer,
    AttendanceSessionSerializer, AttendanceRecordSerializer,
    BulkAttendanceSerializer, GradeEntrySerializer,
    BulkGradeSerializer, FacultyDashboardStatsSerializer,
    FacultyChatSerializer, FacultyChatMessageSerializer,
    FacultyEventSerializer, FacultyEventRegistrationSerializer,
    AttendanceAlertSerializer, AdminFacultyAnnouncementSerializer,
)
from .permissions import IsFaculty, IsFacultyOrAdmin, IsPlacementCoordinator

User = get_user_model()


class FacultyDashboardView(generics.GenericAPIView):
    """Faculty dashboard overview with real-time stats."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get(self, request):
        user = request.user
        profile = getattr(user, "faculty_profile", None)
        now = timezone.now()
        today = now.date()

        # Get faculty's assigned scope
        sections = profile.sections_assigned if profile else []
        branches = profile.branches_assigned if profile else []
        semesters = profile.semesters_assigned if profile else []

        # Build student filter
        student_filter = Q(role="student", is_active=True)
        if sections:
            student_filter &= Q(section__in=sections)
        if branches:
            student_filter &= Q(branch__in=branches)

        total_students = User.objects.filter(student_filter).count()

        # Pending assignments (created by this faculty, deadline not passed, ungraded submissions)
        from apps.assignments.models import Assignment, AssignmentSubmission
        my_assignments = Assignment.objects.filter(created_by=user, is_active=True)
        pending_assignments = my_assignments.filter(deadline__gte=now).count()
        pending_evaluations = AssignmentSubmission.objects.filter(
            assignment__created_by=user,
            status="submitted"
        ).count()

        # Low attendance students
        from apps.attendance.models import SubjectAttendance
        low_attendance = SubjectAttendance.objects.filter(
            student__role="student",
            student__is_active=True,
        ).annotate(
            pct=F("attended_classes") * 100.0 / F("total_classes")
        ).filter(pct__lt=75, total_classes__gt=0).values("student").distinct().count()

        # Today's classes
        todays_classes = AttendanceSession.objects.filter(
            faculty=user, date=today
        ).count()

        # Recent submissions (last 7 days)
        recent_submissions = AssignmentSubmission.objects.filter(
            assignment__created_by=user,
            submitted_at__gte=now - timedelta(days=7)
        ).count()

        # Announcements
        total_announcements = FacultyAnnouncement.objects.filter(
            faculty=user, is_active=True
        ).count()

        # Study groups in faculty's scope
        from apps.study_groups.models import StudyGroup
        study_groups_count = StudyGroup.objects.filter(is_active=True).count()

        # Upcoming events
        from apps.events.models import Event
        upcoming_events = Event.objects.filter(
            starts_at__gte=now,
            status__in=["published", "registration_open"]
        ).count()

        # Unread chat messages
        unread_messages = FacultyChat.objects.filter(
            faculty=user, is_active=True, unread_count_faculty__gt=0
        ).count()

        # Faculty events
        faculty_events = FacultyEvent.objects.filter(
            faculty=user, is_active=True, starts_at__gte=now
        ).count()

        # Recent resource uploads
        recent_resources = FacultyResource.objects.filter(
            faculty=user, is_active=True,
            created_at__gte=now - timedelta(days=7)
        ).count()

        data = {
            "total_students": total_students,
            "pending_assignments": pending_assignments,
            "pending_evaluations": pending_evaluations,
            "low_attendance_students": low_attendance,
            "todays_classes": todays_classes,
            "recent_submissions": recent_submissions,
            "total_announcements": total_announcements,
            "study_groups_count": study_groups_count,
            "upcoming_events": upcoming_events + faculty_events,
            "unread_messages": unread_messages,
            "recent_resources": recent_resources,
        }

        return Response({"status": "success", "data": data})


class FacultyProfileViewSet(viewsets.ModelViewSet):
    """Manage faculty profile."""
    serializer_class = FacultyProfileSerializer
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get_queryset(self):
        if self.request.user.role in ("admin", "super_admin"):
            return FacultyProfile.objects.all()
        return FacultyProfile.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"])
    def me(self, request):
        profile, _ = FacultyProfile.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(profile)
        return Response({"status": "success", "data": serializer.data})


class StudentManagementView(generics.ListAPIView):
    """Faculty view of students with filtering."""
    serializer_class = StudentListSerializer
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get_queryset(self):
        qs = User.objects.filter(role="student", is_active=True)
        profile = getattr(self.request.user, "faculty_profile", None)

        # Apply scope filters
        if profile and profile.sections_assigned:
            qs = qs.filter(section__in=profile.sections_assigned)
        if profile and profile.branches_assigned:
            qs = qs.filter(branch__in=profile.branches_assigned)

        # Query params
        section = self.request.query_params.get("section")
        branch = self.request.query_params.get("branch")
        semester = self.request.query_params.get("semester")
        search = self.request.query_params.get("search")

        if section:
            qs = qs.filter(section=section)
        if branch:
            qs = qs.filter(branch=branch)
        if semester:
            qs = qs.filter(semester=semester)
        if search:
            qs = qs.filter(
                Q(full_name__icontains=search) |
                Q(student_id__icontains=search) |
                Q(email__icontains=search)
            )

        return qs.order_by("full_name")


class FacultyAnnouncementViewSet(viewsets.ModelViewSet):
    """CRUD for faculty announcements."""
    serializer_class = FacultyAnnouncementSerializer
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        if self.request.user.role in ("admin", "super_admin"):
            return FacultyAnnouncement.objects.all()
        return FacultyAnnouncement.objects.filter(faculty=self.request.user)

    def perform_create(self, serializer):
        serializer.save(faculty=self.request.user)


class FacultyResourceViewSet(viewsets.ModelViewSet):
    """CRUD for faculty resources."""
    serializer_class = FacultyResourceSerializer
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        if self.request.user.role in ("admin", "super_admin"):
            return FacultyResource.objects.all()
        return FacultyResource.objects.filter(faculty=self.request.user)

    def perform_create(self, serializer):
        instance = serializer.save(faculty=self.request.user)
        if instance.file:
            instance.file_name = instance.file.name
            instance.file_size = instance.file.size
            instance.save(update_fields=["file_name", "file_size"])


class AttendanceSessionViewSet(viewsets.ModelViewSet):
    """Manage attendance sessions."""
    serializer_class = AttendanceSessionSerializer
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get_queryset(self):
        qs = AttendanceSession.objects.filter(faculty=self.request.user)
        date = self.request.query_params.get("date")
        subject = self.request.query_params.get("subject")
        section = self.request.query_params.get("section")
        if date:
            qs = qs.filter(date=date)
        if subject:
            qs = qs.filter(subject__icontains=subject)
        if section:
            qs = qs.filter(section=section)
        return qs

    def perform_create(self, serializer):
        serializer.save(faculty=self.request.user)

    @action(detail=True, methods=["get"])
    def records(self, request, pk=None):
        session = self.get_object()
        records = AttendanceRecord.objects.filter(session=session)
        serializer = AttendanceRecordSerializer(records, many=True)
        return Response({"status": "success", "data": serializer.data})

    @action(detail=False, methods=["post"])
    def bulk_mark(self, request):
        """Bulk mark attendance for a session."""
        serializer = BulkAttendanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Create or get session
        session, created = AttendanceSession.objects.get_or_create(
            faculty=request.user,
            subject=data["subject"],
            branch=data["branch"],
            semester=data["semester"],
            section=data["section"],
            date=data["date"],
            defaults={
                "subject_code": data.get("subject_code", ""),
                "period": data.get("period", ""),
                "topic_covered": data.get("topic_covered", ""),
            }
        )

        records_created = 0
        for record_data in data["records"]:
            student_id = record_data.get("student_id")
            record_status = record_data.get("status", "present")
            try:
                student = User.objects.get(id=student_id, role="student")
                AttendanceRecord.objects.update_or_create(
                    session=session,
                    student=student,
                    defaults={"status": record_status, "remarks": record_data.get("remarks", "")}
                )
                records_created += 1

                # Update SubjectAttendance
                from apps.attendance.models import SubjectAttendance
                sa, _ = SubjectAttendance.objects.get_or_create(
                    student=student,
                    subject_name=data["subject"],
                    semester=data["semester"],
                    defaults={"subject_code": data.get("subject_code", "")}
                )
                sa.total_classes = F("total_classes") + 1
                if record_status in ("present", "late"):
                    sa.attended_classes = F("attended_classes") + 1
                sa.save()

                # Refresh from DB to get actual values for alert check
                sa.refresh_from_db()

                # Generate attendance alerts automatically
                alert = AttendanceAlert.generate_alerts(student, sa)
                if alert:
                    # Send real-time notification
                    from channels.layers import get_channel_layer
                    from asgiref.sync import async_to_sync
                    channel_layer = get_channel_layer()
                    if channel_layer:
                        # Notify faculty
                        async_to_sync(channel_layer.group_send)(
                            f"faculty_{request.user.id}",
                            {
                                "type": "attendance_alert",
                                "data": {
                                    "student_name": student.full_name,
                                    "subject": data["subject"],
                                    "percentage": float(sa.attendance_percentage),
                                    "level": alert.alert_level,
                                },
                            }
                        )
                        # Notify student
                        async_to_sync(channel_layer.group_send)(
                            f"user_attendance_{student.id}",
                            {
                                "type": "attendance_updated",
                                "subject": data["subject"],
                                "summary": {
                                    "percentage": float(sa.attendance_percentage),
                                    "alert_level": alert.alert_level,
                                },
                            }
                        )

            except User.DoesNotExist:
                continue

        # Update session counts
        session.total_students = session.records.count()
        session.present_count = session.records.filter(status__in=["present", "late"]).count()
        session.absent_count = session.records.filter(status="absent").count()
        session.save()

        return Response({
            "status": "success",
            "message": f"Attendance marked for {records_created} students",
            "data": AttendanceSessionSerializer(session).data
        }, status=status.HTTP_201_CREATED)


class GradeEntryViewSet(viewsets.ModelViewSet):
    """Manage grade entries."""
    serializer_class = GradeEntrySerializer
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get_queryset(self):
        qs = GradeEntry.objects.filter(faculty=self.request.user)
        subject = self.request.query_params.get("subject")
        section = self.request.query_params.get("section")
        exam_type = self.request.query_params.get("exam_type")
        if subject:
            qs = qs.filter(subject__icontains=subject)
        if section:
            qs = qs.filter(section=section)
        if exam_type:
            qs = qs.filter(exam_type=exam_type)
        return qs

    def perform_create(self, serializer):
        serializer.save(faculty=self.request.user)

    @action(detail=False, methods=["post"])
    def bulk_upload(self, request):
        """Bulk upload grades."""
        serializer = BulkGradeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        grades_created = 0
        for grade_data in data["grades"]:
            student_id = grade_data.get("student_id")
            try:
                student = User.objects.get(id=student_id, role="student")
                GradeEntry.objects.update_or_create(
                    faculty=request.user,
                    student=student,
                    subject=data["subject"],
                    semester=data["semester"],
                    exam_type=data["exam_type"],
                    defaults={
                        "subject_code": data.get("subject_code", ""),
                        "branch": data["branch"],
                        "section": data["section"],
                        "marks_obtained": grade_data["marks_obtained"],
                        "max_marks": data["max_marks"],
                        "remarks": grade_data.get("remarks", ""),
                    }
                )
                grades_created += 1
            except User.DoesNotExist:
                continue

        return Response({
            "status": "success",
            "message": f"Grades uploaded for {grades_created} students"
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def analytics(self, request):
        """Subject-wise grade analytics."""
        subject = request.query_params.get("subject")
        section = request.query_params.get("section")
        semester = request.query_params.get("semester")

        qs = GradeEntry.objects.filter(faculty=request.user)
        if subject:
            qs = qs.filter(subject=subject)
        if section:
            qs = qs.filter(section=section)
        if semester:
            qs = qs.filter(semester=semester)

        stats = qs.aggregate(
            avg_marks=Avg("marks_obtained"),
            total_entries=Count("id"),
            max_marks_val=Avg("max_marks"),
        )

        # Pass/fail distribution
        pass_count = qs.filter(marks_obtained__gte=F("max_marks") * 0.4).count()
        fail_count = qs.filter(marks_obtained__lt=F("max_marks") * 0.4).count()

        # Top performers
        top_students = qs.order_by("-marks_obtained")[:10].values(
            "student__full_name", "student__student_id", "marks_obtained", "max_marks"
        )

        return Response({
            "status": "success",
            "data": {
                "average_marks": round(stats["avg_marks"] or 0, 2),
                "total_entries": stats["total_entries"],
                "pass_count": pass_count,
                "fail_count": fail_count,
                "top_performers": list(top_students),
            }
        })


class AttendanceAnalyticsView(generics.GenericAPIView):
    """Attendance analytics for faculty."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get(self, request):
        from apps.attendance.models import SubjectAttendance

        subject = request.query_params.get("subject")
        section = request.query_params.get("section")
        branch = request.query_params.get("branch")

        qs = SubjectAttendance.objects.filter(total_classes__gt=0)

        profile = getattr(request.user, "faculty_profile", None)
        if profile and profile.subjects:
            qs = qs.filter(subject_name__in=profile.subjects)

        if subject:
            qs = qs.filter(subject_name__icontains=subject)
        if section:
            qs = qs.filter(student__section=section)
        if branch:
            qs = qs.filter(student__branch=branch)

        # Overall stats
        total_records = qs.count()
        low_attendance = qs.annotate(
            pct=F("attended_classes") * 100.0 / F("total_classes")
        ).filter(pct__lt=75).count()

        # Subject-wise breakdown
        subject_stats = qs.values("subject_name").annotate(
            avg_attendance=Avg(F("attended_classes") * 100.0 / F("total_classes")),
            student_count=Count("student", distinct=True),
            low_count=Count("id", filter=Q(attended_classes__lt=F("total_classes") * 0.75)),
        ).order_by("subject_name")

        return Response({
            "status": "success",
            "data": {
                "total_records": total_records,
                "low_attendance_count": low_attendance,
                "subject_breakdown": list(subject_stats),
            }
        })


class AssignmentManagementView(generics.GenericAPIView):
    """Faculty assignment management with submission tracking."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get(self, request):
        from apps.assignments.models import Assignment, AssignmentSubmission

        assignments = Assignment.objects.filter(
            created_by=request.user, is_active=True
        ).annotate(
            total_submissions=Count("submissions"),
            graded_count=Count("submissions", filter=Q(submissions__status="graded")),
            pending_count=Count("submissions", filter=Q(submissions__status="submitted")),
        ).order_by("-created_at")

        data = []
        for a in assignments[:20]:
            data.append({
                "id": str(a.id),
                "title": a.title,
                "subject": a.subject,
                "branch": a.branch,
                "semester": a.semester,
                "section": a.section,
                "deadline": a.deadline.isoformat(),
                "max_marks": a.max_marks,
                "total_submissions": a.total_submissions,
                "graded_count": a.graded_count,
                "pending_count": a.pending_count,
                "created_at": a.created_at.isoformat(),
            })

        return Response({"status": "success", "data": data})


class FacultyStudentDetailView(generics.GenericAPIView):
    """Detailed student view for faculty — academic performance, attendance, submissions."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get(self, request, pk):
        try:
            student = User.objects.get(pk=pk, role="student")
        except User.DoesNotExist:
            return Response({"status": "error", "message": "Student not found"}, status=404)

        from apps.attendance.models import SubjectAttendance
        from apps.assignments.models import AssignmentSubmission
        from apps.cgpa.models import AcademicProfile

        # Attendance
        attendance = SubjectAttendance.objects.filter(student=student)
        attendance_data = [{
            "subject": a.subject_name,
            "total": a.total_classes,
            "attended": a.attended_classes,
            "percentage": a.attendance_percentage,
            "is_shortage": a.is_shortage,
        } for a in attendance]

        # Submissions for this faculty's assignments
        submissions = AssignmentSubmission.objects.filter(
            student=student,
            assignment__created_by=request.user
        ).select_related("assignment").order_by("-submitted_at")[:10]
        submission_data = [{
            "assignment": s.assignment.title,
            "status": s.status,
            "marks": str(s.marks) if s.marks else None,
            "max_marks": s.assignment.max_marks,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        } for s in submissions]

        # Academic profile
        academic = None
        try:
            profile = AcademicProfile.objects.get(user=student)
            academic = {
                "cgpa": str(profile.current_cgpa),
                "total_credits": profile.total_credits_earned,
                "standing": profile.academic_standing,
            }
        except AcademicProfile.DoesNotExist:
            pass

        # Grades from this faculty
        grades = GradeEntry.objects.filter(
            faculty=request.user, student=student
        ).order_by("-created_at")[:10]
        grade_data = [{
            "subject": g.subject,
            "exam_type": g.exam_type,
            "marks": str(g.marks_obtained),
            "max_marks": str(g.max_marks),
            "percentage": g.percentage,
        } for g in grades]

        return Response({
            "status": "success",
            "data": {
                "student": {
                    "id": str(student.id),
                    "full_name": student.full_name,
                    "student_id": student.student_id,
                    "email": student.email,
                    "branch": student.branch,
                    "semester": student.semester,
                    "section": student.section,
                },
                "attendance": attendance_data,
                "submissions": submission_data,
                "academic": academic,
                "grades": grade_data,
            }
        })


class FacultyAssignmentCreateView(generics.GenericAPIView):
    """Create new assignment."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        from apps.assignments.models import Assignment
        from apps.assignments.serializers import AssignmentSerializer

        serializer = AssignmentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=400)

        assignment = serializer.save(created_by=request.user)

        # Update faculty stats
        profile = getattr(request.user, "faculty_profile", None)
        if profile:
            profile.total_assignments_created += 1
            profile.save(update_fields=["total_assignments_created"])

        return Response({
            "status": "success",
            "message": "Assignment created successfully",
            "data": AssignmentSerializer(assignment).data
        }, status=status.HTTP_201_CREATED)


class FacultyAssignmentDetailView(generics.GenericAPIView):
    """Get/Update/Delete assignment."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        from apps.assignments.models import Assignment, AssignmentSubmission

        try:
            assignment = Assignment.objects.get(pk=pk, created_by=request.user)
        except Assignment.DoesNotExist:
            return Response({"status": "error", "message": "Assignment not found"}, status=404)

        submissions = AssignmentSubmission.objects.filter(assignment=assignment)
        return Response({
            "status": "success",
            "data": {
                "id": str(assignment.id),
                "title": assignment.title,
                "description": assignment.description,
                "subject": assignment.subject,
                "branch": assignment.branch,
                "semester": assignment.semester,
                "section": assignment.section,
                "deadline": assignment.deadline.isoformat(),
                "max_marks": assignment.max_marks,
                "is_active": assignment.is_active,
                "total_submissions": submissions.count(),
                "graded": submissions.filter(status="graded").count(),
                "pending": submissions.filter(status="submitted").count(),
                "created_at": assignment.created_at.isoformat(),
            }
        })

    def put(self, request, pk):
        from apps.assignments.models import Assignment

        try:
            assignment = Assignment.objects.get(pk=pk, created_by=request.user)
        except Assignment.DoesNotExist:
            return Response({"status": "error", "message": "Assignment not found"}, status=404)

        allowed_fields = ["title", "description", "subject", "deadline", "max_marks", "is_active"]
        for field in allowed_fields:
            if field in request.data:
                setattr(assignment, field, request.data[field])
        assignment.save()

        return Response({"status": "success", "message": "Assignment updated"})

    def delete(self, request, pk):
        from apps.assignments.models import Assignment

        try:
            assignment = Assignment.objects.get(pk=pk, created_by=request.user)
        except Assignment.DoesNotExist:
            return Response({"status": "error", "message": "Assignment not found"}, status=404)

        assignment.is_active = False
        assignment.save(update_fields=["is_active"])
        return Response({"status": "success", "message": "Assignment deleted"})


class FacultySubmissionReviewView(generics.GenericAPIView):
    """Review and grade submissions."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get(self, request, pk):
        """Get all submissions for an assignment."""
        from apps.assignments.models import Assignment, AssignmentSubmission

        try:
            assignment = Assignment.objects.get(pk=pk, created_by=request.user)
        except Assignment.DoesNotExist:
            return Response({"status": "error", "message": "Assignment not found"}, status=404)

        submissions = AssignmentSubmission.objects.filter(
            assignment=assignment
        ).select_related("student").order_by("-submitted_at")

        data = [{
            "id": str(s.id),
            "student_name": s.student.full_name,
            "student_id": s.student.student_id,
            "status": s.status,
            "content": s.content[:200] if s.content else "",
            "file": s.file.url if s.file else None,
            "marks": str(s.marks) if s.marks else None,
            "feedback": s.feedback,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        } for s in submissions]

        return Response({"status": "success", "data": data})

    def post(self, request, sub_id=None, pk=None):
        """Grade a submission."""
        from apps.assignments.models import AssignmentSubmission

        target_id = sub_id or pk
        try:
            submission = AssignmentSubmission.objects.get(
                pk=target_id,
                assignment__created_by=request.user
            )
        except AssignmentSubmission.DoesNotExist:
            return Response({"status": "error", "message": "Submission not found"}, status=404)

        marks = request.data.get("marks")
        feedback = request.data.get("feedback", "")
        action = request.data.get("action", "grade")  # grade or return

        if action == "grade":
            if marks is None:
                return Response({"status": "error", "message": "Marks required"}, status=400)
            submission.marks = marks
            submission.feedback = feedback
            submission.status = "graded"
            submission.graded_by = request.user
            submission.graded_at = timezone.now()
        elif action == "return":
            submission.feedback = feedback
            submission.status = "returned"

        submission.save()

        return Response({"status": "success", "message": f"Submission {action}d successfully"})


class FacultyAcademicAnalyticsView(generics.GenericAPIView):
    """Comprehensive academic analytics for faculty."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get(self, request):
        from apps.attendance.models import SubjectAttendance
        from apps.assignments.models import Assignment, AssignmentSubmission
        from apps.cgpa.models import AcademicProfile

        profile = getattr(request.user, "faculty_profile", None)
        subjects = profile.subjects if profile else []

        # Top performers (by grades)
        top_performers = GradeEntry.objects.filter(
            faculty=request.user
        ).values("student__full_name", "student__student_id").annotate(
            avg_marks=Avg(F("marks_obtained") * 100.0 / F("max_marks"))
        ).order_by("-avg_marks")[:10]

        # Weak students (below 40%)
        weak_students = GradeEntry.objects.filter(
            faculty=request.user
        ).values("student__full_name", "student__student_id").annotate(
            avg_marks=Avg(F("marks_obtained") * 100.0 / F("max_marks"))
        ).filter(avg_marks__lt=40).order_by("avg_marks")[:10]

        # Subject performance
        subject_perf = GradeEntry.objects.filter(
            faculty=request.user
        ).values("subject").annotate(
            avg_marks=Avg(F("marks_obtained") * 100.0 / F("max_marks")),
            total_students=Count("student", distinct=True),
            pass_count=Count("id", filter=Q(marks_obtained__gte=F("max_marks") * 0.4)),
            fail_count=Count("id", filter=Q(marks_obtained__lt=F("max_marks") * 0.4)),
        ).order_by("subject")

        # Section comparison
        section_comp = GradeEntry.objects.filter(
            faculty=request.user
        ).values("section").annotate(
            avg_marks=Avg(F("marks_obtained") * 100.0 / F("max_marks")),
            student_count=Count("student", distinct=True),
        ).order_by("section")

        # Attendance vs marks correlation
        attendance_marks = []
        if subjects:
            students_with_grades = GradeEntry.objects.filter(
                faculty=request.user
            ).values_list("student", flat=True).distinct()[:50]

            for student_id in students_with_grades:
                att = SubjectAttendance.objects.filter(
                    student_id=student_id,
                    subject_name__in=subjects
                ).aggregate(
                    avg_att=Avg(F("attended_classes") * 100.0 / F("total_classes"))
                )
                grade = GradeEntry.objects.filter(
                    faculty=request.user, student_id=student_id
                ).aggregate(
                    avg_grade=Avg(F("marks_obtained") * 100.0 / F("max_marks"))
                )
                if att["avg_att"] and grade["avg_grade"]:
                    attendance_marks.append({
                        "attendance": round(att["avg_att"], 1),
                        "marks": round(grade["avg_grade"], 1),
                    })

        return Response({
            "status": "success",
            "data": {
                "top_performers": list(top_performers),
                "weak_students": list(weak_students),
                "subject_performance": list(subject_perf),
                "section_comparison": list(section_comp),
                "attendance_vs_marks": attendance_marks,
            }
        })


class FacultyAttendanceExportView(generics.GenericAPIView):
    """Export attendance data as CSV."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get(self, request):
        from django.http import HttpResponse

        subject = request.query_params.get("subject", "")
        section = request.query_params.get("section", "")

        sessions = AttendanceSession.objects.filter(faculty=request.user)
        if subject:
            sessions = sessions.filter(subject__icontains=subject)
        if section:
            sessions = sessions.filter(section=section)

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="attendance_export.csv"'
        writer = csv.writer(response)
        writer.writerow(["Date", "Subject", "Section", "Student Name", "Student ID", "Status"])

        for session in sessions.prefetch_related("records__student"):
            for record in session.records.all():
                writer.writerow([
                    session.date.isoformat(),
                    session.subject,
                    session.section,
                    record.student.full_name,
                    record.student.student_id or "",
                    record.status,
                ])

        return response


class FacultyNoteVerificationView(generics.GenericAPIView):
    """Faculty can verify student-uploaded notes."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get(self, request):
        """Get notes pending verification."""
        from apps.notes.models import Note

        profile = getattr(request.user, "faculty_profile", None)
        qs = Note.objects.filter(status="approved", is_active=True)

        if profile and profile.subjects:
            qs = qs.filter(subject__in=profile.subjects)

        notes = qs.order_by("-created_at")[:20]
        data = [{
            "id": str(n.id),
            "title": n.title,
            "subject": n.subject,
            "branch": n.branch,
            "semester": n.semester,
            "uploaded_by": n.uploaded_by.full_name if n.uploaded_by else "",
            "is_faculty_verified": getattr(n, "is_faculty_verified", False),
            "created_at": n.created_at.isoformat(),
        } for n in notes]

        return Response({"status": "success", "data": data})

    def post(self, request, pk=None):
        """Verify or reject a note."""
        from apps.notes.models import Note

        if not pk:
            return Response({"status": "error", "message": "Note ID required"}, status=400)

        try:
            note = Note.objects.get(pk=pk)
        except Note.DoesNotExist:
            return Response({"status": "error", "message": "Note not found"}, status=404)

        action = request.data.get("action", "verify")
        if action == "verify":
            note.is_faculty_verified = True
            note.verified_by = request.user
            note.save()
            return Response({"status": "success", "message": "Note verified"})
        else:
            return Response({"status": "success", "message": "Note rejected"})


class FacultyPlacementView(generics.GenericAPIView):
    """Placement coordinator features."""
    permission_classes = [IsAuthenticated, IsPlacementCoordinator]

    def get(self, request):
        from apps.placement.models import PlacementDrive, PlacementApplication

        drives = PlacementDrive.objects.filter(is_active=True).order_by("-created_at")[:10]
        drive_data = [{
            "id": str(d.id),
            "company_name": d.company_name,
            "role": d.role,
            "package_lpa": str(d.package_lpa) if hasattr(d, "package_lpa") else "",
            "deadline": d.deadline.isoformat() if hasattr(d, "deadline") and d.deadline else None,
            "applications_count": d.applications.count() if hasattr(d, "applications") else 0,
            "created_at": d.created_at.isoformat(),
        } for d in drives]

        total_applications = PlacementApplication.objects.count()
        offers = PlacementApplication.objects.filter(status__in=["offer", "accepted"]).count()

        return Response({
            "status": "success",
            "data": {
                "drives": drive_data,
                "total_applications": total_applications,
                "total_offers": offers,
            }
        })


# ══════════════════════════════════════════════════════════════════════════════
# FACULTY CHAT VIEWS
# ══════════════════════════════════════════════════════════════════════════════


class FacultyChatListView(generics.GenericAPIView):
    """List all chats for the faculty member."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get(self, request):
        user = request.user
        if user.role in ("admin", "super_admin"):
            chats = FacultyChat.objects.filter(is_active=True)
        else:
            chats = FacultyChat.objects.filter(
                Q(faculty=user) | Q(student=user), is_active=True
            )

        chat_type = request.query_params.get("type")
        if chat_type:
            chats = chats.filter(chat_type=chat_type)

        serializer = FacultyChatSerializer(chats[:50], many=True)
        return Response({"status": "success", "data": serializer.data})


class FacultyChatCreateView(generics.GenericAPIView):
    """Create a new chat conversation."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        chat_type = request.data.get("chat_type", "private")
        student_id = request.data.get("student_id")
        title = request.data.get("title", "")
        subject = request.data.get("subject", "")
        section = request.data.get("section", "")

        user = request.user

        # Determine faculty
        if user.role == "faculty":
            faculty = user
        elif user.role == "student" and student_id is None:
            # Student initiating chat with a faculty
            faculty_id = request.data.get("faculty_id")
            if not faculty_id:
                return Response({"status": "error", "message": "faculty_id required"}, status=400)
            try:
                faculty = User.objects.get(id=faculty_id, role="faculty")
            except User.DoesNotExist:
                return Response({"status": "error", "message": "Faculty not found"}, status=404)
            student_id = str(user.id)
        else:
            faculty = user

        # For private chats, check if one already exists
        if chat_type == "private" and student_id:
            existing = FacultyChat.objects.filter(
                faculty=faculty, student_id=student_id, chat_type="private", is_active=True
            ).first()
            if existing:
                serializer = FacultyChatSerializer(existing)
                return Response({"status": "success", "data": serializer.data})

        chat_data = {
            "faculty": faculty,
            "chat_type": chat_type,
            "title": title,
            "subject": subject,
            "section": section,
        }
        if student_id:
            try:
                student = User.objects.get(id=student_id, role="student")
                chat_data["student"] = student
            except User.DoesNotExist:
                return Response({"status": "error", "message": "Student not found"}, status=404)

        chat = FacultyChat.objects.create(**chat_data)
        serializer = FacultyChatSerializer(chat)
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_201_CREATED)


class FacultyChatDetailView(generics.GenericAPIView):
    """Get chat details or update chat settings."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            chat = FacultyChat.objects.get(pk=pk, is_active=True)
        except FacultyChat.DoesNotExist:
            return Response({"status": "error", "message": "Chat not found"}, status=404)

        # Verify access
        if request.user.role not in ("admin", "super_admin"):
            if chat.faculty != request.user and chat.student != request.user:
                return Response({"status": "error", "message": "Access denied"}, status=403)

        serializer = FacultyChatSerializer(chat)
        return Response({"status": "success", "data": serializer.data})

    def put(self, request, pk):
        """Update chat settings (mute, etc.)."""
        try:
            chat = FacultyChat.objects.get(pk=pk, is_active=True)
        except FacultyChat.DoesNotExist:
            return Response({"status": "error", "message": "Chat not found"}, status=404)

        if request.user.role == "faculty" and chat.faculty == request.user:
            if "is_muted_by_faculty" in request.data:
                chat.is_muted_by_faculty = request.data["is_muted_by_faculty"]
                chat.save(update_fields=["is_muted_by_faculty"])

        return Response({"status": "success", "message": "Chat updated"})

    def delete(self, request, pk):
        """Deactivate a chat."""
        try:
            chat = FacultyChat.objects.get(pk=pk)
        except FacultyChat.DoesNotExist:
            return Response({"status": "error", "message": "Chat not found"}, status=404)

        if request.user.role not in ("admin", "super_admin") and chat.faculty != request.user:
            return Response({"status": "error", "message": "Access denied"}, status=403)

        chat.is_active = False
        chat.save(update_fields=["is_active"])
        return Response({"status": "success", "message": "Chat closed"})


class FacultyChatMessageListView(generics.GenericAPIView):
    """Get messages for a chat."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            chat = FacultyChat.objects.get(pk=pk, is_active=True)
        except FacultyChat.DoesNotExist:
            return Response({"status": "error", "message": "Chat not found"}, status=404)

        # Verify access
        if request.user.role not in ("admin", "super_admin"):
            if chat.faculty != request.user and chat.student != request.user:
                return Response({"status": "error", "message": "Access denied"}, status=403)

        messages = FacultyChatMessage.objects.filter(
            chat=chat, is_deleted=False
        ).select_related("sender").order_by("-created_at")[:100]

        serializer = FacultyChatMessageSerializer(list(reversed(messages)), many=True)

        # Mark as read
        if request.user == chat.faculty:
            chat.unread_count_faculty = 0
            chat.save(update_fields=["unread_count_faculty"])
        elif request.user == chat.student:
            chat.unread_count_student = 0
            chat.save(update_fields=["unread_count_student"])

        return Response({"status": "success", "data": serializer.data})


class FacultyChatSendMessageView(generics.GenericAPIView):
    """Send a message in a chat (REST fallback for non-WebSocket clients)."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        try:
            chat = FacultyChat.objects.get(pk=pk, is_active=True)
        except FacultyChat.DoesNotExist:
            return Response({"status": "error", "message": "Chat not found"}, status=404)

        # Verify access
        if request.user.role not in ("admin", "super_admin"):
            if chat.faculty != request.user and chat.student != request.user:
                return Response({"status": "error", "message": "Access denied"}, status=403)

        content = request.data.get("content", "").strip()
        message_type = request.data.get("message_type", "text")
        file = request.FILES.get("file")

        if not content and not file:
            return Response({"status": "error", "message": "Content or file required"}, status=400)

        message = FacultyChatMessage.objects.create(
            chat=chat,
            sender=request.user,
            content=content,
            message_type=message_type,
        )

        if file:
            message.file = file
            message.file_name = file.name
            message.message_type = "file"
            message.save(update_fields=["file", "file_name", "message_type"])

        # Update chat metadata
        chat.last_message_at = timezone.now()
        if request.user == chat.faculty:
            chat.unread_count_student += 1
        else:
            chat.unread_count_faculty += 1
        chat.save(update_fields=["last_message_at", "unread_count_student", "unread_count_faculty"])

        # Send WebSocket notification
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            # Notify the other party
            target_user = chat.student if request.user == chat.faculty else chat.faculty
            if target_user:
                async_to_sync(channel_layer.group_send)(
                    f"faculty_{target_user.id}",
                    {
                        "type": "new_chat_message",
                        "data": {
                            "chat_id": str(chat.id),
                            "sender_name": request.user.full_name,
                            "content": content[:100],
                            "message_type": message_type,
                        },
                    }
                )

        serializer = FacultyChatMessageSerializer(message)
        return Response({"status": "success", "data": serializer.data}, status=status.HTTP_201_CREATED)


# ══════════════════════════════════════════════════════════════════════════════
# FACULTY EVENT VIEWS
# ══════════════════════════════════════════════════════════════════════════════


class FacultyEventListView(generics.GenericAPIView):
    """List and create faculty events."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        if request.user.role in ("admin", "super_admin"):
            events = FacultyEvent.objects.filter(is_active=True)
        else:
            events = FacultyEvent.objects.filter(faculty=request.user, is_active=True)

        event_type = request.query_params.get("type")
        status_filter = request.query_params.get("status")
        if event_type:
            events = events.filter(event_type=event_type)
        if status_filter:
            events = events.filter(status=status_filter)

        serializer = FacultyEventSerializer(events[:30], many=True)
        return Response({"status": "success", "data": serializer.data})

    def post(self, request):
        serializer = FacultyEventSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"status": "error", "errors": serializer.errors}, status=400)

        event = serializer.save(faculty=request.user)

        # Send notification to targeted students
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                "faculty_all",
                {
                    "type": "event_reminder",
                    "data": {
                        "event_id": str(event.id),
                        "title": event.title,
                        "event_type": event.event_type,
                        "starts_at": event.starts_at.isoformat(),
                    },
                }
            )

        return Response({
            "status": "success",
            "data": FacultyEventSerializer(event).data
        }, status=status.HTTP_201_CREATED)


class FacultyEventDetailView(generics.GenericAPIView):
    """Get/Update/Delete a faculty event."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        try:
            event = FacultyEvent.objects.get(pk=pk, is_active=True)
        except FacultyEvent.DoesNotExist:
            return Response({"status": "error", "message": "Event not found"}, status=404)

        serializer = FacultyEventSerializer(event)
        return Response({"status": "success", "data": serializer.data})

    def put(self, request, pk):
        try:
            event = FacultyEvent.objects.get(pk=pk, faculty=request.user)
        except FacultyEvent.DoesNotExist:
            if request.user.role in ("admin", "super_admin"):
                try:
                    event = FacultyEvent.objects.get(pk=pk)
                except FacultyEvent.DoesNotExist:
                    return Response({"status": "error", "message": "Event not found"}, status=404)
            else:
                return Response({"status": "error", "message": "Event not found"}, status=404)

        allowed_fields = [
            "title", "description", "event_type", "status",
            "target_branch", "target_semester", "target_section",
            "starts_at", "ends_at", "venue", "is_online", "meeting_link",
            "max_participants", "registration_deadline",
        ]
        for field in allowed_fields:
            if field in request.data:
                setattr(event, field, request.data[field])

        if "poster" in request.FILES:
            event.poster = request.FILES["poster"]
        if "attachment" in request.FILES:
            event.attachment = request.FILES["attachment"]

        event.save()
        return Response({"status": "success", "data": FacultyEventSerializer(event).data})

    def delete(self, request, pk):
        try:
            event = FacultyEvent.objects.get(pk=pk, faculty=request.user)
        except FacultyEvent.DoesNotExist:
            if request.user.role in ("admin", "super_admin"):
                try:
                    event = FacultyEvent.objects.get(pk=pk)
                except FacultyEvent.DoesNotExist:
                    return Response({"status": "error", "message": "Event not found"}, status=404)
            else:
                return Response({"status": "error", "message": "Event not found"}, status=404)

        event.is_active = False
        event.save(update_fields=["is_active"])
        return Response({"status": "success", "message": "Event deleted"})


class FacultyEventRegistrationsView(generics.GenericAPIView):
    """Manage event registrations."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get(self, request, pk):
        """Get all registrations for an event."""
        try:
            event = FacultyEvent.objects.get(pk=pk)
        except FacultyEvent.DoesNotExist:
            return Response({"status": "error", "message": "Event not found"}, status=404)

        registrations = FacultyEventRegistration.objects.filter(
            event=event
        ).select_related("student").order_by("-registered_at")

        serializer = FacultyEventRegistrationSerializer(registrations, many=True)
        return Response({"status": "success", "data": serializer.data})

    def post(self, request, pk):
        """Register a student (or self-register)."""
        try:
            event = FacultyEvent.objects.get(pk=pk, is_active=True)
        except FacultyEvent.DoesNotExist:
            return Response({"status": "error", "message": "Event not found"}, status=404)

        student_id = request.data.get("student_id", str(request.user.id))
        try:
            student = User.objects.get(id=student_id, role="student")
        except User.DoesNotExist:
            return Response({"status": "error", "message": "Student not found"}, status=404)

        if event.registered_count >= event.max_participants:
            return Response({"status": "error", "message": "Event is full"}, status=400)

        reg, created = FacultyEventRegistration.objects.get_or_create(
            event=event, student=student
        )
        if created:
            event.registered_count += 1
            event.save(update_fields=["registered_count"])

        return Response({
            "status": "success",
            "message": "Registered successfully" if created else "Already registered"
        })


class FacultyEventAttendanceView(generics.GenericAPIView):
    """Mark attendance for event participants."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def post(self, request, pk):
        try:
            event = FacultyEvent.objects.get(pk=pk)
        except FacultyEvent.DoesNotExist:
            return Response({"status": "error", "message": "Event not found"}, status=404)

        student_ids = request.data.get("student_ids", [])
        marked = 0
        for sid in student_ids:
            try:
                reg = FacultyEventRegistration.objects.get(event=event, student_id=sid)
                if not reg.attended:
                    reg.attended = True
                    reg.save(update_fields=["attended"])
                    marked += 1
            except FacultyEventRegistration.DoesNotExist:
                continue

        event.attended_count = event.registrations.filter(attended=True).count()
        event.save(update_fields=["attended_count"])

        return Response({
            "status": "success",
            "message": f"Marked attendance for {marked} students"
        })


# ══════════════════════════════════════════════════════════════════════════════
# ATTENDANCE ALERTS
# ══════════════════════════════════════════════════════════════════════════════


class AttendanceAlertListView(generics.GenericAPIView):
    """List attendance alerts for faculty's students."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get(self, request):
        profile = getattr(request.user, "faculty_profile", None)
        alerts = AttendanceAlert.objects.filter(notified_faculty=True)

        if profile and profile.sections_assigned:
            alerts = alerts.filter(student__section__in=profile.sections_assigned)
        if profile and profile.branches_assigned:
            alerts = alerts.filter(student__branch__in=profile.branches_assigned)

        level = request.query_params.get("level")
        if level:
            alerts = alerts.filter(alert_level=level)

        acknowledged = request.query_params.get("acknowledged")
        if acknowledged == "false":
            alerts = alerts.filter(is_acknowledged=False)

        serializer = AttendanceAlertSerializer(
            alerts.select_related("student")[:50], many=True
        )
        return Response({"status": "success", "data": serializer.data})

    def post(self, request):
        """Acknowledge an alert."""
        alert_id = request.data.get("alert_id")
        if not alert_id:
            return Response({"status": "error", "message": "alert_id required"}, status=400)

        try:
            alert = AttendanceAlert.objects.get(pk=alert_id)
            alert.is_acknowledged = True
            alert.acknowledged_at = timezone.now()
            alert.save(update_fields=["is_acknowledged", "acknowledged_at"])
            return Response({"status": "success", "message": "Alert acknowledged"})
        except AttendanceAlert.DoesNotExist:
            return Response({"status": "error", "message": "Alert not found"}, status=404)


# ══════════════════════════════════════════════════════════════════════════════
# FACULTY STUDY GROUPS
# ══════════════════════════════════════════════════════════════════════════════


class FacultyStudyGroupsView(generics.GenericAPIView):
    """Faculty view of study groups they mentor/moderate."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get(self, request):
        from apps.study_groups.models import StudyGroup

        profile = getattr(request.user, "faculty_profile", None)

        # Get groups where faculty is a member or in their scope
        groups = StudyGroup.objects.filter(is_active=True)

        if request.user.role == "faculty":
            # Filter to groups in faculty's sections/branches
            if profile and profile.sections_assigned:
                groups = groups.filter(
                    Q(section__in=profile.sections_assigned) |
                    Q(members=request.user)
                ).distinct()

        groups = groups.order_by("-updated_at")[:20]

        data = [{
            "id": str(g.id),
            "name": g.name,
            "description": getattr(g, "description", "")[:100],
            "member_count": g.members.count() if hasattr(g, "members") else 0,
            "section": getattr(g, "section", ""),
            "subject": getattr(g, "subject", ""),
            "is_active": g.is_active,
            "created_at": g.created_at.isoformat() if hasattr(g, "created_at") else "",
        } for g in groups]

        return Response({"status": "success", "data": data})


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN ANNOUNCEMENTS TO FACULTY
# ══════════════════════════════════════════════════════════════════════════════


class AdminToFacultyAnnouncementView(generics.GenericAPIView):
    """Admin/Super Admin can send announcements to faculty. Faculty can view them."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get(self, request):
        """Faculty: get announcements sent to them. Admin: get all."""
        announcements = AdminFacultyAnnouncement.objects.filter(is_active=True)

        if request.user.role == "faculty":
            profile = getattr(request.user, "faculty_profile", None)
            dept = profile.department if profile else ""
            announcements = announcements.filter(
                Q(target_all_faculty=True) |
                Q(target_department=dept)
            )

        ann_type = request.query_params.get("type")
        if ann_type:
            announcements = announcements.filter(announcement_type=ann_type)

        data = []
        for a in announcements[:30]:
            is_read = AdminFacultyAnnouncementRead.objects.filter(
                announcement=a, faculty=request.user
            ).exists() if request.user.role == "faculty" else None

            data.append({
                "id": str(a.id),
                "title": a.title,
                "content": a.content,
                "announcement_type": a.announcement_type,
                "priority": a.priority,
                "sender_name": a.sender.full_name,
                "requires_acknowledgement": a.requires_acknowledgement,
                "acknowledged_count": a.acknowledged_count,
                "view_count": a.view_count,
                "is_read": is_read,
                "created_at": a.created_at.isoformat(),
            })

        return Response({"status": "success", "data": data})

    def post(self, request):
        """Admin/Super Admin: create announcement for faculty."""
        if request.user.role not in ("admin", "super_admin"):
            return Response({"status": "error", "message": "Admin access required"}, status=403)

        title = request.data.get("title", "").strip()
        content = request.data.get("content", "").strip()
        if not title or not content:
            return Response({"status": "error", "message": "Title and content required"}, status=400)

        announcement = AdminFacultyAnnouncement.objects.create(
            sender=request.user,
            title=title,
            content=content,
            announcement_type=request.data.get("announcement_type", "general"),
            priority=request.data.get("priority", "normal"),
            target_department=request.data.get("target_department", ""),
            target_all_faculty=request.data.get("target_all_faculty", True),
            requires_acknowledgement=request.data.get("requires_acknowledgement", False),
        )

        # Send real-time notification to all faculty
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                "faculty_all",
                {
                    "type": "announcement_received",
                    "data": {
                        "id": str(announcement.id),
                        "title": announcement.title,
                        "priority": announcement.priority,
                        "type": announcement.announcement_type,
                        "sender": announcement.sender.full_name,
                    },
                }
            )

        return Response({
            "status": "success",
            "message": "Announcement sent to faculty",
            "data": {"id": str(announcement.id), "title": announcement.title}
        }, status=status.HTTP_201_CREATED)


class AdminToFacultyAnnouncementAcknowledgeView(generics.GenericAPIView):
    """Faculty acknowledges an admin announcement."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def post(self, request, pk):
        try:
            announcement = AdminFacultyAnnouncement.objects.get(pk=pk, is_active=True)
        except AdminFacultyAnnouncement.DoesNotExist:
            return Response({"status": "error", "message": "Announcement not found"}, status=404)

        read_obj, created = AdminFacultyAnnouncementRead.objects.get_or_create(
            announcement=announcement,
            faculty=request.user,
        )

        if not read_obj.acknowledged:
            read_obj.acknowledged = True
            read_obj.acknowledged_at = timezone.now()
            read_obj.save(update_fields=["acknowledged", "acknowledged_at"])
            announcement.acknowledged_count += 1
            announcement.save(update_fields=["acknowledged_count"])

        if created:
            announcement.view_count += 1
            announcement.save(update_fields=["view_count"])

        return Response({"status": "success", "message": "Acknowledged"})


# ══════════════════════════════════════════════════════════════════════════════
# ADMIN VISIBILITY — COMPLETE OBSERVABILITY
# ══════════════════════════════════════════════════════════════════════════════


class AdminFacultyOverviewView(generics.GenericAPIView):
    """Admin/Super Admin: Complete visibility over all faculty activities."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ("admin", "super_admin"):
            return Response({"status": "error", "message": "Admin access required"}, status=403)

        now = timezone.now()
        today = now.date()

        # Faculty stats
        total_faculty = User.objects.filter(role="faculty", is_active=True).count()
        total_profiles = FacultyProfile.objects.filter(is_active=True).count()

        # Attendance sessions today
        sessions_today = AttendanceSession.objects.filter(date=today).count()
        total_sessions = AttendanceSession.objects.count()

        # Assignments
        from apps.assignments.models import Assignment, AssignmentSubmission
        active_assignments = Assignment.objects.filter(is_active=True).count()
        pending_submissions = AssignmentSubmission.objects.filter(status="submitted").count()
        graded_submissions = AssignmentSubmission.objects.filter(status="graded").count()

        # Grades
        total_grades = GradeEntry.objects.count()

        # Chats
        active_chats = FacultyChat.objects.filter(is_active=True).count()
        total_messages = FacultyChatMessage.objects.count()

        # Events
        active_events = FacultyEvent.objects.filter(is_active=True, starts_at__gte=now).count()
        total_registrations = FacultyEventRegistration.objects.count()

        # Resources
        total_resources = FacultyResource.objects.filter(is_active=True).count()

        # Announcements
        total_announcements = FacultyAnnouncement.objects.filter(is_active=True).count()

        # Alerts
        unacknowledged_alerts = AttendanceAlert.objects.filter(is_acknowledged=False).count()

        # Faculty activity (last 7 days)
        week_ago = now - timedelta(days=7)
        recent_sessions = AttendanceSession.objects.filter(created_at__gte=week_ago).count()
        recent_grades = GradeEntry.objects.filter(created_at__gte=week_ago).count()

        # Per-faculty breakdown
        faculty_breakdown = FacultyProfile.objects.filter(is_active=True).values(
            "user__full_name", "department", "designation",
            "total_students", "total_assignments_created", "total_classes_taken"
        ).order_by("-total_classes_taken")[:20]

        return Response({
            "status": "success",
            "data": {
                "overview": {
                    "total_faculty": total_faculty,
                    "total_profiles": total_profiles,
                    "sessions_today": sessions_today,
                    "total_sessions": total_sessions,
                    "active_assignments": active_assignments,
                    "pending_submissions": pending_submissions,
                    "graded_submissions": graded_submissions,
                    "total_grades": total_grades,
                    "active_chats": active_chats,
                    "total_messages": total_messages,
                    "active_events": active_events,
                    "total_registrations": total_registrations,
                    "total_resources": total_resources,
                    "total_announcements": total_announcements,
                    "unacknowledged_alerts": unacknowledged_alerts,
                },
                "recent_activity": {
                    "sessions_this_week": recent_sessions,
                    "grades_this_week": recent_grades,
                },
                "faculty_breakdown": list(faculty_breakdown),
            }
        })


class AdminFacultyChatsView(generics.GenericAPIView):
    """Admin/Super Admin: View all faculty chats for monitoring."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ("admin", "super_admin"):
            return Response({"status": "error", "message": "Admin access required"}, status=403)

        chats = FacultyChat.objects.filter(is_active=True).select_related(
            "faculty", "student"
        ).order_by("-last_message_at")

        chat_type = request.query_params.get("type")
        faculty_id = request.query_params.get("faculty_id")
        if chat_type:
            chats = chats.filter(chat_type=chat_type)
        if faculty_id:
            chats = chats.filter(faculty_id=faculty_id)

        serializer = FacultyChatSerializer(chats[:50], many=True)
        return Response({"status": "success", "data": serializer.data})


class SectionPerformanceView(generics.GenericAPIView):
    """Section-wise performance analytics for faculty dashboard."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def get(self, request):
        from apps.attendance.models import SubjectAttendance
        from apps.assignments.models import AssignmentSubmission

        profile = getattr(request.user, "faculty_profile", None)
        sections = profile.sections_assigned if profile else []

        if request.user.role in ("admin", "super_admin"):
            sections = list(
                User.objects.filter(role="student", is_active=True)
                .values_list("section", flat=True).distinct()
            )

        section_data = []
        for section in sections:
            if not section:
                continue
            students = User.objects.filter(role="student", is_active=True, section=section)
            student_count = students.count()

            # Average attendance
            att_records = SubjectAttendance.objects.filter(
                student__in=students, total_classes__gt=0
            )
            avg_attendance = 0
            if att_records.exists():
                total_att = sum(r.attended_classes for r in att_records)
                total_cls = sum(r.total_classes for r in att_records)
                avg_attendance = round((total_att / total_cls) * 100, 1) if total_cls > 0 else 0

            # Average grades
            grades = GradeEntry.objects.filter(section=section)
            avg_grade = grades.aggregate(
                avg=Avg(F("marks_obtained") * 100.0 / F("max_marks"))
            )["avg"] or 0

            # Assignment completion
            submissions = AssignmentSubmission.objects.filter(
                student__in=students, status__in=["submitted", "graded"]
            ).count()
            total_possible = AssignmentSubmission.objects.filter(student__in=students).count()
            completion_rate = round((submissions / total_possible) * 100, 1) if total_possible > 0 else 0

            section_data.append({
                "section": section,
                "student_count": student_count,
                "avg_attendance": avg_attendance,
                "avg_grade": round(avg_grade, 1),
                "assignment_completion": completion_rate,
            })

        return Response({"status": "success", "data": section_data})
