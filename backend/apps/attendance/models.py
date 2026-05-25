import uuid
import math
from django.db import models
from django.conf import settings


class SubjectAttendance(models.Model):
    """Tracks attendance for one subject per student."""
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendance_records")
    subject_name    = models.CharField(max_length=100)
    subject_code    = models.CharField(max_length=20, blank=True, default="")
    semester        = models.PositiveSmallIntegerField()
    total_classes   = models.PositiveIntegerField(default=0)
    attended_classes = models.PositiveIntegerField(default=0)
    required_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=75.00)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subject_attendance"
        unique_together = [["student", "subject_name", "semester"]]
        ordering = ["subject_name"]
        indexes = [
            models.Index(fields=["student", "semester"]),
            models.Index(fields=["student", "subject_name"]),
        ]

    def __str__(self):
        return f"{self.student.full_name} — {self.subject_name} ({self.attendance_percentage}%)"

    @property
    def attendance_percentage(self):
        if self.total_classes == 0:
            return 0.0
        return round((self.attended_classes / self.total_classes) * 100, 2)

    @property
    def is_shortage(self):
        return self.attendance_percentage < float(self.required_percentage)

    @property
    def classes_needed(self):
        """How many consecutive classes needed to reach required %."""
        if not self.is_shortage:
            return 0
        req = float(self.required_percentage) / 100
        denom = 1 - req
        if denom <= 0:
            return 0
        needed = (req * self.total_classes - self.attended_classes) / denom
        return max(0, int(needed) + 1)

    @property
    def classes_needed_75(self):
        """Classes needed to reach 75%."""
        return self._classes_needed_for(75)

    @property
    def classes_needed_80(self):
        """Classes needed to reach 80%."""
        return self._classes_needed_for(80)

    def _classes_needed_for(self, target_pct):
        """Calculate classes needed to reach a specific target percentage."""
        if self.total_classes == 0:
            return 0
        current_pct = (self.attended_classes / self.total_classes) * 100
        if current_pct >= target_pct:
            return 0
        req = target_pct / 100
        denom = 1 - req
        if denom <= 0:
            return 0
        needed = (req * self.total_classes - self.attended_classes) / denom
        return max(0, math.ceil(needed))

    @property
    def missed_classes(self):
        return max(0, self.total_classes - self.attended_classes)

    @property
    def classes_can_miss(self):
        """How many classes can still be missed while staying >= required %."""
        req = float(self.required_percentage) / 100
        if self.total_classes == 0:
            return 0
        if req <= 0:
            return 0
        allowed = int((self.attended_classes / req) - self.total_classes)
        return max(0, allowed)

    def projected_attendance(self, future_classes=5, attend_all=False):
        """Project attendance after future classes (all missed or all attended)."""
        new_total = self.total_classes + future_classes
        if new_total == 0:
            return 0.0
        new_attended = self.attended_classes + (future_classes if attend_all else 0)
        return round((new_attended / new_total) * 100, 2)


class AttendanceHistory(models.Model):
    """Audit trail for attendance changes."""
    ACTION_CHOICES = [
        ("created", "Created"),
        ("updated", "Updated"),
        ("marked_present", "Marked Present"),
        ("marked_absent", "Marked Absent"),
        ("deleted", "Deleted"),
    ]

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student         = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="attendance_history")
    subject         = models.ForeignKey(SubjectAttendance, on_delete=models.SET_NULL, null=True, blank=True, related_name="history")
    subject_name    = models.CharField(max_length=100)
    subject_code    = models.CharField(max_length=20, blank=True, default="")
    semester        = models.PositiveSmallIntegerField()
    action          = models.CharField(max_length=20, choices=ACTION_CHOICES)
    old_total       = models.PositiveIntegerField(default=0)
    old_attended    = models.PositiveIntegerField(default=0)
    new_total       = models.PositiveIntegerField(default=0)
    new_attended    = models.PositiveIntegerField(default=0)
    old_percentage  = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    new_percentage  = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "attendance_history"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["student", "-created_at"]),
            models.Index(fields=["subject", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.student.full_name} — {self.action} — {self.subject_name}"
