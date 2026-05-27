import uuid
from django.db import models
from django.conf import settings
from django.db.models import F, ExpressionWrapper, FloatField
from django.utils import timezone


class Note(models.Model):
    STATUS_CHOICES = [
        ("pending",  "Pending Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]
    FILE_TYPE_CHOICES = [
        ("pdf",   "PDF"),
        ("docx",  "Word Document"),
        ("ppt",   "Presentation"),
        ("image", "Image"),
        ("other", "Other"),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title       = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    subject     = models.CharField(max_length=100)
    branch      = models.CharField(max_length=100)
    semester    = models.PositiveSmallIntegerField()
    tags        = models.CharField(max_length=500, blank=True, default="")
    file        = models.FileField(upload_to="notes/")
    file_name   = models.CharField(max_length=255, blank=True)
    file_size   = models.PositiveBigIntegerField(default=0)
    file_type   = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES, default="pdf")

    uploaded_by    = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="uploaded_notes"
    )
    status         = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    rejection_reason = models.TextField(blank=True, default="")

    download_count  = models.PositiveIntegerField(default=0)
    view_count      = models.PositiveIntegerField(default=0)
    upvotes         = models.PositiveIntegerField(default=0)
    downvotes       = models.PositiveIntegerField(default=0)
    average_rating  = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    rating_count    = models.PositiveIntegerField(default=0)

    is_active   = models.BooleanField(default=True)
    moderated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="moderated_notes",
    )
    moderated_at = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "notes"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["branch", "semester"]),
            models.Index(fields=["subject"]),
            models.Index(fields=["status", "is_active"]),
            models.Index(fields=["-created_at"]),
            models.Index(fields=["-download_count"]),
            models.Index(fields=["-upvotes", "-view_count"]),
        ]

    def __str__(self):
        return f"{self.title} — {self.subject}"

    @property
    def tags_list(self):
        return [t.strip() for t in self.tags.split(",") if t.strip()]

    @property
    def trending_score(self):
        freshness_days = max((timezone.now() - self.created_at).days, 0)
        freshness_factor = 1 / (1 + freshness_days)
        rating_factor = float(self.average_rating or 0) * 2
        return round(
            (self.upvotes * 3) + self.download_count + (self.view_count * 0.25) + rating_factor + (freshness_factor * 10),
            2,
        )


class NoteVote(models.Model):
    VOTE_CHOICES = [("up", "Upvote"), ("down", "Downvote")]

    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    note    = models.ForeignKey(Note, on_delete=models.CASCADE, related_name="votes")
    user    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    vote    = models.CharField(max_length=4, choices=VOTE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "note_votes"
        unique_together = [["note", "user"]]


class NoteBookmark(models.Model):
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    note    = models.ForeignKey(Note, on_delete=models.CASCADE, related_name="bookmarks")
    user    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "note_bookmarks"
        unique_together = [["note", "user"]]


class NoteRating(models.Model):
    """1-5 star rating given by a student to a note."""
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    note    = models.ForeignKey(Note, on_delete=models.CASCADE, related_name="ratings")
    user    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    rating  = models.PositiveSmallIntegerField()  # 1–5
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "note_ratings"
        unique_together = [["note", "user"]]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Recalculate aggregate rating on the note
        from django.db.models import Avg, Count
        agg = NoteRating.objects.filter(note=self.note).aggregate(
            avg=Avg("rating"), cnt=Count("id")
        )
        self.note.average_rating = round(agg["avg"] or 0, 2)
        self.note.rating_count   = agg["cnt"] or 0
        self.note.save(update_fields=["average_rating", "rating_count"])


class NoteComment(models.Model):
    """Comments on shared notes."""
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    note    = models.ForeignKey(Note, on_delete=models.CASCADE, related_name="comments")
    user    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="note_comments")
    content = models.TextField()
    parent  = models.ForeignKey("self", null=True, blank=True, on_delete=models.CASCADE, related_name="replies")
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "note_comments"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["note", "created_at"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"{self.user.full_name} on {self.note.title}: {self.content[:50]}"


class NoteShare(models.Model):
    """Track note sharing between users."""
    SHARE_TYPE_CHOICES = [
        ("public", "Public"),
        ("private", "Private"),
        ("link", "Link Share"),
    ]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    note       = models.ForeignKey(Note, on_delete=models.CASCADE, related_name="shares")
    shared_by  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notes_shared")
    shared_with = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        null=True, blank=True, related_name="notes_received"
    )
    share_type = models.CharField(max_length=10, choices=SHARE_TYPE_CHOICES, default="public")
    share_link = models.CharField(max_length=64, unique=True, blank=True)
    message    = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "note_shares"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["note", "-created_at"]),
            models.Index(fields=["shared_with", "-created_at"]),
            models.Index(fields=["share_link"]),
        ]

    def save(self, *args, **kwargs):
        if not self.share_link:
            import secrets
            self.share_link = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

    def __str__(self):
        target = self.shared_with.full_name if self.shared_with else "public"
        return f"{self.shared_by.full_name} shared {self.note.title} with {target}"


class NoteReport(models.Model):
    """Report inappropriate notes."""
    REASON_CHOICES = [
        ("spam", "Spam"),
        ("inappropriate", "Inappropriate Content"),
        ("copyright", "Copyright Violation"),
        ("misleading", "Misleading Information"),
        ("other", "Other"),
    ]
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("reviewed", "Reviewed"),
        ("resolved", "Resolved"),
        ("dismissed", "Dismissed"),
    ]

    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    note     = models.ForeignKey(Note, on_delete=models.CASCADE, related_name="reports")
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="note_reports")
    reason   = models.CharField(max_length=20, choices=REASON_CHOICES)
    description = models.TextField(blank=True, default="")
    status   = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="reviewed_note_reports"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "note_reports"
        ordering = ["-created_at"]
        unique_together = [["note", "reporter"]]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
        ]
