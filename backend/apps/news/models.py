"""
News & Updates models for CampusHub.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils.text import slugify


class NewsAnnouncement(models.Model):
    CATEGORY_CHOICES = [
        ("placement",       "Placements"),
        ("internship",      "Internships"),
        ("event",           "Events"),
        ("academics",       "Academics"),
        ("campus_update",   "Campus Updates"),
        ("general",         "General"),
    ]

    PRIORITY_CHOICES = [
        ("low",    "Low"),
        ("medium", "Medium"),
        ("high",   "High"),
        ("urgent", "Urgent"),
    ]

    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title            = models.CharField(max_length=255)
    slug             = models.SlugField(max_length=280, unique=True, blank=True)
    short_description = models.CharField(max_length=500, blank=True, default="")
    content          = models.TextField()
    featured_image   = models.ImageField(upload_to="news/images/", null=True, blank=True)
    category         = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="general")
    priority         = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    tags             = models.CharField(max_length=500, blank=True, default="",
                                        help_text="Comma-separated tags")

    # Optional attachment / link
    attachment       = models.FileField(upload_to="news/attachments/", null=True, blank=True)
    attachment_name  = models.CharField(max_length=255, blank=True)
    external_link    = models.URLField(blank=True, default="")

    # Targeting
    target_branch    = models.CharField(max_length=100, blank=True, default="")
    target_semester  = models.PositiveSmallIntegerField(null=True, blank=True)

    # Metadata
    created_by       = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_news",
    )
    is_active        = models.BooleanField(default=True)
    is_pinned        = models.BooleanField(default=False)
    view_count       = models.PositiveIntegerField(default=0)
    read_count       = models.PositiveIntegerField(default=0)

    # Scheduling
    publish_at       = models.DateTimeField(null=True, blank=True)
    expires_at       = models.DateTimeField(null=True, blank=True)

    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "news_announcements"
        ordering = ["-is_pinned", "-created_at"]
        indexes = [
            models.Index(fields=["category", "is_active"],    name="news_cat_active_idx"),
            models.Index(fields=["is_pinned", "-created_at"], name="news_pinned_created_idx"),
            models.Index(fields=["is_active", "-created_at"], name="news_active_created_idx"),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:270]
            slug = base
            n = 1
            while NewsAnnouncement.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.category}] {self.title}"

    @property
    def tags_list(self):
        return [t.strip() for t in self.tags.split(",") if t.strip()]


class SavedNews(models.Model):
    SAVE_TYPE_CHOICES = [
        ("saved",           "Saved"),
        ("saved_for_later", "Saved for Later"),
    ]

    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    student   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_news",
    )
    article   = models.ForeignKey(
        NewsAnnouncement,
        on_delete=models.CASCADE,
        related_name="saved_by",
    )
    save_type = models.CharField(max_length=20, choices=SAVE_TYPE_CHOICES, default="saved")
    saved_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "saved_news"
        unique_together = [["student", "article"]]
        ordering = ["-saved_at"]

    def __str__(self):
        return f"{self.student} — {self.article.title} ({self.save_type})"
