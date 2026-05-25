import uuid
from django.db import models
from django.conf import settings


class StudentProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile")
    profile_image = models.ImageField(upload_to="profiles/", null=True, blank=True)
    bio = models.TextField(blank=True, default="")
    github_url = models.URLField(blank=True, default="")
    linkedin_url = models.URLField(blank=True, default="")
    total_questions_solved = models.PositiveIntegerField(default=0)
    easy_solved = models.PositiveIntegerField(default=0)
    medium_solved = models.PositiveIntegerField(default=0)
    hard_solved = models.PositiveIntegerField(default=0)
    total_submissions = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "student_profiles"

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
        self.save(update_fields=["easy_solved", "medium_solved", "hard_solved", "total_questions_solved", "total_submissions"])


class ActivityLog(models.Model):
    TYPES = [("login", "Login"), ("resource_view", "Resource Viewed"), ("question_solved", "Question Solved"), ("question_saved", "Question Saved"), ("news_view", "News Viewed"), ("profile_update", "Profile Updated")]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="activity_logs")
    activity_type = models.CharField(max_length=50, choices=TYPES)
    description = models.CharField(max_length=255)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "activity_logs"
        ordering = ["-created_at"]
