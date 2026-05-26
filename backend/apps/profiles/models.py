import uuid
from django.db import models
from django.conf import settings


class StudentProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    profile_image = models.ImageField(upload_to="profiles/", null=True, blank=True)
    bio = models.TextField(blank=True, default="")

    # Coding profiles
    github_url = models.URLField(blank=True, default="")
    linkedin_url = models.URLField(blank=True, default="")
    leetcode_url = models.URLField(blank=True, default="")
    codechef_url = models.URLField(blank=True, default="")
    hackerrank_url = models.URLField(blank=True, default="")
    portfolio_url = models.URLField(blank=True, default="")

    # Academic
    cgpa = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    advisor = models.CharField(max_length=255, blank=True, default="")

    # Coding stats (denormalized for performance)
    total_questions_solved = models.PositiveIntegerField(default=0)
    easy_solved = models.PositiveIntegerField(default=0)
    medium_solved = models.PositiveIntegerField(default=0)
    hard_solved = models.PositiveIntegerField(default=0)
    total_submissions = models.PositiveIntegerField(default=0)
    coding_rank = models.PositiveIntegerField(default=0)
    contest_rank = models.PositiveIntegerField(default=0)

    # Achievements
    certificates = models.JSONField(default=list, blank=True)
    achievements = models.JSONField(default=list, blank=True)

    # Notification preferences
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    assignment_reminders = models.BooleanField(default=True)
    contest_reminders = models.BooleanField(default=True)

    # Privacy
    profile_public = models.BooleanField(default=True)
    show_coding_stats = models.BooleanField(default=True)
    show_placement_status = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "student_profiles"
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["coding_rank"]),
        ]

    def __str__(self):
        return f"Profile: {self.user.full_name}"

    def update_coding_stats(self):
        from apps.coding.models import Submission
        qs = Submission.objects.filter(user=self.user, status="accepted")
        self.easy_solved = qs.filter(question__difficulty="easy").values("question").distinct().count()
        self.medium_solved = qs.filter(question__difficulty="medium").values("question").distinct().count()
        self.hard_solved = qs.filter(question__difficulty="hard").values("question").distinct().count()
        self.total_questions_solved = self.easy_solved + self.medium_solved + self.hard_solved
        self.total_submissions = Submission.objects.filter(user=self.user).count()
        self.save(update_fields=[
            "easy_solved", "medium_solved", "hard_solved",
            "total_questions_solved", "total_submissions",
        ])

    @property
    def profile_completion_percentage(self):
        """Calculate profile completion percentage."""
        fields_to_check = [
            bool(self.profile_image),
            bool(self.bio),
            bool(self.github_url),
            bool(self.linkedin_url),
            bool(self.user.phone),
            bool(self.user.branch),
            bool(self.cgpa),
            bool(self.leetcode_url or self.codechef_url or self.hackerrank_url),
        ]
        filled = sum(fields_to_check)
        return int((filled / len(fields_to_check)) * 100)


class ActivityLog(models.Model):
    TYPES = [
        ("login", "Login"),
        ("resource_view", "Resource Viewed"),
        ("resource_download", "Resource Downloaded"),
        ("question_solved", "Question Solved"),
        ("question_saved", "Question Saved"),
        ("news_view", "News Viewed"),
        ("profile_update", "Profile Updated"),
        ("assignment_submit", "Assignment Submitted"),
        ("contest_join", "Contest Joined"),
        ("roadmap_progress", "Roadmap Progress"),
        ("resume_export", "Resume Exported"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="activity_logs")
    activity_type = models.CharField(max_length=50, choices=TYPES)
    description = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "activity_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["activity_type"]),
        ]
