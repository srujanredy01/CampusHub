"""
Assignment / Homework Submission models for CampusHub.
Teachers create assignments, students submit homework.
"""
import uuid
from django.db import models
from django.conf import settings


class Assignment(models.Model):
    """An assignment created by a teacher/admin."""

    SUBJECT_CHOICES = [
        ("mathematics", "Mathematics"),
        ("physics", "Physics"),
        ("chemistry", "Chemistry"),
        ("computer_science", "Computer Science"),
        ("electronics", "Electronics"),
        ("mechanical", "Mechanical"),
        ("civil", "Civil"),
        ("english", "English"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField()
    subject = models.CharField(max_length=30, choices=SUBJECT_CHOICES, default="other")
    branch = models.CharField(max_length=100, blank=True, default="")
    semester = models.PositiveSmallIntegerField(null=True, blank=True)
    section = models.CharField(max_length=10, blank=True, default="")

    # Files
    attachment = models.FileField(upload_to="assignments/", null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True, default="")

    # Grading
    max_marks = models.PositiveIntegerField(default=100)
    grading_rubric = models.TextField(blank=True, default="")

    # Deadlines
    deadline = models.DateTimeField()
    late_submission_allowed = models.BooleanField(default=False)
    late_deadline = models.DateTimeField(null=True, blank=True)

    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_assignments"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "assignments"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["branch", "semester", "is_active"]),
            models.Index(fields=["deadline"]),
            models.Index(fields=["created_by", "-created_at"]),
        ]

    def __str__(self):
        return f"{self.title} — {self.subject}"

    @property
    def submission_count(self):
        return self.submissions.count()


class AssignmentSubmission(models.Model):
    """A student's submission for an assignment."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("submitted", "Submitted"),
        ("late", "Late Submission"),
        ("graded", "Graded"),
        ("returned", "Returned for Revision"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(Assignment, on_delete=models.CASCADE, related_name="submissions")
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assignment_submissions"
    )
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="pending")

    # Submission content
    content = models.TextField(blank=True, default="")
    file = models.FileField(upload_to="assignment_submissions/", null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True, default="")

    # Grading
    marks = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    feedback = models.TextField(blank=True, default="")
    graded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="graded_submissions"
    )
    graded_at = models.DateTimeField(null=True, blank=True)

    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "assignment_submissions"
        unique_together = [["assignment", "student"]]
        ordering = ["-submitted_at"]
        indexes = [
            models.Index(fields=["assignment", "status"]),
            models.Index(fields=["student", "status"]),
            models.Index(fields=["assignment", "student"]),
        ]

    def __str__(self):
        return f"{self.student.full_name} — {self.assignment.title} ({self.status})"


class AssignmentComment(models.Model):
    """Comments on a submission (teacher feedback or student questions)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    submission = models.ForeignKey(AssignmentSubmission, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "assignment_comments"
        ordering = ["created_at"]

    def __str__(self):
        return f"Comment by {self.author.full_name} on {self.submission}"
