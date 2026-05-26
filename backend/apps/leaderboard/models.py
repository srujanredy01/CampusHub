"""
Leaderboard & Gamification models for CampusHub.
Points, badges, and rankings for student engagement.
"""
import uuid
from django.db import models
from django.conf import settings


class StudentXP(models.Model):
    """Tracks total XP and rank for each student."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="xp_profile"
    )
    total_xp = models.PositiveIntegerField(default=0)
    level = models.PositiveIntegerField(default=1)
    rank = models.PositiveIntegerField(default=0)
    streak_days = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "student_xp"
        ordering = ["-total_xp"]
        indexes = [
            models.Index(fields=["-total_xp"]),
            models.Index(fields=["rank"]),
            models.Index(fields=["level"]),
        ]

    def __str__(self):
        return f"{self.student.full_name} — {self.total_xp} XP (Level {self.level})"

    def calculate_level(self):
        """Level up every 500 XP."""
        self.level = (self.total_xp // 500) + 1
        return self.level


class XPTransaction(models.Model):
    """Individual XP earning events."""

    SOURCE_CHOICES = [
        ("coding_solve", "Solved Coding Question"),
        ("contest_rank", "Contest Ranking"),
        ("resource_read", "Read Resource"),
        ("assignment_complete", "Assignment Completed"),
        ("roadmap_step", "Roadmap Step Completed"),
        ("roadmap_complete", "Roadmap Completed"),
        ("profile_complete", "Profile Completed"),
        ("streak_bonus", "Streak Bonus"),
        ("badge_earned", "Badge Earned"),
        ("note_upload", "Note Uploaded"),
        ("attendance_bonus", "Attendance Bonus"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="xp_transactions"
    )
    source = models.CharField(max_length=30, choices=SOURCE_CHOICES)
    points = models.IntegerField()
    description = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "xp_transactions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["student", "-created_at"]),
            models.Index(fields=["source"]),
        ]

    def __str__(self):
        return f"{self.student.full_name} +{self.points} XP ({self.source})"


class Badge(models.Model):
    """Badge definitions."""

    BADGE_CHOICES = [
        ("problem_solver", "Problem Solver"),
        ("top_coder", "Top Coder"),
        ("placement_ready", "Placement Ready"),
        ("fast_learner", "Fast Learner"),
        ("consistent_performer", "Consistent Performer"),
        ("resource_explorer", "Resource Explorer"),
        ("contest_champion", "Contest Champion"),
        ("roadmap_master", "Roadmap Master"),
        ("team_player", "Team Player"),
        ("early_bird", "Early Bird"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=60, unique=True)
    description = models.TextField()
    icon = models.CharField(max_length=10, default="🏆")
    color = models.CharField(max_length=7, default="#F59E0B")
    xp_reward = models.PositiveIntegerField(default=50)
    criteria = models.JSONField(default=dict, help_text="Conditions to earn this badge")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "badges"
        ordering = ["name"]

    def __str__(self):
        return f"{self.icon} {self.name}"


class StudentBadge(models.Model):
    """Badges earned by students."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="earned_badges"
    )
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name="earners")
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "student_badges"
        unique_together = [["student", "badge"]]
        ordering = ["-earned_at"]

    def __str__(self):
        return f"{self.student.full_name} earned {self.badge.name}"
