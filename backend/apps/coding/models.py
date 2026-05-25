"""
Coding Questions and Submissions models for CampusHub.
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils.text import slugify


class CodingCategory(models.Model):
    """Language or concept category for grouping questions."""

    CATEGORY_TYPE_CHOICES = [
        ("language", "Language"),
        ("concept", "Concept"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    category_type = models.CharField(max_length=10, choices=CATEGORY_TYPE_CHOICES)
    icon = models.CharField(max_length=10, blank=True, default="")  # emoji
    description = models.TextField(blank=True, default="")
    question_count = models.PositiveIntegerField(default=0)  # denormalized cache
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "coding_categories"
        ordering = ["category_type", "name"]
        indexes = [
            models.Index(fields=["category_type"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.category_type})"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def refresh_count(self):
        self.question_count = self.questions.filter(is_active=True).count()
        self.save(update_fields=["question_count"])


class CodingSolution(models.Model):
    """Official solution for a coding question."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        "CodingQuestion",
        on_delete=models.CASCADE,
        related_name="solutions",
    )
    language = models.CharField(max_length=20)
    solution_code = models.TextField()
    explanation = models.TextField(blank=True, default="")
    time_complexity = models.CharField(max_length=50, blank=True, default="")
    space_complexity = models.CharField(max_length=50, blank=True, default="")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "coding_solutions"
        unique_together = [["question", "language"]]

    def __str__(self):
        return f"{self.question.title} — {self.language}"


class CodingQuestion(models.Model):
    """A coding practice question."""

    DIFFICULTY_CHOICES = [
        ("easy", "Easy"),
        ("medium", "Medium"),
        ("hard", "Hard"),
    ]

    TOPIC_CHOICES = [
        ("arrays", "Arrays"),
        ("strings", "Strings"),
        ("linked_list", "Linked List"),
        ("trees", "Trees"),
        ("graphs", "Graphs"),
        ("dp", "Dynamic Programming"),
        ("sorting", "Sorting"),
        ("searching", "Searching"),
        ("recursion", "Recursion"),
        ("math", "Mathematics"),
        ("greedy", "Greedy"),
        ("backtracking", "Backtracking"),
        ("stack_queue", "Stack & Queue"),
        ("hashing", "Hashing"),
        ("bit_manipulation", "Bit Manipulation"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=300, unique=True, blank=True)
    description = models.TextField()
    topic = models.CharField(max_length=30, choices=TOPIC_CHOICES)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES)
    constraints = models.TextField(blank=True, default="")
    sample_input = models.TextField(blank=True, default="")
    sample_output = models.TextField(blank=True, default="")
    explanation = models.TextField(blank=True, default="")

    # Coding Hub enhancements
    hints = models.JSONField(default=list, blank=True)
    topic_tags = models.JSONField(default=list, blank=True)
    company_tags = models.JSONField(default=list, blank=True)
    supported_languages = models.JSONField(
        default=list,
        blank=True,
        help_text='e.g. ["python", "java", "cpp", "javascript", "c", "sql"]',
    )
    editorial_title = models.CharField(max_length=255, blank=True, default="")
    editorial_content = models.TextField(blank=True, default="")

    # Categories (many-to-many)
    categories = models.ManyToManyField(
        CodingCategory,
        related_name="questions",
        blank=True,
    )

    # Hidden test cases (JSON array of {input, expected_output})
    hidden_test_cases = models.JSONField(default=list)

    # Starter code templates
    starter_code = models.JSONField(
        default=dict,
        help_text='{"python": "...", "java": "...", "cpp": "...", "javascript": "..."}',
    )

    # Stats
    total_submissions = models.PositiveIntegerField(default=0)
    accepted_submissions = models.PositiveIntegerField(default=0)
    view_count = models.PositiveIntegerField(default=0)

    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_questions",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "coding_questions"
        ordering = ["difficulty", "title"]
        indexes = [
            models.Index(fields=["topic", "difficulty"]),
            models.Index(fields=["is_active"]),
        ]

    def __str__(self):
        return f"[{self.difficulty}] {self.title}"

    @property
    def acceptance_rate(self):
        if self.total_submissions == 0:
            return 0
        return round((self.accepted_submissions / self.total_submissions) * 100, 1)


class Submission(models.Model):
    """A code submission by a student."""

    LANGUAGE_CHOICES = [
        ("python", "Python"),
        ("java", "Java"),
        ("cpp", "C++"),
        ("javascript", "JavaScript"),
        ("c", "C"),
        ("sql", "SQL"),
        ("go", "Go"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("running", "Running"),
        ("accepted", "Accepted"),
        ("wrong_answer", "Wrong Answer"),
        ("time_limit_exceeded", "Time Limit Exceeded"),
        ("memory_limit_exceeded", "Memory Limit Exceeded"),
        ("runtime_error", "Runtime Error"),
        ("compilation_error", "Compilation Error"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    question = models.ForeignKey(
        CodingQuestion,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    language = models.CharField(max_length=15, choices=LANGUAGE_CHOICES)
    code = models.TextField()
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="pending")

    # Execution results
    stdout = models.TextField(blank=True, default="")
    stderr = models.TextField(blank=True, default="")
    execution_time = models.FloatField(null=True, blank=True)  # seconds
    memory_used = models.PositiveIntegerField(null=True, blank=True)  # KB

    # Test case results
    test_results = models.JSONField(default=list)
    passed_test_cases = models.PositiveIntegerField(default=0)
    total_test_cases = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "submissions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "question"]),
            models.Index(fields=["user", "status"]),
            models.Index(fields=["question", "status"]),
        ]

    def __str__(self):
        return f"{self.user.full_name} - {self.question.title} ({self.status})"


class SavedQuestion(models.Model):
    """A question bookmarked by a student."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="saved_questions",
    )
    question = models.ForeignKey(
        CodingQuestion,
        on_delete=models.CASCADE,
        related_name="saved_by",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "saved_questions"
        unique_together = [["user", "question"]]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.full_name} saved {self.question.title}"


class CodingDraft(models.Model):
    """Per-user draft code for a question and language."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="coding_drafts",
    )
    question = models.ForeignKey(
        CodingQuestion,
        on_delete=models.CASCADE,
        related_name="drafts",
    )
    language = models.CharField(max_length=15, choices=Submission.LANGUAGE_CHOICES)
    code = models.TextField(default="", blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "coding_drafts"
        unique_together = [["user", "question", "language"]]
        indexes = [
            models.Index(fields=["user", "question"]),
            models.Index(fields=["updated_at"]),
        ]


class CodingDiscussionMessage(models.Model):
    """Discussion thread messages for each coding question."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        CodingQuestion,
        on_delete=models.CASCADE,
        related_name="discussions",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="coding_discussions",
    )
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="replies",
    )
    body = models.TextField()
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "coding_discussion_messages"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["question", "created_at"]),
            models.Index(fields=["user", "created_at"]),
        ]


class Contest(models.Model):
    """Timed coding contest managed by admins."""

    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("published", "Published"),
        ("archived", "Archived"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="draft")
    is_public = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_contests",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "coding_contests"
        ordering = ["-starts_at"]
        indexes = [
            models.Index(fields=["status", "starts_at"]),
            models.Index(fields=["starts_at", "ends_at"]),
        ]

    def __str__(self):
        return self.title

    @property
    def phase(self):
        from django.utils import timezone

        now = timezone.now()
        if now < self.starts_at:
            return "upcoming"
        if self.starts_at <= now <= self.ends_at:
            return "live"
        return "ended"


class ContestProblem(models.Model):
    """Question included in a contest."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contest = models.ForeignKey(Contest, on_delete=models.CASCADE, related_name="contest_problems")
    question = models.ForeignKey(CodingQuestion, on_delete=models.CASCADE, related_name="contest_entries")
    points = models.PositiveIntegerField(default=100)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "coding_contest_problems"
        unique_together = [["contest", "question"]]
        ordering = ["order", "created_at"]
        indexes = [models.Index(fields=["contest", "order"])]

    created_at = models.DateTimeField(auto_now_add=True)


class ContestRegistration(models.Model):
    """Student registration for a contest."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contest = models.ForeignKey(Contest, on_delete=models.CASCADE, related_name="registrations")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="contest_registrations")
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "coding_contest_registrations"
        unique_together = [["contest", "user"]]
        indexes = [models.Index(fields=["contest", "user"])]


class ContestSubmission(models.Model):
    """Submission made inside a contest."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contest = models.ForeignKey(Contest, on_delete=models.CASCADE, related_name="contest_submissions")
    contest_problem = models.ForeignKey(ContestProblem, on_delete=models.CASCADE, related_name="contest_submissions")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="contest_submissions")
    submission = models.OneToOneField(Submission, on_delete=models.CASCADE, related_name="contest_submission")
    score = models.PositiveIntegerField(default=0)
    penalty_seconds = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "coding_contest_submissions"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["contest", "user"]),
            models.Index(fields=["contest_problem", "user"]),
            models.Index(fields=["score", "penalty_seconds"]),
        ]
