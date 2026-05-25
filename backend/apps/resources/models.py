import uuid
from django.db import models
from django.conf import settings


class Resource(models.Model):
    FILE_TYPE_CHOICES = [
        ("pdf", "PDF"),
        ("presentation", "Presentation"),
        ("document", "Document"),
        ("spreadsheet", "Spreadsheet"),
        ("other", "Other"),
    ]

    ACADEMIC_YEAR_CHOICES = [
        (1, "1st Year"),
        (2, "2nd Year"),
        (3, "3rd Year"),
        (4, "4th Year"),
    ]

    # Semester ranges per academic year
    YEAR_SEMESTER_MAP = {
        1: [1, 2],
        2: [3, 4],
        3: [5, 6],
        4: [7, 8],
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    subject = models.CharField(max_length=100)
    branch = models.CharField(max_length=100)
    academic_year = models.PositiveSmallIntegerField(
        choices=ACADEMIC_YEAR_CHOICES, default=1
    )
    semester = models.PositiveSmallIntegerField()
    file_type = models.CharField(
        max_length=20, choices=FILE_TYPE_CHOICES, default="pdf"
    )
    file = models.FileField(upload_to="resources/", null=True, blank=True)
    file_name = models.CharField(max_length=255, blank=True)
    file_size = models.PositiveBigIntegerField(default=0)
    file_mime_type = models.CharField(max_length=100, blank=True)
    external_url = models.URLField(blank=True, default="")
    preview_supported = models.BooleanField(default=False)
    tags = models.CharField(max_length=500, blank=True, default="",
                            help_text="Comma-separated tags")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_resources",
    )
    view_count = models.PositiveIntegerField(default=0)
    download_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "resources"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["academic_year", "semester"], name="res_year_sem_idx"),
            models.Index(fields=["branch", "semester"], name="res_branch_sem_idx"),
            models.Index(fields=["file_type"], name="res_file_type_idx"),
            models.Index(fields=["is_active", "-created_at"], name="res_active_created_idx"),
        ]

    def __str__(self):
        return f"{self.title} ({self.file_type}) — Year {self.academic_year} Sem {self.semester}"

    @property
    def tags_list(self):
        return [t.strip() for t in self.tags.split(",") if t.strip()]
