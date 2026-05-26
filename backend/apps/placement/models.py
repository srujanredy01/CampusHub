"""
Placement Self-Tracker models for CampusHub.
Students self-track their placement journey — NOT university placement integration.
"""
import uuid
from django.db import models
from django.conf import settings


class PlacementApplication(models.Model):
    STATUS_CHOICES = [
        ("wishlist", "Wishlist"),
        ("applied", "Applied"),
        ("oa_scheduled", "OA Scheduled"),
        ("oa_completed", "OA Completed"),
        ("shortlisted", "Shortlisted"),
        ("interview_round_1", "Interview Round 1"),
        ("interview_round_2", "Interview Round 2"),
        ("hr_round", "HR Round"),
        ("selected", "Selected"),
        ("rejected", "Rejected"),
        ("offer_received", "Offer Received"),
        ("joined", "Joined"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="placement_applications")
    company_name = models.CharField(max_length=255)
    role = models.CharField(max_length=255)
    package_lpa = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="wishlist")
    application_date = models.DateField(null=True, blank=True)
    deadline = models.DateField(null=True, blank=True)
    job_link = models.URLField(blank=True, default="")
    location = models.CharField(max_length=255, blank=True, default="")
    job_type = models.CharField(
        max_length=20,
        choices=[("full_time", "Full Time"), ("internship", "Internship"), ("contract", "Contract")],
        default="full_time",
    )
    notes = models.TextField(blank=True, default="")
    offer_received_at = models.DateField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "placement_applications"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["student", "status"]),
            models.Index(fields=["student", "-updated_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return f"{self.student.full_name} → {self.company_name} ({self.status})"


class InterviewExperience(models.Model):
    """Interview details and experiences for a placement application."""
    ROUND_TYPE_CHOICES = [
        ("online_test", "Online Test"),
        ("coding", "Coding Round"),
        ("technical_1", "Technical Interview 1"),
        ("technical_2", "Technical Interview 2"),
        ("hr", "HR Interview"),
        ("group_discussion", "Group Discussion"),
        ("system_design", "System Design"),
        ("managerial", "Managerial Round"),
        ("other", "Other"),
    ]
    RESULT_CHOICES = [
        ("pending", "Pending"),
        ("cleared", "Cleared"),
        ("failed", "Failed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(PlacementApplication, on_delete=models.CASCADE, related_name="interviews")
    round_type = models.CharField(max_length=20, choices=ROUND_TYPE_CHOICES)
    round_number = models.PositiveSmallIntegerField(default=1)
    interview_date = models.DateField(null=True, blank=True)
    result = models.CharField(max_length=10, choices=RESULT_CHOICES, default="pending")
    questions_asked = models.TextField(blank=True, default="", help_text="Questions asked during the interview")
    experience_notes = models.TextField(blank=True, default="", help_text="Your experience and tips")
    difficulty = models.CharField(
        max_length=10,
        choices=[("easy", "Easy"), ("medium", "Medium"), ("hard", "Hard")],
        blank=True, default="",
    )
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "interview_experiences"
        ordering = ["round_number"]
        indexes = [
            models.Index(fields=["application", "round_number"]),
        ]

    def __str__(self):
        return f"{self.application.company_name} — {self.round_type} (Round {self.round_number})"


class CompanyNote(models.Model):
    """Student's personal notes about a company for prep."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="company_notes")
    company_name = models.CharField(max_length=255)
    notes = models.TextField()
    salary_info = models.TextField(blank=True, default="")
    interview_tips = models.TextField(blank=True, default="")
    saved_questions = models.JSONField(default=list, blank=True, help_text="Saved interview questions")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "company_notes"
        unique_together = [["student", "company_name"]]
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.student.full_name} — {self.company_name} notes"
