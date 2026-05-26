"""
Lost & Found models for CampusHub.
Students can post lost/found items and claim them.
"""
import uuid
from django.db import models
from django.conf import settings


class LostFoundItem(models.Model):
    """A lost or found item posted by a student."""

    CATEGORY_CHOICES = [
        ("id_card", "ID Card"),
        ("wallet", "Wallet"),
        ("charger", "Charger"),
        ("book", "Book"),
        ("calculator", "Calculator"),
        ("keys", "Keys"),
        ("electronics", "Electronics"),
        ("clothing", "Clothing"),
        ("bag", "Bag"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("lost", "Lost"),
        ("found", "Found"),
        ("claimed", "Claimed"),
        ("closed", "Closed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    posted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="lost_found_posts"
    )
    item_name = models.CharField(max_length=255)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="lost")
    date_lost_found = models.DateField()
    location = models.CharField(max_length=255)
    image = models.ImageField(upload_to="lost_found/", null=True, blank=True)
    contact_name = models.CharField(max_length=255, blank=True, default="")
    contact_phone = models.CharField(max_length=20, blank=True, default="")
    contact_email = models.EmailField(blank=True, default="")

    # Moderation
    is_active = models.BooleanField(default=True)
    is_flagged = models.BooleanField(default=False)
    flag_reason = models.TextField(blank=True, default="")
    flagged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="flagged_items"
    )

    # Resolution
    claimed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="claimed_items"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "lost_found_items"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "is_active"]),
            models.Index(fields=["category", "status"]),
            models.Index(fields=["-created_at"]),
            models.Index(fields=["posted_by", "status"]),
        ]

    def __str__(self):
        return f"[{self.status}] {self.item_name} — {self.category}"
