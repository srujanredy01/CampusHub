"""
Event Management System models for CampusHub.
Supports hackathons, workshops, seminars, placement drives, club events, etc.
"""
import uuid
import qrcode
from io import BytesIO
from django.db import models
from django.conf import settings
from django.core.files.base import ContentFile
from django.utils import timezone


class Event(models.Model):
    """A campus event."""

    EVENT_TYPE_CHOICES = [
        ("hackathon", "Hackathon"),
        ("coding_contest", "Coding Contest"),
        ("workshop", "Workshop"),
        ("seminar", "Seminar"),
        ("webinar", "Webinar"),
        ("placement_drive", "Placement Drive"),
        ("club_event", "Club Event"),
        ("fest", "Fest"),
        ("guest_lecture", "Guest Lecture"),
        ("alumni_session", "Alumni Session"),
        ("sports", "Sports"),
        ("cultural", "Cultural"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
        ("registration_open", "Registration Open"),
        ("registration_closed", "Registration Closed"),
        ("ongoing", "Ongoing"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
        ("postponed", "Postponed"),
    ]

    VISIBILITY_CHOICES = [
        ("public", "Public"),
        ("branch_specific", "Branch Specific"),
        ("invite_only", "Invite Only"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True)
    description = models.TextField()
    short_description = models.CharField(max_length=500, blank=True, default="")
    event_type = models.CharField(max_length=20, choices=EVENT_TYPE_CHOICES)
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default="draft")
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default="public")

    # Timing
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    registration_deadline = models.DateTimeField(null=True, blank=True)

    # Location
    venue = models.CharField(max_length=255, blank=True, default="")
    venue_address = models.TextField(blank=True, default="")
    is_online = models.BooleanField(default=False)
    meeting_link = models.URLField(blank=True, default="")
    map_link = models.URLField(blank=True, default="")

    # Media
    banner_image = models.ImageField(upload_to="events/banners/", null=True, blank=True)
    thumbnail = models.ImageField(upload_to="events/thumbnails/", null=True, blank=True)

    # Capacity
    max_registrations = models.PositiveIntegerField(default=100)
    current_registrations = models.PositiveIntegerField(default=0)
    waitlist_enabled = models.BooleanField(default=True)
    waitlist_count = models.PositiveIntegerField(default=0)

    # Targeting
    target_branch = models.CharField(max_length=100, blank=True, default="")
    target_semester = models.PositiveSmallIntegerField(null=True, blank=True)
    target_section = models.CharField(max_length=10, blank=True, default="")

    # Organizer
    organized_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="organized_events"
    )
    organizer_name = models.CharField(max_length=255, blank=True, default="")
    organizer_contact = models.CharField(max_length=100, blank=True, default="")
    department = models.CharField(max_length=100, blank=True, default="")
    club_name = models.CharField(max_length=100, blank=True, default="")

    # Features
    has_certificates = models.BooleanField(default=False)
    has_qr_checkin = models.BooleanField(default=True)
    has_live_chat = models.BooleanField(default=True)
    has_polls = models.BooleanField(default=False)
    has_qa = models.BooleanField(default=False)
    has_feedback = models.BooleanField(default=True)

    # Materials
    materials = models.JSONField(default=list, blank=True, help_text="Event materials/attachments")
    tags = models.JSONField(default=list, blank=True)
    speakers = models.JSONField(default=list, blank=True, help_text="Speaker details")
    agenda = models.JSONField(default=list, blank=True, help_text="Event agenda/schedule")

    # Stats
    view_count = models.PositiveIntegerField(default=0)
    share_count = models.PositiveIntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    feedback_count = models.PositiveIntegerField(default=0)

    # Metadata
    is_featured = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "events"
        ordering = ["-starts_at"]
        indexes = [
            models.Index(fields=["event_type", "status"]),
            models.Index(fields=["status", "-starts_at"]),
            models.Index(fields=["is_featured", "-starts_at"]),
            models.Index(fields=["organized_by", "-starts_at"]),
            models.Index(fields=["target_branch", "target_semester"]),
            models.Index(fields=["-starts_at"]),
            models.Index(fields=["slug"]),
        ]

    def __str__(self):
        return f"[{self.event_type}] {self.title}"

    @property
    def is_registration_open(self):
        if self.status not in ("published", "registration_open"):
            return False
        if self.registration_deadline and timezone.now() > self.registration_deadline:
            return False
        if self.current_registrations >= self.max_registrations and not self.waitlist_enabled:
            return False
        return True

    @property
    def is_full(self):
        return self.current_registrations >= self.max_registrations

    @property
    def phase(self):
        now = timezone.now()
        if now < self.starts_at:
            return "upcoming"
        if self.starts_at <= now <= self.ends_at:
            return "live"
        return "ended"


class EventRegistration(models.Model):
    """Student registration for an event."""

    STATUS_CHOICES = [
        ("registered", "Registered"),
        ("waitlisted", "Waitlisted"),
        ("confirmed", "Confirmed"),
        ("checked_in", "Checked In"),
        ("attended", "Attended"),
        ("no_show", "No Show"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="registrations")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="event_registrations")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="registered")

    # QR Ticket
    qr_code = models.ImageField(upload_to="events/qr_codes/", null=True, blank=True)
    ticket_id = models.CharField(max_length=20, unique=True, blank=True)

    # Check-in
    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_in_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="checkins_performed"
    )

    # Waitlist
    waitlist_position = models.PositiveIntegerField(null=True, blank=True)

    # Metadata
    registration_answers = models.JSONField(default=dict, blank=True)
    notes = models.TextField(blank=True, default="")
    registered_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "event_registrations"
        unique_together = [["event", "user"]]
        ordering = ["-registered_at"]
        indexes = [
            models.Index(fields=["event", "status"]),
            models.Index(fields=["user", "status"]),
            models.Index(fields=["ticket_id"]),
            models.Index(fields=["event", "-registered_at"]),
        ]

    def __str__(self):
        return f"{self.user.full_name} → {self.event.title} ({self.status})"

    def generate_ticket_id(self):
        """Generate a unique ticket ID."""
        import secrets
        self.ticket_id = f"EVT-{secrets.token_hex(4).upper()}"
        return self.ticket_id

    def generate_qr_code(self):
        """Generate QR code for the ticket."""
        if not self.ticket_id:
            self.generate_ticket_id()

        qr_data = f"CAMPUSHUB_EVENT|{self.event.id}|{self.user.id}|{self.ticket_id}"
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(qr_data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        buffer = BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)

        filename = f"qr_{self.ticket_id}.png"
        self.qr_code.save(filename, ContentFile(buffer.read()), save=False)
        return self.qr_code

    def save(self, *args, **kwargs):
        if not self.ticket_id:
            self.generate_ticket_id()
        super().save(*args, **kwargs)


class EventFeedback(models.Model):
    """Post-event feedback from attendees."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="feedbacks")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="event_feedbacks")
    rating = models.PositiveSmallIntegerField(help_text="1-5 stars")
    content_rating = models.PositiveSmallIntegerField(default=3)
    organization_rating = models.PositiveSmallIntegerField(default=3)
    speaker_rating = models.PositiveSmallIntegerField(null=True, blank=True)
    comment = models.TextField(blank=True, default="")
    suggestions = models.TextField(blank=True, default="")
    would_recommend = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "event_feedbacks"
        unique_together = [["event", "user"]]
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event", "-created_at"]),
        ]


class EventCertificate(models.Model):
    """Auto-generated certificates for event attendees."""

    CERTIFICATE_TYPE_CHOICES = [
        ("participation", "Participation"),
        ("completion", "Completion"),
        ("winner", "Winner"),
        ("runner_up", "Runner Up"),
        ("speaker", "Speaker"),
        ("organizer", "Organizer"),
        ("volunteer", "Volunteer"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="certificates")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="event_certificates")
    certificate_type = models.CharField(max_length=15, choices=CERTIFICATE_TYPE_CHOICES, default="participation")
    certificate_id = models.CharField(max_length=30, unique=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    pdf_file = models.FileField(upload_to="events/certificates/", null=True, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="issued_certificates"
    )
    is_verified = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "event_certificates"
        unique_together = [["event", "user", "certificate_type"]]
        ordering = ["-issued_at"]
        indexes = [
            models.Index(fields=["user", "-issued_at"]),
            models.Index(fields=["certificate_id"]),
            models.Index(fields=["event", "certificate_type"]),
        ]

    def __str__(self):
        return f"{self.user.full_name} — {self.event.title} ({self.certificate_type})"

    def save(self, *args, **kwargs):
        if not self.certificate_id:
            import secrets
            self.certificate_id = f"CERT-{secrets.token_hex(6).upper()}"
        super().save(*args, **kwargs)


class EventPoll(models.Model):
    """Live polls during events."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="polls")
    question = models.CharField(max_length=500)
    options = models.JSONField(default=list)
    is_active = models.BooleanField(default=True)
    allow_multiple = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    total_votes = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    ends_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "event_polls"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event", "is_active"]),
        ]


class EventPollVote(models.Model):
    """Vote on an event poll."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    poll = models.ForeignKey(EventPoll, on_delete=models.CASCADE, related_name="votes")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    option_index = models.PositiveSmallIntegerField()
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "event_poll_votes"
        unique_together = [["poll", "user", "option_index"]]


class EventQuestion(models.Model):
    """Q&A questions during live events."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="questions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="event_questions")
    question = models.TextField()
    is_answered = models.BooleanField(default=False)
    answer = models.TextField(blank=True, default="")
    answered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="answered_event_questions"
    )
    upvotes = models.PositiveIntegerField(default=0)
    is_pinned = models.BooleanField(default=False)
    is_hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "event_questions"
        ordering = ["-upvotes", "-created_at"]
        indexes = [
            models.Index(fields=["event", "-upvotes"]),
            models.Index(fields=["event", "is_answered"]),
        ]


class EventQuestionUpvote(models.Model):
    """Upvote on an event question."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(EventQuestion, on_delete=models.CASCADE, related_name="upvote_records")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "event_question_upvotes"
        unique_together = [["question", "user"]]


class EventAnnouncement(models.Model):
    """Live announcements during events."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="announcements")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    content = models.TextField()
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "event_announcements"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["event", "-created_at"]),
        ]


class EventChatMessage(models.Model):
    """Live chat messages during events."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="chat_messages")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="event_chat_messages")
    content = models.TextField()
    is_deleted = models.BooleanField(default=False)
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="deleted_event_messages"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "event_chat_messages"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["event", "created_at"]),
        ]
