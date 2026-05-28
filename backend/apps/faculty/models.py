"""
Faculty Dashboard models for CampusHub.
Extends the base User model with faculty-specific profiles and capabilities.
Includes: Profile, Announcements, Resources, Attendance, Grades, Chat, Events.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class FacultyProfile(models.Model):
    """Extended profile for faculty members."""

    DESIGNATION_CHOICES = [
        ("professor", "Professor"),
        ("associate_professor", "Associate Professor"),
        ("assistant_professor", "Assistant Professor"),
        ("hod", "Head of Department"),
        ("dean", "Dean"),
        ("lecturer", "Lecturer"),
        ("visiting", "Visiting Faculty"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="faculty_profile"
    )
    employee_id = models.CharField(max_length=50, unique=True, blank=True, null=True)
    designation = models.CharField(max_length=30, choices=DESIGNATION_CHOICES, default="assistant_professor")
    department = models.CharField(max_length=100, blank=True, default="")
    specialization = models.CharField(max_length=255, blank=True, default="")
    qualification = models.CharField(max_length=255, blank=True, default="")
    experience_years = models.PositiveIntegerField(default=0)

    # Subjects taught
    subjects = models.JSONField(default=list, blank=True, help_text="List of subjects taught")
    sections_assigned = models.JSONField(default=list, blank=True, help_text="Assigned sections")
    branches_assigned = models.JSONField(default=list, blank=True, help_text="Assigned branches")
    semesters_assigned = models.JSONField(default=list, blank=True, help_text="Assigned semesters")

    # Permissions
    is_placement_coordinator = models.BooleanField(default=False)
    is_class_advisor = models.BooleanField(default=False)
    is_exam_coordinator = models.BooleanField(default=False)
    can_verify_notes = models.BooleanField(default=True)
    can_moderate_groups = models.BooleanField(default=True)

    # Contact
    office_location = models.CharField(max_length=100, blank=True, default="")
    office_hours = models.CharField(max_length=255, blank=True, default="")
    phone_extension = models.CharField(max_length=20, blank=True, default="")

    # Stats
    total_students = models.PositiveIntegerField(default=0)
    total_assignments_created = models.PositiveIntegerField(default=0)
    total_classes_taken = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)
    joined_at = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "faculty_profiles"
        indexes = [
            models.Index(fields=["department"]),
            models.Index(fields=["designation"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["user"]),
        ]

    def __str__(self):
        return f"{self.user.full_name} — {self.designation} ({self.department})"


class FacultyAnnouncement(models.Model):
    """Announcements posted by faculty to specific sections/subjects."""

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("normal", "Normal"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    faculty = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="faculty_announcements"
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="normal")

    # Targeting
    target_branch = models.CharField(max_length=100, blank=True, default="")
    target_semester = models.PositiveSmallIntegerField(null=True, blank=True)
    target_section = models.CharField(max_length=10, blank=True, default="")
    target_subject = models.CharField(max_length=100, blank=True, default="")

    # Attachments
    attachment = models.FileField(upload_to="faculty_announcements/", null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True, default="")

    # Scheduling
    scheduled_at = models.DateTimeField(null=True, blank=True)
    is_published = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    # Stats
    view_count = models.PositiveIntegerField(default=0)
    is_pinned = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "faculty_announcements"
        ordering = ["-is_pinned", "-created_at"]
        indexes = [
            models.Index(fields=["faculty", "-created_at"]),
            models.Index(fields=["target_branch", "target_semester", "target_section"]),
            models.Index(fields=["is_published", "-created_at"]),
            models.Index(fields=["priority"]),
        ]

    def __str__(self):
        return f"{self.title} by {self.faculty.full_name}"


class FacultyResource(models.Model):
    """Official resources uploaded by faculty (notes, PPTs, recordings)."""

    RESOURCE_TYPE_CHOICES = [
        ("notes", "Lecture Notes"),
        ("ppt", "Presentation"),
        ("pdf", "PDF Document"),
        ("recording", "Recording"),
        ("syllabus", "Syllabus"),
        ("question_paper", "Question Paper"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    faculty = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="faculty_resources"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    resource_type = models.CharField(max_length=20, choices=RESOURCE_TYPE_CHOICES, default="notes")
    subject = models.CharField(max_length=100)
    branch = models.CharField(max_length=100, blank=True, default="")
    semester = models.PositiveSmallIntegerField(null=True, blank=True)
    section = models.CharField(max_length=10, blank=True, default="")

    file = models.FileField(upload_to="faculty_resources/")
    file_name = models.CharField(max_length=255, blank=True, default="")
    file_size = models.PositiveBigIntegerField(default=0)

    download_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "faculty_resources"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["faculty", "-created_at"]),
            models.Index(fields=["subject", "branch", "semester"]),
            models.Index(fields=["resource_type"]),
        ]

    def __str__(self):
        return f"{self.title} — {self.subject} ({self.resource_type})"


class AttendanceSession(models.Model):
    """A single attendance-taking session by faculty."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    faculty = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendance_sessions"
    )
    subject = models.CharField(max_length=100)
    subject_code = models.CharField(max_length=20, blank=True, default="")
    branch = models.CharField(max_length=100)
    semester = models.PositiveSmallIntegerField()
    section = models.CharField(max_length=10)
    date = models.DateField(default=timezone.now)
    period = models.CharField(max_length=20, blank=True, default="")
    topic_covered = models.CharField(max_length=255, blank=True, default="")

    total_students = models.PositiveIntegerField(default=0)
    present_count = models.PositiveIntegerField(default=0)
    absent_count = models.PositiveIntegerField(default=0)

    is_finalized = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "attendance_sessions"
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["faculty", "-date"]),
            models.Index(fields=["branch", "semester", "section", "-date"]),
            models.Index(fields=["subject", "-date"]),
        ]

    def __str__(self):
        return f"{self.subject} — {self.section} ({self.date})"


class AttendanceRecord(models.Model):
    """Individual student attendance record within a session."""

    STATUS_CHOICES = [
        ("present", "Present"),
        ("absent", "Absent"),
        ("late", "Late"),
        ("excused", "Excused"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name="records")
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="faculty_attendance_records"
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="present")
    remarks = models.CharField(max_length=255, blank=True, default="")
    marked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attendance_records"
        unique_together = [["session", "student"]]
        indexes = [
            models.Index(fields=["session", "status"]),
            models.Index(fields=["student", "status"]),
        ]

    def __str__(self):
        return f"{self.student.full_name} — {self.status} ({self.session.subject})"


class GradeEntry(models.Model):
    """Faculty-entered grades for students."""

    EXAM_TYPE_CHOICES = [
        ("internal_1", "Internal 1"),
        ("internal_2", "Internal 2"),
        ("internal_3", "Internal 3"),
        ("mid_term", "Mid Term"),
        ("end_term", "End Term"),
        ("assignment", "Assignment"),
        ("lab", "Lab"),
        ("project", "Project"),
        ("quiz", "Quiz"),
        ("viva", "Viva"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    faculty = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="grade_entries"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_grades"
    )
    subject = models.CharField(max_length=100)
    subject_code = models.CharField(max_length=20, blank=True, default="")
    branch = models.CharField(max_length=100)
    semester = models.PositiveSmallIntegerField()
    section = models.CharField(max_length=10)
    exam_type = models.CharField(max_length=15, choices=EXAM_TYPE_CHOICES)
    marks_obtained = models.DecimalField(max_digits=5, decimal_places=2)
    max_marks = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    remarks = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "grade_entries"
        unique_together = [["student", "subject", "semester", "exam_type"]]
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["faculty", "-created_at"]),
            models.Index(fields=["student", "subject", "semester"]),
            models.Index(fields=["branch", "semester", "section", "subject"]),
        ]

    def __str__(self):
        return f"{self.student.full_name} — {self.subject} {self.exam_type}: {self.marks_obtained}/{self.max_marks}"

    @property
    def percentage(self):
        if self.max_marks == 0:
            return 0
        return round((float(self.marks_obtained) / float(self.max_marks)) * 100, 2)


class FacultyChat(models.Model):
    """Direct messaging between faculty and students."""

    CHAT_TYPE_CHOICES = [
        ("private", "Private (Student-Teacher)"),
        ("subject", "Subject Discussion"),
        ("section", "Section Discussion"),
        ("faculty", "Faculty Discussion"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat_type = models.CharField(max_length=15, choices=CHAT_TYPE_CHOICES, default="private")
    title = models.CharField(max_length=255, blank=True, default="")
    subject = models.CharField(max_length=100, blank=True, default="")
    section = models.CharField(max_length=10, blank=True, default="")
    branch = models.CharField(max_length=100, blank=True, default="")

    # Participants
    faculty = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="faculty_chats"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True,
        related_name="student_faculty_chats"
    )

    # Status
    is_muted_by_faculty = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    unread_count_faculty = models.PositiveIntegerField(default=0)
    unread_count_student = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "faculty_chats"
        ordering = ["-last_message_at"]
        indexes = [
            models.Index(fields=["faculty", "-last_message_at"]),
            models.Index(fields=["student", "-last_message_at"]),
            models.Index(fields=["chat_type", "is_active"]),
        ]

    def __str__(self):
        if self.chat_type == "private" and self.student:
            return f"Chat: {self.faculty.full_name} ↔ {self.student.full_name}"
        return f"{self.chat_type}: {self.title or self.subject}"


class FacultyChatMessage(models.Model):
    """Individual messages in a faculty chat."""

    MESSAGE_TYPE_CHOICES = [
        ("text", "Text"),
        ("file", "File"),
        ("image", "Image"),
        ("announcement", "Announcement"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat = models.ForeignKey(FacultyChat, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="faculty_chat_messages"
    )
    message_type = models.CharField(max_length=15, choices=MESSAGE_TYPE_CHOICES, default="text")
    content = models.TextField()
    file = models.FileField(upload_to="faculty_chat_files/", null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True, default="")

    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "faculty_chat_messages"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["chat", "created_at"]),
            models.Index(fields=["sender", "-created_at"]),
            models.Index(fields=["is_read", "chat"]),
        ]

    def __str__(self):
        return f"{self.sender.full_name}: {self.content[:50]}"


class FacultyEvent(models.Model):
    """Events created by faculty (workshops, hackathons, seminars, etc.)."""

    EVENT_TYPE_CHOICES = [
        ("workshop", "Workshop"),
        ("hackathon", "Hackathon"),
        ("seminar", "Seminar"),
        ("coding_contest", "Coding Contest"),
        ("guest_lecture", "Guest Lecture"),
        ("department_meeting", "Department Meeting"),
        ("lab_session", "Lab Session"),
        ("project_review", "Project Review"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
        ("registration_open", "Registration Open"),
        ("ongoing", "Ongoing"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    faculty = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="faculty_events"
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES, default="workshop")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")

    # Targeting
    target_branch = models.CharField(max_length=100, blank=True, default="")
    target_semester = models.PositiveSmallIntegerField(null=True, blank=True)
    target_section = models.CharField(max_length=10, blank=True, default="")

    # Schedule
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    venue = models.CharField(max_length=255, blank=True, default="")
    is_online = models.BooleanField(default=False)
    meeting_link = models.URLField(blank=True, default="")

    # Media
    poster = models.ImageField(upload_to="faculty_event_posters/", null=True, blank=True)
    attachment = models.FileField(upload_to="faculty_event_files/", null=True, blank=True)

    # Capacity
    max_participants = models.PositiveIntegerField(default=100)
    registration_deadline = models.DateTimeField(null=True, blank=True)

    # Stats
    registered_count = models.PositiveIntegerField(default=0)
    attended_count = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "faculty_events"
        ordering = ["-starts_at"]
        indexes = [
            models.Index(fields=["faculty", "-starts_at"]),
            models.Index(fields=["event_type", "status"]),
            models.Index(fields=["starts_at", "status"]),
            models.Index(fields=["target_branch", "target_semester"]),
        ]

    def __str__(self):
        return f"{self.title} ({self.event_type}) — {self.faculty.full_name}"


class FacultyEventRegistration(models.Model):
    """Student registration for faculty events."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(FacultyEvent, on_delete=models.CASCADE, related_name="registrations")
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="faculty_event_registrations"
    )
    attended = models.BooleanField(default=False)
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "faculty_event_registrations"
        unique_together = [["event", "student"]]
        indexes = [
            models.Index(fields=["event", "attended"]),
            models.Index(fields=["student", "-registered_at"]),
        ]

    def __str__(self):
        return f"{self.student.full_name} → {self.event.title}"


class AttendanceAlert(models.Model):
    """Automated attendance alerts for students below threshold."""

    ALERT_LEVEL_CHOICES = [
        ("warning", "Warning (Below 75%)"),
        ("critical", "Critical (Below 65%)"),
        ("danger", "Danger (Below 50%)"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendance_alerts"
    )
    subject_name = models.CharField(max_length=100)
    current_percentage = models.DecimalField(max_digits=5, decimal_places=2)
    alert_level = models.CharField(max_length=10, choices=ALERT_LEVEL_CHOICES)
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    notified_faculty = models.BooleanField(default=False)
    notified_student = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attendance_alerts"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["student", "alert_level"]),
            models.Index(fields=["is_acknowledged", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.student.full_name} — {self.subject_name} ({self.alert_level}: {self.current_percentage}%)"

    @classmethod
    def generate_alerts(cls, student, subject_attendance):
        """Generate attendance alerts based on current percentage."""
        pct = subject_attendance.attendance_percentage
        if pct >= 75:
            return None

        if pct < 50:
            level = "danger"
        elif pct < 65:
            level = "critical"
        else:
            level = "warning"

        # Check if alert already exists for this level
        existing = cls.objects.filter(
            student=student,
            subject_name=subject_attendance.subject_name,
            alert_level=level,
            is_acknowledged=False,
        ).exists()

        if not existing:
            alert = cls.objects.create(
                student=student,
                subject_name=subject_attendance.subject_name,
                current_percentage=pct,
                alert_level=level,
                notified_faculty=True,
                notified_student=True,
            )
            return alert
        return None


class AdminFacultyAnnouncement(models.Model):
    """Announcements from Admin/Super Admin to Faculty."""

    ANNOUNCEMENT_TYPE_CHOICES = [
        ("academic", "Academic Notice"),
        ("exam", "Exam Update"),
        ("meeting", "Meeting Notice"),
        ("emergency", "Emergency Alert"),
        ("policy", "Policy Change"),
        ("department", "Department Update"),
        ("general", "General"),
    ]

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("normal", "Normal"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="admin_announcements_sent"
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    announcement_type = models.CharField(max_length=15, choices=ANNOUNCEMENT_TYPE_CHOICES, default="general")
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="normal")

    # Targeting
    target_department = models.CharField(max_length=100, blank=True, default="")
    target_all_faculty = models.BooleanField(default=True)

    # Attachments
    attachment = models.FileField(upload_to="admin_faculty_announcements/", null=True, blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    requires_acknowledgement = models.BooleanField(default=False)
    acknowledged_count = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "admin_faculty_announcements"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["announcement_type", "-created_at"]),
            models.Index(fields=["priority", "-created_at"]),
            models.Index(fields=["sender", "-created_at"]),
        ]

    def __str__(self):
        return f"[{self.announcement_type}] {self.title} by {self.sender.full_name}"


class AdminFacultyAnnouncementRead(models.Model):
    """Tracks which faculty have read/acknowledged admin announcements."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    announcement = models.ForeignKey(
        AdminFacultyAnnouncement, on_delete=models.CASCADE, related_name="reads"
    )
    faculty = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="admin_announcement_reads"
    )
    read_at = models.DateTimeField(auto_now_add=True)
    acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "admin_faculty_announcement_reads"
        unique_together = [["announcement", "faculty"]]
        indexes = [
            models.Index(fields=["faculty", "-read_at"]),
        ]
