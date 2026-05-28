"""
Real-Time Campus Communication System models for CampusHub.
Supports channels, direct messages, threads, reactions, moderation, and presence.
"""
import uuid
from django.db import models
from django.conf import settings


class Channel(models.Model):
    """A communication channel (academic, subject, coding, placement, etc.)."""

    CHANNEL_TYPE_CHOICES = [
        ("academic_section", "Academic Section"),
        ("subject", "Subject"),
        ("coding_community", "Coding Community"),
        ("placement", "Placement"),
        ("study_group", "Study Group"),
        ("faculty", "Faculty"),
        ("admin_broadcast", "Admin Broadcast"),
        ("general", "General"),
        ("club", "Club"),
    ]

    VISIBILITY_CHOICES = [
        ("public", "Public"),
        ("private", "Private"),
        ("restricted", "Restricted"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True, default="")
    channel_type = models.CharField(max_length=20, choices=CHANNEL_TYPE_CHOICES)
    visibility = models.CharField(max_length=12, choices=VISIBILITY_CHOICES, default="public")
    icon = models.CharField(max_length=10, blank=True, default="💬")
    color = models.CharField(max_length=7, default="#3B82F6")

    # Academic targeting
    branch = models.CharField(max_length=100, blank=True, default="")
    semester = models.PositiveSmallIntegerField(null=True, blank=True)
    section = models.CharField(max_length=10, blank=True, default="")
    subject_name = models.CharField(max_length=100, blank=True, default="")

    # Settings
    is_read_only = models.BooleanField(default=False)
    is_archived = models.BooleanField(default=False)
    is_locked = models.BooleanField(default=False)
    allow_threads = models.BooleanField(default=True)
    allow_reactions = models.BooleanField(default=True)
    allow_file_uploads = models.BooleanField(default=True)
    max_members = models.PositiveIntegerField(default=500)
    slow_mode_seconds = models.PositiveIntegerField(default=0)

    # Moderation
    profanity_filter = models.BooleanField(default=True)
    auto_moderation = models.BooleanField(default=True)

    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="created_channels"
    )
    member_count = models.PositiveIntegerField(default=0)
    message_count = models.PositiveIntegerField(default=0)
    last_message_at = models.DateTimeField(null=True, blank=True)
    pinned_message_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "comm_channels"
        ordering = ["-last_message_at", "name"]
        indexes = [
            models.Index(fields=["channel_type", "is_active"]),
            models.Index(fields=["visibility", "is_active"]),
            models.Index(fields=["branch", "semester", "section"]),
            models.Index(fields=["-last_message_at"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self):
        return f"#{self.name} ({self.channel_type})"


class ChannelMembership(models.Model):
    """User membership in a channel."""

    ROLE_CHOICES = [
        ("owner", "Owner"),
        ("admin", "Admin"),
        ("moderator", "Moderator"),
        ("member", "Member"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="channel_memberships")
    role = models.CharField(max_length=12, choices=ROLE_CHOICES, default="member")
    is_muted = models.BooleanField(default=False)
    muted_until = models.DateTimeField(null=True, blank=True)
    is_banned = models.BooleanField(default=False)
    banned_reason = models.TextField(blank=True, default="")
    notification_preference = models.CharField(
        max_length=10,
        choices=[("all", "All"), ("mentions", "Mentions Only"), ("none", "None")],
        default="all",
    )
    last_read_at = models.DateTimeField(null=True, blank=True)
    unread_count = models.PositiveIntegerField(default=0)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "comm_channel_memberships"
        unique_together = [["channel", "user"]]
        indexes = [
            models.Index(fields=["channel", "is_banned"]),
            models.Index(fields=["user", "is_banned"]),
        ]

    def __str__(self):
        return f"{self.user.full_name} in #{self.channel.name}"


class Message(models.Model):
    """A message in a channel or direct message."""

    MESSAGE_TYPE_CHOICES = [
        ("text", "Text"),
        ("file", "File"),
        ("image", "Image"),
        ("code", "Code Snippet"),
        ("system", "System"),
        ("reply", "Reply"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, related_name="messages", null=True, blank=True)
    conversation = models.ForeignKey(
        "DirectConversation", on_delete=models.CASCADE, related_name="messages", null=True, blank=True
    )
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    content = models.TextField()
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPE_CHOICES, default="text")

    # Code snippet support
    code_language = models.CharField(max_length=30, blank=True, default="")

    # File/Image
    attachment = models.FileField(upload_to="chat_attachments/", null=True, blank=True)
    attachment_name = models.CharField(max_length=255, blank=True, default="")
    attachment_size = models.PositiveIntegerField(default=0)
    attachment_mime = models.CharField(max_length=100, blank=True, default="")

    # Threading
    thread_parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="thread_replies"
    )
    reply_to = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="replies"
    )
    thread_reply_count = models.PositiveIntegerField(default=0)

    # Mentions (stored as JSON array of user IDs)
    mentions = models.JSONField(default=list, blank=True)

    # Status
    is_pinned = models.BooleanField(default=False)
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    edited_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="deleted_messages"
    )

    # Delivery tracking
    delivered_count = models.PositiveIntegerField(default=0)
    read_count = models.PositiveIntegerField(default=0)

    # Reactions count (denormalized)
    reaction_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "comm_messages"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["channel", "created_at"]),
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["sender", "created_at"]),
            models.Index(fields=["channel", "is_pinned"]),
            models.Index(fields=["thread_parent", "created_at"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self):
        return f"{self.sender.full_name}: {self.content[:50]}"


class MessageReaction(models.Model):
    """Emoji reaction on a message."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="message_reactions")
    emoji = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "comm_message_reactions"
        unique_together = [["message", "user", "emoji"]]
        indexes = [
            models.Index(fields=["message", "emoji"]),
        ]


class MessageReadReceipt(models.Model):
    """Tracks message read status per user."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="read_receipts")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="message_read_receipts")
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "comm_message_read_receipts"
        unique_together = [["message", "user"]]


class DirectConversation(models.Model):
    """A direct message conversation between two or more users."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    is_group = models.BooleanField(default=False)
    name = models.CharField(max_length=100, blank=True, default="")
    last_message_at = models.DateTimeField(null=True, blank=True)
    last_message_preview = models.CharField(max_length=200, blank=True, default="")
    message_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "comm_direct_conversations"
        ordering = ["-last_message_at"]
        indexes = [
            models.Index(fields=["-last_message_at"]),
        ]

    def __str__(self):
        return f"DM: {self.name or self.id}"


class ConversationParticipant(models.Model):
    """Participant in a direct conversation."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(DirectConversation, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="dm_participations")
    is_muted = models.BooleanField(default=False)
    is_blocked = models.BooleanField(default=False)
    last_read_at = models.DateTimeField(null=True, blank=True)
    unread_count = models.PositiveIntegerField(default=0)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "comm_conversation_participants"
        unique_together = [["conversation", "user"]]
        indexes = [
            models.Index(fields=["user", "-joined_at"]),
        ]


class UserPresence(models.Model):
    """Tracks user online/offline status."""

    STATUS_CHOICES = [
        ("online", "Online"),
        ("away", "Away"),
        ("busy", "Busy"),
        ("offline", "Offline"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="presence")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="offline")
    custom_status = models.CharField(max_length=100, blank=True, default="")
    last_seen = models.DateTimeField(auto_now=True)
    is_typing_in = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = "comm_user_presence"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["-last_seen"]),
        ]

    def __str__(self):
        return f"{self.user.full_name}: {self.status}"


class BlockedUser(models.Model):
    """User blocking for DMs."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    blocker = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="blocked_users")
    blocked = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="blocked_by")
    reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "comm_blocked_users"
        unique_together = [["blocker", "blocked"]]


class ModerationAction(models.Model):
    """Moderation actions taken on users/messages."""

    ACTION_CHOICES = [
        ("mute", "Mute User"),
        ("unmute", "Unmute User"),
        ("ban", "Ban User"),
        ("unban", "Unban User"),
        ("delete_message", "Delete Message"),
        ("pin_message", "Pin Message"),
        ("unpin_message", "Unpin Message"),
        ("lock_channel", "Lock Channel"),
        ("unlock_channel", "Unlock Channel"),
        ("archive_channel", "Archive Channel"),
        ("warn", "Warn User"),
        ("remove_file", "Remove File"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    moderator = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="moderation_actions")
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, null=True, blank=True, related_name="moderation_actions")
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="moderation_received"
    )
    target_message = models.ForeignKey(Message, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    reason = models.TextField(blank=True, default="")
    duration_minutes = models.PositiveIntegerField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "comm_moderation_actions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["channel", "-created_at"]),
            models.Index(fields=["target_user", "-created_at"]),
            models.Index(fields=["action"]),
        ]


class MessageReport(models.Model):
    """User reports on messages."""

    REASON_CHOICES = [
        ("spam", "Spam"),
        ("harassment", "Harassment"),
        ("inappropriate", "Inappropriate Content"),
        ("hate_speech", "Hate Speech"),
        ("misinformation", "Misinformation"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("reviewed", "Reviewed"),
        ("resolved", "Resolved"),
        ("dismissed", "Dismissed"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="message_reports")
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reports")
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, null=True, blank=True, related_name="reports")
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="pending")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_reports"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    resolution_note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "comm_message_reports"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["channel", "status"]),
        ]


class TypingIndicator(models.Model):
    """Ephemeral typing status (can also be handled purely via WebSocket)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    channel = models.ForeignKey(Channel, on_delete=models.CASCADE, null=True, blank=True)
    conversation = models.ForeignKey(DirectConversation, on_delete=models.CASCADE, null=True, blank=True)
    started_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "comm_typing_indicators"
        indexes = [
            models.Index(fields=["channel", "user"]),
            models.Index(fields=["conversation", "user"]),
        ]


class ChannelRequest(models.Model):
    """Student request to create a new channel. Requires moderator/admin approval."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("needs_changes", "Needs Changes"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="channel_requests"
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    channel_type = models.CharField(max_length=20, choices=Channel.CHANNEL_TYPE_CHOICES)
    visibility = models.CharField(max_length=12, choices=Channel.VISIBILITY_CHOICES, default="public")
    purpose = models.TextField(blank=True, default="", help_text="Why this channel should exist")
    rules = models.TextField(blank=True, default="", help_text="Proposed channel rules")

    # Academic targeting
    branch = models.CharField(max_length=100, blank=True, default="")
    semester = models.PositiveSmallIntegerField(null=True, blank=True)
    section = models.CharField(max_length=10, blank=True, default="")

    # Status
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="pending")
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="reviewed_channel_requests"
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True, default="")
    rejection_reason = models.TextField(blank=True, default="")

    # Result
    created_channel = models.ForeignKey(
        Channel, on_delete=models.SET_NULL, null=True, blank=True, related_name="request"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "comm_channel_requests"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["requested_by", "status"]),
        ]

    def __str__(self):
        return f"Request: #{self.name} by {self.requested_by.full_name} ({self.status})"
