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
    tags        = models.JSONField(default=list, blank=True)
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

    @property
    def online_count(self):
        """Returns count of members active in last 5 minutes."""
        threshold = timezone.now() - timezone.timedelta(minutes=5)
        return self.memberships.filter(is_active=True, last_seen__gte=threshold).count()


class GroupMembership(models.Model):
    ROLE_CHOICES = [("admin", "Admin"), ("moderator", "Moderator"), ("member", "Member")]

    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group     = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name="memberships")
    user      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_memberships")
    role      = models.CharField(max_length=10, choices=ROLE_CHOICES, default="member")
    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(null=True, blank=True)
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
    topic = models.CharField(max_length=200, blank=True, default="")
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


# ═══════════════════════════════════════════════════════════════════════════════
# NEW MODELS — Real-time Chat, Tasks, Resources, Polls
# ═══════════════════════════════════════════════════════════════════════════════


class ChatMessage(models.Model):
    """Real-time chat messages within a study group."""
    MESSAGE_TYPE_CHOICES = [
        ("text", "Text"),
        ("system", "System"),
        ("file", "File"),
    ]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group      = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name="chat_messages")
    sender     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="group_chat_messages")
    content    = models.TextField()
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPE_CHOICES, default="text")
    attachment = models.FileField(upload_to="group_chat_files/", null=True, blank=True)
    reply_to   = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="replies")
    is_pinned  = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    edited_at  = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "group_chat_messages"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["group", "created_at"]),
            models.Index(fields=["group", "is_pinned"]),
            models.Index(fields=["sender", "created_at"]),
        ]

    def __str__(self):
        return f"{self.sender}: {self.content[:40]}"


class MessageReadReceipt(models.Model):
    """Tracks which messages have been read by which users."""
    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(ChatMessage, on_delete=models.CASCADE, related_name="read_receipts")
    user    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "group_message_read_receipts"
        unique_together = [["message", "user"]]


class GroupTask(models.Model):
    """Kanban-style task board for study groups."""
    STATUS_CHOICES = [
        ("todo", "To Study"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group       = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name="tasks")
    title       = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    status      = models.CharField(max_length=15, choices=STATUS_CHOICES, default="todo")
    priority    = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="medium")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_group_tasks"
    )
    created_by  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_group_tasks")
    deadline    = models.DateTimeField(null=True, blank=True)
    position    = models.PositiveIntegerField(default=0)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "group_tasks"
        ordering = ["position", "-created_at"]
        indexes = [
            models.Index(fields=["group", "status"]),
            models.Index(fields=["assigned_to", "status"]),
            models.Index(fields=["group", "position"]),
        ]

    def __str__(self):
        return self.title


class SharedResource(models.Model):
    """Shared files and links within a study group."""
    RESOURCE_TYPE_CHOICES = [
        ("pdf", "PDF"),
        ("ppt", "Presentation"),
        ("doc", "Document"),
        ("link", "Link"),
        ("image", "Image"),
        ("other", "Other"),
    ]

    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group         = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name="shared_resources")
    title         = models.CharField(max_length=200)
    description   = models.TextField(blank=True, default="")
    resource_type = models.CharField(max_length=10, choices=RESOURCE_TYPE_CHOICES, default="other")
    file          = models.FileField(upload_to="group_resources/", null=True, blank=True)
    url           = models.URLField(blank=True, default="")
    file_size     = models.PositiveIntegerField(default=0)  # bytes
    uploaded_by   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="shared_group_resources")
    download_count = models.PositiveIntegerField(default=0)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "group_shared_resources"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["group", "-created_at"]),
            models.Index(fields=["group", "resource_type"]),
        ]

    def __str__(self):
        return self.title


class GroupPoll(models.Model):
    """Quick polls/decisions within a study group."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group       = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name="polls")
    question    = models.CharField(max_length=300)
    created_by  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_group_polls")
    is_active   = models.BooleanField(default=True)
    allow_multiple = models.BooleanField(default=False)
    expires_at  = models.DateTimeField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "group_polls"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["group", "is_active"]),
        ]

    def __str__(self):
        return self.question[:50]

    @property
    def total_votes(self):
        return PollVote.objects.filter(option__poll=self).count()


class PollOption(models.Model):
    """Options for a group poll."""
    id   = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    poll = models.ForeignKey(GroupPoll, on_delete=models.CASCADE, related_name="options")
    text = models.CharField(max_length=200)

    class Meta:
        db_table = "group_poll_options"

    @property
    def vote_count(self):
        return self.votes.count()


class PollVote(models.Model):
    """Votes on poll options."""
    id     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    option = models.ForeignKey(PollOption, on_delete=models.CASCADE, related_name="votes")
    user   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "group_poll_votes"
        unique_together = [["option", "user"]]


class StudyTimer(models.Model):
    """Pomodoro/study timer sessions for groups."""
    TIMER_MODE_CHOICES = [
        ("pomodoro_25", "25 min Focus"),
        ("pomodoro_50", "50 min Focus"),
        ("custom", "Custom"),
    ]
    STATUS_CHOICES = [
        ("active", "Active"),
        ("paused", "Paused"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    group       = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name="timers")
    started_by  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="started_timers")
    mode        = models.CharField(max_length=15, choices=TIMER_MODE_CHOICES, default="pomodoro_25")
    duration_minutes = models.PositiveIntegerField(default=25)
    break_minutes    = models.PositiveIntegerField(default=5)
    status      = models.CharField(max_length=10, choices=STATUS_CHOICES, default="active")
    started_at  = models.DateTimeField(default=timezone.now)
    ends_at     = models.DateTimeField()
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "group_study_timers"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["group", "status"]),
        ]

    def save(self, *args, **kwargs):
        if not self.ends_at:
            self.ends_at = self.started_at + timezone.timedelta(minutes=self.duration_minutes)
        super().save(*args, **kwargs)
