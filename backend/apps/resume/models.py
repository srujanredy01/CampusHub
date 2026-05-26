"""
Resume Builder models for CampusHub.
Students can create, edit, and export professional ATS-ready resumes.
"""
import uuid
from django.db import models
from django.conf import settings


class ResumeTemplate(models.Model):
    """Admin-managed resume templates."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True, default="")
    preview_image = models.ImageField(upload_to="resume_templates/", null=True, blank=True)
    template_html = models.TextField(help_text="HTML/CSS template with Jinja-style placeholders")
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "resume_templates"
        ordering = ["-is_default", "name"]

    def __str__(self):
        return self.name


class ResumeProfile(models.Model):
    """A student's resume data."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="resumes"
    )
    title = models.CharField(max_length=100, default="My Resume")
    template = models.ForeignKey(
        ResumeTemplate, on_delete=models.SET_NULL, null=True, blank=True
    )

    # Personal Info
    full_name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True, default="")
    branch = models.CharField(max_length=100, blank=True, default="")
    graduation_year = models.PositiveIntegerField(null=True, blank=True)
    summary = models.TextField(blank=True, default="")
    address = models.CharField(max_length=500, blank=True, default="")

    # Links
    linkedin_url = models.URLField(blank=True, default="")
    github_url = models.URLField(blank=True, default="")
    portfolio_url = models.URLField(blank=True, default="")

    # Skills (JSON array)
    skills = models.JSONField(default=list, blank=True)

    # Certifications (JSON array of objects)
    certifications = models.JSONField(default=list, blank=True)

    # Projects (JSON array of objects)
    projects = models.JSONField(default=list, blank=True)

    # Internships (JSON array of objects)
    internships = models.JSONField(default=list, blank=True)

    # Education (JSON array of objects)
    education = models.JSONField(default=list, blank=True)

    # Achievements (JSON array)
    achievements = models.JSONField(default=list, blank=True)

    # Coding Profiles (JSON object)
    coding_profiles = models.JSONField(default=dict, blank=True)

    # Metadata
    is_primary = models.BooleanField(default=False)
    completion_score = models.PositiveIntegerField(default=0)
    last_exported_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "resume_profiles"
        ordering = ["-is_primary", "-updated_at"]
        indexes = [
            models.Index(fields=["student", "-updated_at"]),
            models.Index(fields=["student", "is_primary"]),
        ]

    def __str__(self):
        return f"{self.full_name} — {self.title}"

    def calculate_completion(self):
        """Calculate resume completion score (0-100)."""
        score = 0
        if self.full_name:
            score += 10
        if self.email:
            score += 5
        if self.phone:
            score += 5
        if self.summary:
            score += 10
        if self.skills:
            score += 15
        if self.education:
            score += 15
        if self.projects:
            score += 15
        if self.internships:
            score += 10
        if self.certifications:
            score += 5
        if self.achievements:
            score += 5
        if self.linkedin_url or self.github_url:
            score += 5
        self.completion_score = min(score, 100)
        return self.completion_score
