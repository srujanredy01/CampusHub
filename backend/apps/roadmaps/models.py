"""
Career Roadmaps models for CampusHub.
Guides students toward career paths with milestones and progress tracking.
"""
import uuid
from django.db import models
from django.conf import settings


class Roadmap(models.Model):
    """A career roadmap (e.g., Web Development, AI/ML)."""

    CATEGORY_CHOICES = [
        ("web_development", "Web Development"),
        ("ai_ml", "AI / Machine Learning"),
        ("devops", "DevOps"),
        ("cybersecurity", "Cybersecurity"),
        ("dsa_placements", "DSA + Placements"),
        ("mobile_dev", "Mobile Development"),
        ("data_science", "Data Science"),
        ("cloud_computing", "Cloud Computing"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    description = models.TextField()
    icon = models.CharField(max_length=10, blank=True, default="🗺️")
    color = models.CharField(max_length=7, default="#3B82F6", help_text="Hex color code")
    estimated_weeks = models.PositiveIntegerField(default=12)
    difficulty = models.CharField(
        max_length=15,
        choices=[("beginner", "Beginner"), ("intermediate", "Intermediate"), ("advanced", "Advanced")],
        default="beginner",
    )
    prerequisites = models.TextField(blank=True, default="")
    total_steps = models.PositiveIntegerField(default=0)
    enrolled_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_roadmaps"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "roadmaps"
        ordering = ["title"]
        indexes = [
            models.Index(fields=["category", "is_active"]),
            models.Index(fields=["is_active", "-enrolled_count"]),
        ]

    def __str__(self):
        return self.title


class RoadmapMilestone(models.Model):
    """A major milestone within a roadmap."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    roadmap = models.ForeignKey(Roadmap, on_delete=models.CASCADE, related_name="milestones")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    order = models.PositiveIntegerField(default=0)
    estimated_days = models.PositiveIntegerField(default=7)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "roadmap_milestones"
        ordering = ["order"]
        unique_together = [["roadmap", "order"]]

    def __str__(self):
        return f"{self.roadmap.title} — {self.title}"


class RoadmapStep(models.Model):
    """An individual step/task within a milestone."""

    STEP_TYPE_CHOICES = [
        ("learn", "Learn"),
        ("practice", "Practice"),
        ("project", "Project"),
        ("quiz", "Quiz"),
        ("resource", "Resource"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    milestone = models.ForeignKey(RoadmapMilestone, on_delete=models.CASCADE, related_name="steps")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    step_type = models.CharField(max_length=10, choices=STEP_TYPE_CHOICES, default="learn")
    order = models.PositiveIntegerField(default=0)
    resource_url = models.URLField(blank=True, default="")
    resource_title = models.CharField(max_length=255, blank=True, default="")
    estimated_minutes = models.PositiveIntegerField(default=30)
    is_optional = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "roadmap_steps"
        ordering = ["order"]

    def __str__(self):
        return f"{self.milestone.title} — {self.title}"


class StudentRoadmapProgress(models.Model):
    """Tracks a student's enrollment and progress in a roadmap."""

    STATUS_CHOICES = [
        ("enrolled", "Enrolled"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("paused", "Paused"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="roadmap_progress"
    )
    roadmap = models.ForeignKey(Roadmap, on_delete=models.CASCADE, related_name="student_progress")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="enrolled")
    completed_steps = models.PositiveIntegerField(default=0)
    total_steps = models.PositiveIntegerField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    last_activity_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "student_roadmap_progress"
        unique_together = [["student", "roadmap"]]
        indexes = [
            models.Index(fields=["student", "status"]),
            models.Index(fields=["roadmap", "status"]),
        ]

    def __str__(self):
        return f"{self.student.full_name} — {self.roadmap.title} ({self.progress_percentage}%)"

    @property
    def progress_percentage(self):
        if self.total_steps == 0:
            return 0
        return round((self.completed_steps / self.total_steps) * 100)


class StepCompletion(models.Model):
    """Records which steps a student has completed."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="step_completions"
    )
    step = models.ForeignKey(RoadmapStep, on_delete=models.CASCADE, related_name="completions")
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "step_completions"
        unique_together = [["student", "step"]]

    def __str__(self):
        return f"{self.student.full_name} completed {self.step.title}"
