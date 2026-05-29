"""
Admin Dashboard Models — Department & Section management.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class Department(models.Model):
    """Academic department (e.g., CSE, IT, ECE, EEE, ME)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True, default="")
    head = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="headed_departments"
    )
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="created_departments"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "departments"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def student_count(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.filter(branch=self.code, role="student", is_active=True).count()

    @property
    def faculty_count(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.filter(branch=self.code, role="faculty", is_active=True).count()

    @property
    def section_count(self):
        return self.sections.filter(is_active=True).count()


class Section(models.Model):
    """Academic section within a department (e.g., CSE-3A, CSE-3B)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50)
    department = models.ForeignKey(
        Department, on_delete=models.CASCADE, related_name="sections"
    )
    semester = models.PositiveSmallIntegerField()
    faculty_advisor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="advised_sections"
    )
    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="moderated_sections"
    )
    max_students = models.PositiveIntegerField(default=60)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="created_sections"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "sections"
        ordering = ["department__code", "semester", "name"]
        unique_together = [["department", "name", "semester"]]
        indexes = [
            models.Index(fields=["department", "semester"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["faculty_advisor"]),
        ]

    def __str__(self):
        return f"{self.department.code}-{self.semester}{self.name}"

    @property
    def student_count(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        return User.objects.filter(
            branch=self.department.code,
            section=self.name,
            semester=self.semester,
            role="student",
            is_active=True
        ).count()

    @property
    def display_name(self):
        return f"{self.department.code}-{self.semester}{self.name}"


class Announcement(models.Model):
    """Admin announcements targeted to specific groups."""

    TARGET_CHOICES = [
        ("all", "All Users"),
        ("students", "All Students"),
        ("faculty", "All Faculty"),
        ("department", "Specific Department"),
        ("section", "Specific Section"),
    ]

    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("normal", "Normal"),
        ("high", "High"),
        ("urgent", "Urgent"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    content = models.TextField()
    target = models.CharField(max_length=20, choices=TARGET_CHOICES, default="all")
    target_department = models.ForeignKey(
        Department, on_delete=models.SET_NULL, null=True, blank=True
    )
    target_section = models.ForeignKey(
        Section, on_delete=models.SET_NULL, null=True, blank=True
    )
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="normal")
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="admin_announcements"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "admin_announcements"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["target", "is_active"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"[{self.priority}] {self.title}"
