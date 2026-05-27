"""
Unified Saved Content model for CampusHub.
Aggregates saved coding questions, news articles, resources, assignments,
contests, and roadmaps into a single queryable model with real-time sync.
"""
import uuid
from django.db import models
from django.conf import settings


class SavedItem(models.Model):
    CONTENT_TYPE_CHOICES = [
        ("coding_problem", "Coding Problem"),
        ("news_article", "News Article"),
        ("resource", "Resource"),
        ("assignment", "Assignment"),
        ("contest", "Contest"),
        ("roadmap", "Roadmap"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_items",
    )
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPE_CHOICES)
    object_id = models.UUIDField()
    metadata = models.JSONField(default=dict, blank=True, help_text="Cached content metadata for fast display")
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "saved_items"
        unique_together = [["user", "content_type", "object_id"]]
        ordering = ["-saved_at"]
        indexes = [
            models.Index(fields=["user", "content_type"], name="saved_user_type_idx"),
            models.Index(fields=["user", "-saved_at"], name="saved_user_date_idx"),
            models.Index(fields=["content_type", "object_id"], name="saved_type_obj_idx"),
        ]

    def __str__(self):
        return f"{self.user} saved {self.content_type}:{self.object_id}"
