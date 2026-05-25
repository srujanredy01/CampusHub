import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class StudyGroup(models.Model):
    VISIBILITY_CHOICES = [("public", "Public"), ("private", "Private")]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    subject     = models.CharField(max_length=100, blank=True, default="")
    branch      = models.CharField(max_length=100, blank=True, default="")
    semester    = models.PositiveSmallIntegerField(null=True, blank=True)
    visibility  = models.CharField(max_length=10, choices=VISIBILITY_CHOICES, default="public")
    invite_code = models.CharField(max_length=12, unique=True, blank=True)
    max_members = models.PositiveSmallIntegerField(default=50)
    created_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_groups"
    )
    is_active   = models.BooleanField(default=True)
    websocket_room = models.CharField(max_length=80, blank=True, default="")
    last_activity_at = models.DateTimeField(default=timezone.now)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "study_groups"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["visibility", "is_active"]),
            models.Index(fields=["branch", "semester"]),
            models.Index(fields=["-last_activity_at"]),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.invite_code:
            import secrets
            self.invite_code = secrets.token_urlsafe(8)[:12]
        if not self.websocket_room:
            self.websocket_room = f"group_{self.id.hex if self.id else uuid.uuid4().hex[:12]}"
        super().save(*args, **kwargs)

    @property
    def member_count(self):
        return self.memberships.filter(is_active=True).count()


class GroupMembership(models.Model):
    ROLE_CHOICES = [("admin", "Admin"), ("moderator", "Moderator"), ("member", "Member")]

    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group     = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name="memberships")
    user      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_memberships")
    role      = models.CharField(max_length=10, choices=ROLE_CHOICES, default="member")
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "group_memberships"
        unique_together = [["group", "user"]]
        indexes = [
            models.Index(fields=["group", "is_active"]),
            models.Index(fields=["user", "is_active"]),
        ]


class GroupPost(models.Model):
    POST_TYPE_CHOICES = [
        ("discussion",   "Discussion"),
        ("announcement", "Announcement"),
        ("resource",     "Resource Share"),
    ]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group      = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name="posts")
    author     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    post_type  = models.CharField(max_length=15, choices=POST_TYPE_CHOICES, default="discussion")
    content    = models.TextField()
    attachment = models.FileField(upload_to="group_files/", null=True, blank=True)
    title      = models.CharField(max_length=255, blank=True, default="")
    is_pinned  = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "group_posts"
        ordering = ["-is_pinned", "-created_at"]
        indexes = [
            models.Index(fields=["group", "-created_at"]),
            models.Index(fields=["group", "post_type"]),
        ]

    def __str__(self):
        return f"[{self.post_type}] {self.content[:50]}"


class GroupInvitation(models.Model):
    STATUS_CHOICES = [("pending", "Pending"), ("accepted", "Accepted"), ("declined", "Declined"), ("expired", "Expired")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name="invitations")
    invited_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_invites_sent")
    invited_user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_invites_received")
    token = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "group_invitations"
        unique_together = [["group", "invited_user", "status"]]
        indexes = [
            models.Index(fields=["group", "status"]),
            models.Index(fields=["invited_user", "status"]),
            models.Index(fields=["token"]),
        ]


class GroupMeeting(models.Model):
    STATUS_CHOICES = [("scheduled", "Scheduled"), ("completed", "Completed"), ("cancelled", "Cancelled")]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name="meetings")
    title = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    scheduled_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="scheduled_group_meetings")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    meeting_link = models.URLField(blank=True, default="")
    location = models.CharField(max_length=255, blank=True, default="")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="scheduled")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "group_meetings"
        ordering = ["starts_at"]
        indexes = [
            models.Index(fields=["group", "status"]),
            models.Index(fields=["group", "starts_at"]),
        ]
