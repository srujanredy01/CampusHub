"""
Faculty Dashboard serializers.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    FacultyProfile, FacultyAnnouncement, FacultyResource,
    AttendanceSession, AttendanceRecord, GradeEntry,
    FacultyChat, FacultyChatMessage, FacultyEvent,
    FacultyEventRegistration, AttendanceAlert,
    AdminFacultyAnnouncement, AdminFacultyAnnouncementRead,
)

User = get_user_model()


class FacultyProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source="user.full_name", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = FacultyProfile
        fields = [
            "id", "full_name", "email", "employee_id", "designation",
            "department", "specialization", "qualification", "experience_years",
            "subjects", "sections_assigned", "branches_assigned", "semesters_assigned",
            "is_placement_coordinator", "is_class_advisor", "is_exam_coordinator",
            "can_verify_notes", "can_moderate_groups", "office_location",
            "office_hours", "total_students", "total_assignments_created",
            "total_classes_taken", "is_active", "joined_at", "created_at",
        ]
        read_only_fields = ["id", "created_at", "total_students", "total_assignments_created", "total_classes_taken"]


class StudentListSerializer(serializers.ModelSerializer):
    """Lightweight student serializer for faculty views."""
    attendance_percentage = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "full_name", "student_id", "email", "branch",
            "semester", "section", "batch", "is_active",
            "attendance_percentage",
        ]

    def get_attendance_percentage(self, obj):
        records = obj.attendance_records.all()
        if not records.exists():
            return None
        total = sum(r.total_classes for r in records)
        attended = sum(r.attended_classes for r in records)
        if total == 0:
            return 0
        return round((attended / total) * 100, 2)


class FacultyAnnouncementSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source="faculty.full_name", read_only=True)

    class Meta:
        model = FacultyAnnouncement
        fields = [
            "id", "faculty", "faculty_name", "title", "content", "priority",
            "target_branch", "target_semester", "target_section", "target_subject",
            "attachment", "attachment_name", "scheduled_at", "is_published",
            "expires_at", "view_count", "is_pinned", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "faculty", "view_count", "created_at", "updated_at"]


class FacultyResourceSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source="faculty.full_name", read_only=True)

    class Meta:
        model = FacultyResource
        fields = [
            "id", "faculty", "faculty_name", "title", "description",
            "resource_type", "subject", "branch", "semester", "section",
            "file", "file_name", "file_size", "download_count",
            "is_active", "created_at",
        ]
        read_only_fields = ["id", "faculty", "download_count", "created_at"]


class AttendanceSessionSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source="faculty.full_name", read_only=True)

    class Meta:
        model = AttendanceSession
        fields = [
            "id", "faculty", "faculty_name", "subject", "subject_code",
            "branch", "semester", "section", "date", "period",
            "topic_covered", "total_students", "present_count",
            "absent_count", "is_finalized", "created_at",
        ]
        read_only_fields = ["id", "faculty", "created_at"]


class AttendanceRecordSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_id_field = serializers.CharField(source="student.student_id", read_only=True)

    class Meta:
        model = AttendanceRecord
        fields = [
            "id", "session", "student", "student_name", "student_id_field",
            "status", "remarks", "marked_at",
        ]
        read_only_fields = ["id", "marked_at"]


class BulkAttendanceSerializer(serializers.Serializer):
    """Serializer for bulk attendance marking."""
    session_id = serializers.UUIDField(required=False)
    subject = serializers.CharField(max_length=100)
    subject_code = serializers.CharField(max_length=20, required=False, default="")
    branch = serializers.CharField(max_length=100)
    semester = serializers.IntegerField()
    section = serializers.CharField(max_length=10)
    date = serializers.DateField()
    period = serializers.CharField(max_length=20, required=False, default="")
    topic_covered = serializers.CharField(max_length=255, required=False, default="")
    records = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of {student_id: UUID, status: present/absent/late/excused}"
    )


class GradeEntrySerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_id_field = serializers.CharField(source="student.student_id", read_only=True)
    percentage = serializers.ReadOnlyField()

    class Meta:
        model = GradeEntry
        fields = [
            "id", "faculty", "student", "student_name", "student_id_field",
            "subject", "subject_code", "branch", "semester", "section",
            "exam_type", "marks_obtained", "max_marks", "percentage",
            "remarks", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "faculty", "created_at", "updated_at"]


class BulkGradeSerializer(serializers.Serializer):
    """Serializer for bulk grade upload."""
    subject = serializers.CharField(max_length=100)
    subject_code = serializers.CharField(max_length=20, required=False, default="")
    branch = serializers.CharField(max_length=100)
    semester = serializers.IntegerField()
    section = serializers.CharField(max_length=10)
    exam_type = serializers.CharField(max_length=15)
    max_marks = serializers.DecimalField(max_digits=5, decimal_places=2, default=100)
    grades = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of {student_id: UUID, marks_obtained: float, remarks: str}"
    )


class FacultyDashboardStatsSerializer(serializers.Serializer):
    """Dashboard overview stats."""
    total_students = serializers.IntegerField()
    pending_assignments = serializers.IntegerField()
    pending_evaluations = serializers.IntegerField()
    low_attendance_students = serializers.IntegerField()
    todays_classes = serializers.IntegerField()
    recent_submissions = serializers.IntegerField()
    total_announcements = serializers.IntegerField()
    study_groups_count = serializers.IntegerField()
    upcoming_events = serializers.IntegerField()
    unread_messages = serializers.IntegerField()


# ── Faculty Chat Serializers ──────────────────────────────────────────────────

class FacultyChatSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source="faculty.full_name", read_only=True)
    student_name = serializers.CharField(source="student.full_name", read_only=True, default="")
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = FacultyChat
        fields = [
            "id", "chat_type", "title", "subject", "section", "branch",
            "faculty", "faculty_name", "student", "student_name",
            "is_muted_by_faculty", "is_active", "last_message_at",
            "unread_count_faculty", "unread_count_student",
            "last_message", "created_at",
        ]
        read_only_fields = ["id", "faculty", "last_message_at", "created_at"]

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if msg:
            return {
                "content": msg.content[:100],
                "sender_name": msg.sender.full_name,
                "created_at": msg.created_at.isoformat(),
            }
        return None


class FacultyChatMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)
    sender_role = serializers.CharField(source="sender.role", read_only=True)

    class Meta:
        model = FacultyChatMessage
        fields = [
            "id", "chat", "sender", "sender_name", "sender_role",
            "message_type", "content", "file", "file_name",
            "is_read", "read_at", "is_edited", "is_deleted",
            "created_at",
        ]
        read_only_fields = ["id", "sender", "is_read", "read_at", "created_at"]


# ── Faculty Event Serializers ─────────────────────────────────────────────────

class FacultyEventSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source="faculty.full_name", read_only=True)
    is_registration_open = serializers.SerializerMethodField()

    class Meta:
        model = FacultyEvent
        fields = [
            "id", "faculty", "faculty_name", "title", "description",
            "event_type", "status", "target_branch", "target_semester",
            "target_section", "starts_at", "ends_at", "venue",
            "is_online", "meeting_link", "poster", "attachment",
            "max_participants", "registration_deadline",
            "registered_count", "attended_count", "is_registration_open",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "faculty", "registered_count", "attended_count", "created_at", "updated_at"]

    def get_is_registration_open(self, obj):
        from django.utils import timezone
        now = timezone.now()
        if obj.status not in ("published", "registration_open"):
            return False
        if obj.registration_deadline and now > obj.registration_deadline:
            return False
        if obj.registered_count >= obj.max_participants:
            return False
        return True


class FacultyEventRegistrationSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_id_field = serializers.CharField(source="student.student_id", read_only=True)

    class Meta:
        model = FacultyEventRegistration
        fields = [
            "id", "event", "student", "student_name", "student_id_field",
            "attended", "registered_at",
        ]
        read_only_fields = ["id", "registered_at"]


# ── Attendance Alert Serializers ──────────────────────────────────────────────

class AttendanceAlertSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_id_field = serializers.CharField(source="student.student_id", read_only=True)

    class Meta:
        model = AttendanceAlert
        fields = [
            "id", "student", "student_name", "student_id_field",
            "subject_name", "current_percentage", "alert_level",
            "is_acknowledged", "acknowledged_at", "notified_faculty",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


# ── Admin Faculty Announcement Serializers ────────────────────────────────────

class AdminFacultyAnnouncementSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.full_name", read_only=True)

    class Meta:
        model = AdminFacultyAnnouncement
        fields = [
            "id", "sender", "sender_name", "title", "content",
            "announcement_type", "priority", "target_department",
            "target_all_faculty", "attachment", "is_active",
            "requires_acknowledgement", "acknowledged_count",
            "view_count", "created_at",
        ]
        read_only_fields = ["id", "sender", "acknowledged_count", "view_count", "created_at"]
