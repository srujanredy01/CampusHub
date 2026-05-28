"""
Career Roadmaps models for CampusHub.
Community-driven moderated roadmap ecosystem.
Students create → moderators review → public library.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils.text import slugify


class Roadmap(models.Model):
    """A career/academic roadmap created by students or faculty."""

    CATEGORY_CHOICES = [
        ("web_development", "Web Development"),
        ("ai_ml", "AI / Machine Learning"),
        ("devops", "DevOps"),
        ("cybersecurity", "Cybersecurity"),
        ("dsa_placements", "DSA + Placements"),
        ("mobile_dev", "Mobile Development"),
        ("data_science", "Data Science"),
        ("cloud_computing", "Cloud Computing"),
        ("system_design", "System Design"),
        ("frontend", "Frontend Development"),
        ("backend", "Backend Development"),
        ("full_stack", "Full Stack"),
        ("blockchain", "Blockchain"),
        ("game_dev", "Game Development"),
        ("academic", "Academic Subject"),
        ("placement_prep", "Placement Preparation"),
        ("other", "Other"),
    ]

    DIFFICULTY_CHOICES = [
        ("beginner", "Beginner"),
        ("intermediate", "Intermediate"),
        ("advanced", "Advanced"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted for Review"),
        ("under_review", "Under Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("needs_changes", "Needs Changes"),
        ("archived", "Archived"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    description = models.TextField()
    icon = models.CharField(max_length=10, blank=True, default="🗺️")
    color = models.CharField(max_length=7, default="#6366F1")
    estimated_weeks = models.PositiveIntegerField(default=4)
    difficulty = models.CharField(max_length=15, choices=DIFFICULTY_CHOICES, default="beginner")
    prerequisites = models.TextField(blank=True, default="")
    skills_covered = models.TextField(blank=True, default="", help_text="Comma-separated skills")
    target_role = models.CharField(max_length=255, blank=True, default="")
    tags = models.JSONField(default=list, blank=True)

    # Counts (denormalized)
    total_steps = models.PositiveIntegerField(default=0)
    enrolled_count = models.PositiveIntegerField(default=0)
    like_count = models.PositiveIntegerField(default=0)
    comment_count = models.PositiveIntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    rating_count = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)

    # Status & moderation
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="draft")
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_faculty_verified = models.BooleanField(default=False)

    # Moderation
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="reviewed_roadmaps"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True, default="")
    rejection_reason = models.TextField(blank=True, default="")

    # Creator
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name="created_roadmaps"
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "roadmaps"
        ordering = ["-is_featured", "-enrolled_count", "-created_at"]
        indexes = [
            models.Index(fields=["category", "status", "is_active"]),
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["is_active", "-enrolled_count"]),
            models.Index(fields=["created_by", "status"]),
            models.Index(fields=["-like_count"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:270]
            slug = base
            n = 1
            while Roadmap.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def skills_list(self):
        if isinstance(self.skills_covered, str):
            return [s.strip() for s in self.skills_covered.split(",") if s.strip()]
        return []

    def recalculate_steps(self):
        self.total_steps = RoadmapStep.objects.filter(milestone__roadmap=self).count()
        self.save(update_fields=["total_steps"])


class RoadmapMilestone(models.Model):
    """A major milestone/section within a roadmap."""

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
        ("video", "Video"),
        ("article", "Article"),
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
    notes = models.TextField(blank=True, default="")
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


# ── Community Features ────────────────────────────────────────────────────────


class RoadmapLike(models.Model):
    """Like/upvote on a roadmap."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    roadmap = models.ForeignKey(Roadmap, on_delete=models.CASCADE, related_name="likes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="roadmap_likes")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "roadmap_likes"
        unique_together = [["roadmap", "user"]]


class RoadmapComment(models.Model):
    """Comments on a roadmap."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    roadmap = models.ForeignKey(Roadmap, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="roadmap_comments")
    content = models.TextField()
    parent = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies")
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "roadmap_comments"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["roadmap", "-created_at"]),
        ]


class RoadmapRating(models.Model):
    """1-5 star rating on a roadmap."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    roadmap = models.ForeignKey(Roadmap, on_delete=models.CASCADE, related_name="ratings")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="roadmap_ratings")
    rating = models.PositiveSmallIntegerField()  # 1-5
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "roadmap_ratings"
        unique_together = [["roadmap", "user"]]


class RoadmapBookmark(models.Model):
    """Bookmark/save a roadmap."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    roadmap = models.ForeignKey(Roadmap, on_delete=models.CASCADE, related_name="bookmarks")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="roadmap_bookmarks")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "roadmap_bookmarks"
        unique_together = [["roadmap", "user"]]


class RoadmapReport(models.Model):
    """Report a roadmap for moderation."""
    REASON_CHOICES = [
        ("spam", "Spam"),
        ("plagiarism", "Plagiarism"),
        ("inappropriate", "Inappropriate Content"),
        ("misleading", "Misleading Information"),
        ("low_quality", "Low Quality"),
        ("other", "Other"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("reviewed", "Reviewed"),
        ("resolved", "Resolved"),
        ("dismissed", "Dismissed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    roadmap = models.ForeignKey(Roadmap, on_delete=models.CASCADE, related_name="reports")
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="roadmap_reports")
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="reviewed_roadmap_reports"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "roadmap_reports"
        unique_together = [["roadmap", "reporter"]]
        ordering = ["-created_at"]
