import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings


class AcademicProfile(models.Model):
    """Extended academic profile for a student — stores cumulative stats."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="academic_profile"
    )
    current_cgpa = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    total_credits_earned = models.PositiveIntegerField(default=0)
    total_semesters = models.PositiveSmallIntegerField(default=0)
    highest_sgpa = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    lowest_sgpa = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    total_backlogs = models.PositiveIntegerField(default=0)
    academic_standing = models.CharField(
        max_length=20,
        choices=[
            ("excellent", "Excellent"),
            ("good", "Good"),
            ("average", "Average"),
            ("at_risk", "At Risk"),
            ("critical", "Critical"),
        ],
        default="good",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "academic_profiles"
        indexes = [
            models.Index(fields=["current_cgpa"]),
            models.Index(fields=["academic_standing"]),
            models.Index(fields=["-updated_at"]),
        ]

    def __str__(self):
        return f"{self.user.full_name} — CGPA: {self.current_cgpa}"

    def recalculate(self):
        """Recalculate all cumulative stats from semester records."""
        semesters = self.semesters.all()
        if not semesters.exists():
            self.current_cgpa = 0
            self.total_credits_earned = 0
            self.total_semesters = 0
            self.highest_sgpa = 0
            self.lowest_sgpa = 0
            self.total_backlogs = 0
            self.academic_standing = "good"
            self.save()
            return

        total_credits = 0
        weighted_sum = Decimal(0)
        sgpa_values = []
        backlogs = 0

        for sem in semesters:
            total_credits += sem.total_credits
            weighted_sum += Decimal(sem.sgpa) * sem.total_credits
            sgpa_values.append(sem.sgpa)
            backlogs += sem.subjects.filter(grade="F").count()

        self.current_cgpa = round(weighted_sum / total_credits, 2) if total_credits else 0
        self.total_credits_earned = total_credits
        self.total_semesters = semesters.count()
        self.highest_sgpa = max(sgpa_values) if sgpa_values else 0
        self.lowest_sgpa = min(sgpa_values) if sgpa_values else 0
        self.total_backlogs = backlogs

        # Determine academic standing
        cgpa = float(self.current_cgpa)
        if cgpa >= 9.0:
            self.academic_standing = "excellent"
        elif cgpa >= 7.5:
            self.academic_standing = "good"
        elif cgpa >= 6.0:
            self.academic_standing = "average"
        elif cgpa >= 4.0:
            self.academic_standing = "at_risk"
        else:
            self.academic_standing = "critical"

        self.save()

    @property
    def improvement_percentage(self):
        """Calculate improvement from first to latest semester."""
        semesters = list(self.semesters.order_by("semester"))
        if len(semesters) < 2:
            return 0
        first_sgpa = float(semesters[0].sgpa)
        last_sgpa = float(semesters[-1].sgpa)
        if first_sgpa == 0:
            return 0
        return round(((last_sgpa - first_sgpa) / first_sgpa) * 100, 1)


class SemesterRecord(models.Model):
    """One row per semester per student."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    profile = models.ForeignKey(AcademicProfile, on_delete=models.CASCADE, related_name="semesters")
    semester = models.PositiveSmallIntegerField()
    semester_name = models.CharField(max_length=100, blank=True, default="")
    academic_year = models.CharField(max_length=20, blank=True, default="")
    sgpa = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    total_credits = models.PositiveIntegerField(default=0)
    total_subjects = models.PositiveSmallIntegerField(default=0)
    failed_subjects = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "semester_records"
        unique_together = [["profile", "semester"]]
        ordering = ["semester"]
        indexes = [
            models.Index(fields=["profile", "semester"]),
            models.Index(fields=["-sgpa"]),
            models.Index(fields=["-updated_at"]),
        ]

    def __str__(self):
        return f"Sem {self.semester} — SGPA: {self.sgpa}"

    def recalculate(self):
        """Recalculate SGPA from subject records."""
        subjects = self.subjects.all()
        if not subjects.exists():
            self.sgpa = 0
            self.total_credits = 0
            self.total_subjects = 0
            self.failed_subjects = 0
            self.save(update_fields=["sgpa", "total_credits", "total_subjects", "failed_subjects"])
            return

        total_credits = sum(s.credits for s in subjects)
        weighted = sum(Decimal(s.credits) * Decimal(s.grade_points) for s in subjects)
        self.sgpa = round(weighted / total_credits, 2) if total_credits else 0
        self.total_credits = total_credits
        self.total_subjects = subjects.count()
        self.failed_subjects = subjects.filter(grade="F").count()
        self.save(update_fields=["sgpa", "total_credits", "total_subjects", "failed_subjects"])


class SubjectRecord(models.Model):
    """Individual subject grades within a semester."""
    GRADE_CHOICES = [
        ("O", "Outstanding (10)"),
        ("A+", "Excellent (9)"),
        ("A", "Very Good (8)"),
        ("B+", "Good (7)"),
        ("B", "Above Average (6)"),
        ("C", "Average (5)"),
        ("P", "Pass (4)"),
        ("F", "Fail (0)"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    semester_record = models.ForeignKey(SemesterRecord, on_delete=models.CASCADE, related_name="subjects")
    subject_name = models.CharField(max_length=150)
    subject_code = models.CharField(max_length=30, blank=True, default="")
    credits = models.PositiveSmallIntegerField(default=3)
    grade = models.CharField(max_length=2, choices=GRADE_CHOICES, default="O")
    grade_points = models.DecimalField(max_digits=4, decimal_places=2, default=10)
    internal_marks = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    external_marks = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    total_marks = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    is_backlog = models.BooleanField(default=False)

    class Meta:
        db_table = "subject_records"
        ordering = ["subject_name"]
        indexes = [
            models.Index(fields=["semester_record"]),
            models.Index(fields=["grade"]),
            models.Index(fields=["subject_code"]),
        ]

    def __str__(self):
        return f"{self.subject_name} — {self.grade} ({self.grade_points})"

    def save(self, *args, **kwargs):
        # Auto-calculate total marks if both internal and external are provided
        if self.internal_marks is not None and self.external_marks is not None:
            self.total_marks = self.internal_marks + self.external_marks
        # Mark as backlog if grade is F
        self.is_backlog = self.grade == "F"
        super().save(*args, **kwargs)


class CGPAHistory(models.Model):
    """Stores a snapshot every time a student saves/updates their academic data."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cgpa_history"
    )
    cgpa_at_time = models.DecimalField(max_digits=4, decimal_places=2)
    total_credits_at_time = models.PositiveIntegerField()
    total_semesters_at_time = models.PositiveSmallIntegerField()
    action = models.CharField(
        max_length=30,
        choices=[
            ("semester_added", "Semester Added"),
            ("semester_updated", "Semester Updated"),
            ("semester_deleted", "Semester Deleted"),
            ("bulk_save", "Bulk Save"),
        ],
        default="semester_added",
    )
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "cgpa_history"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["action"]),
        ]

    def __str__(self):
        return f"{self.user.full_name} — {self.action} — CGPA: {self.cgpa_at_time}"


class AcademicTarget(models.Model):
    """Student-set academic goals/targets."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="academic_targets"
    )
    target_type = models.CharField(
        max_length=20,
        choices=[
            ("cgpa", "Target CGPA"),
            ("sgpa", "Target SGPA"),
            ("credits", "Target Credits"),
        ],
        default="cgpa",
    )
    target_value = models.DecimalField(max_digits=5, decimal_places=2)
    target_semester = models.PositiveSmallIntegerField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    is_achieved = models.BooleanField(default=False)
    achieved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "academic_targets"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["user", "is_achieved"]),
        ]

    def __str__(self):
        return f"{self.user.full_name} — Target {self.target_type}: {self.target_value}"

    def check_achievement(self):
        """Check if target has been achieved based on current profile."""
        from django.utils import timezone
        profile = AcademicProfile.objects.filter(user=self.user).first()
        if not profile:
            return False

        achieved = False
        if self.target_type == "cgpa":
            achieved = float(profile.current_cgpa) >= float(self.target_value)
        elif self.target_type == "sgpa" and self.target_semester:
            sem = SemesterRecord.objects.filter(
                profile=profile, semester=self.target_semester
            ).first()
            if sem:
                achieved = float(sem.sgpa) >= float(self.target_value)
        elif self.target_type == "credits":
            achieved = profile.total_credits_earned >= int(self.target_value)

        if achieved and not self.is_achieved:
            self.is_achieved = True
            self.achieved_at = timezone.now()
            self.save(update_fields=["is_achieved", "achieved_at"])
        return achieved


class GradeComponent(models.Model):
    """Detailed grade breakdown for a subject (internals, assignments, labs, etc.)."""
    COMPONENT_TYPES = [
        ("internal", "Internal Exam"),
        ("external", "External Exam"),
        ("assignment", "Assignment"),
        ("lab", "Lab Work"),
        ("project", "Project"),
        ("mid_exam", "Mid Exam"),
        ("quiz", "Quiz"),
        ("attendance", "Attendance"),
        ("presentation", "Presentation"),
        ("viva", "Viva"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject_record = models.ForeignKey(
        SubjectRecord, on_delete=models.CASCADE, related_name="components"
    )
    component_type = models.CharField(max_length=20, choices=COMPONENT_TYPES)
    component_name = models.CharField(max_length=100, blank=True, default="")
    marks_obtained = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    max_marks = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    weightage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "grade_components"
        ordering = ["component_type"]
        indexes = [
            models.Index(fields=["subject_record", "component_type"]),
        ]

    def __str__(self):
        return f"{self.component_type}: {self.marks_obtained}/{self.max_marks}"

    @property
    def percentage(self):
        if self.max_marks == 0:
            return 0
        return round((float(self.marks_obtained) / float(self.max_marks)) * 100, 2)

    @property
    def weighted_score(self):
        if self.max_marks == 0:
            return 0
        return round((float(self.marks_obtained) / float(self.max_marks)) * float(self.weightage), 2)


# ── Keep backward compatibility with old model names ──────────────────────────
# These aliases ensure existing migrations and admin registrations don't break
CGPARecord = AcademicProfile
SemesterGPA = SemesterRecord
SubjectGrade = SubjectRecord
