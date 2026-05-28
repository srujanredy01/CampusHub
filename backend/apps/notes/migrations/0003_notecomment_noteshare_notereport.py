"""
Migration for NoteComment, NoteShare, NoteReport models.
"""
import uuid
import secrets
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("notes", "0002_notes_hardening"),
    ]

    operations = [
        # ── NoteComment ───────────────────────────────────────────────────────
        migrations.CreateModel(
            name="NoteComment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("content", models.TextField()),
                ("is_deleted", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "note",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="comments",
                        to="notes.note",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="note_comments",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "parent",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="replies",
                        to="notes.notecomment",
                    ),
                ),
            ],
            options={
                "db_table": "note_comments",
                "ordering": ["created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="notecomment",
            index=models.Index(fields=["note", "created_at"], name="note_cmt_note_created_idx"),
        ),
        migrations.AddIndex(
            model_name="notecomment",
            index=models.Index(fields=["user", "created_at"], name="note_cmt_user_created_idx"),
        ),

        # ── NoteShare ─────────────────────────────────────────────────────────
        migrations.CreateModel(
            name="NoteShare",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("share_type", models.CharField(
                    choices=[("public", "Public"), ("private", "Private"), ("link", "Link Share")],
                    default="public", max_length=10,
                )),
                ("share_link", models.CharField(blank=True, max_length=64, unique=True)),
                ("message", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "note",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="shares",
                        to="notes.note",
                    ),
                ),
                (
                    "shared_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notes_shared",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "shared_with",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notes_received",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "note_shares",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="noteshare",
            index=models.Index(fields=["note", "-created_at"], name="note_share_note_created_idx"),
        ),
        migrations.AddIndex(
            model_name="noteshare",
            index=models.Index(fields=["shared_with", "-created_at"], name="note_share_with_created_idx"),
        ),
        migrations.AddIndex(
            model_name="noteshare",
            index=models.Index(fields=["share_link"], name="note_share_link_idx"),
        ),

        # ── NoteReport ────────────────────────────────────────────────────────
        migrations.CreateModel(
            name="NoteReport",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("reason", models.CharField(
                    choices=[
                        ("spam", "Spam"),
                        ("inappropriate", "Inappropriate Content"),
                        ("copyright", "Copyright Violation"),
                        ("misleading", "Misleading Information"),
                        ("other", "Other"),
                    ],
                    max_length=20,
                )),
                ("description", models.TextField(blank=True, default="")),
                ("status", models.CharField(
                    choices=[
                        ("pending", "Pending"),
                        ("reviewed", "Reviewed"),
                        ("resolved", "Resolved"),
                        ("dismissed", "Dismissed"),
                    ],
                    default="pending", max_length=10,
                )),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "note",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="reports",
                        to="notes.note",
                    ),
                ),
                (
                    "reporter",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="note_reports",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "reviewed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="reviewed_note_reports",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "note_reports",
                "ordering": ["-created_at"],
                "unique_together": {("note", "reporter")},
            },
        ),
        migrations.AddIndex(
            model_name="notereport",
            index=models.Index(fields=["status", "-created_at"], name="note_report_status_idx"),
        ),
    ]
