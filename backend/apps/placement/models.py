import uuid
from django.db import models
from django.conf import settings


class Company(models.Model):
    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name     = models.CharField(max_length=200)
    website  = models.URLField(blank=True, default="")
    logo_url = models.URLField(blank=True, default="")
    industry = models.CharField(max_length=100, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "placement_companies"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"]),
            models.Index(fields=["industry", "is_active"]),
        ]

    def __str__(self):
        return self.name


class PlacementApplication(models.Model):
    STATUS_CHOICES = [
        ("applied",    "Applied"),
        ("shortlisted","Shortlisted"),
        ("interview",  "Interview"),
        ("offer",      "Offer Received"),
        ("accepted",   "Offer Accepted"),
        ("rejected",   "Rejected"),
        ("withdrawn",  "Withdrawn"),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="applications")
    company     = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="applications")
    role        = models.CharField(max_length=200)
    status      = models.CharField(max_length=15, choices=STATUS_CHOICES, default="applied")
    package_lpa = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    applied_date = models.DateField(null=True, blank=True)
    deadline    = models.DateField(null=True, blank=True)
    reminder_enabled = models.BooleanField(default=True)
    reminder_sent_at = models.DateTimeField(null=True, blank=True)
    offer_received_at = models.DateField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, default="")
    notes       = models.TextField(blank=True, default="")
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "placement_applications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["student", "status"]),
            models.Index(fields=["student", "deadline"]),
            models.Index(fields=["company", "status"]),
            models.Index(fields=["status", "deadline"]),
        ]

    def __str__(self):
        return f"{self.student.full_name} → {self.company.name} ({self.status})"


class InterviewRound(models.Model):
    ROUND_TYPE_CHOICES = [
        ("online_test",  "Online Test"),
        ("coding",       "Coding Round"),
        ("technical",    "Technical Interview"),
        ("hr",           "HR Interview"),
        ("group_discussion","Group Discussion"),
        ("other",        "Other"),
    ]
    RESULT_CHOICES = [("pending","Pending"),("cleared","Cleared"),("failed","Failed")]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(PlacementApplication, on_delete=models.CASCADE, related_name="rounds")
    round_number = models.PositiveSmallIntegerField(default=1)
    round_type  = models.CharField(max_length=20, choices=ROUND_TYPE_CHOICES)
    round_date  = models.DateField(null=True, blank=True)
    result      = models.CharField(max_length=10, choices=RESULT_CHOICES, default="pending")
    feedback    = models.TextField(blank=True, default="")
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "interview_rounds"
        ordering = ["round_number"]
        indexes = [
            models.Index(fields=["application", "round_number"]),
            models.Index(fields=["result"]),
        ]
