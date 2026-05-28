"""
Initial migration for the Feedback & Issue Reporting system.
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="FeedbackReport",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("tracking_id", models.CharField(editable=False, help_text="Human-readable tracking ID like FB-2026-1042", max_length=20, unique=True)),
                ("feedback_type", models.CharField(choices=[("bug", "Report Bug"), ("feature", "Suggest Feature"), ("general", "General Feedback"), ("ui_ux", "UI/UX Feedback"), ("performance", "Performance Issue"), ("security", "Security Concern"), ("academic", "Academic Issue"), ("placement", "Placement Module Feedback"), ("chat", "Chat/Study Group Issue")], max_length=15)),
                ("severity", models.CharField(choices=[("low", "Low"), ("medium", "Medium"), ("high", "High"), ("critical", "Critical")], default="medium", max_length=10)),
                ("title", models.CharField(blank=True, default="", max_length=255)),
                ("description", models.TextField()),
                ("tags", models.JSONField(blank=True, default=list, help_text="Category tags like UI Issue, Performance, etc.")),
                ("page_url", models.CharField(blank=True, default="", max_length=500)),
                ("route_path", models.CharField(blank=True, default="", max_length=255)),
                ("browser_info", models.CharField(blank=True, default="", max_length=500)),
                ("device_type", models.CharField(blank=True, default="", max_length=50)),
                ("screen_resolution", models.CharField(blank=True, default="", max_length=50)),
                ("user_agent", models.TextField(blank=True, default="")),
                ("status", models.CharField(choices=[("open", "Open"), ("investigating", "Investigating"), ("resolved", "Resolved"), ("closed", "Closed"), ("rejected", "Rejected"), ("needs_more_info", "Needs More Info")], default="open", max_length=15)),
                ("priority", models.CharField(choices=[("low", "Low"), ("medium", "Medium"), ("high", "High"), ("critical", "Critical")], default="medium", max_length=10)),
                ("resolution_note", models.TextField(blank=True, default="")),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("is_archived", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="feedback_reports", to=settings.AUTH_USER_MODEL)),
                ("assigned_to", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_feedback", to=settings.AUTH_USER_MODEL)),
                ("resolved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="resolved_feedback", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "feedback_reports",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="FeedbackAttachment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("file", models.FileField(upload_to="feedback/attachments/%Y/%m/")),
                ("file_name", models.CharField(max_length=255)),
                ("file_size", models.PositiveIntegerField(help_text="File size in bytes")),
                ("content_type", models.CharField(max_length=100)),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
                ("report", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attachments", to="feedback.feedbackreport")),
            ],
            options={
                "db_table": "feedback_attachments",
                "ordering": ["uploaded_at"],
            },
        ),
        migrations.CreateModel(
            name="FeedbackResponse",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("message", models.TextField()),
                ("is_internal", models.BooleanField(default=False, help_text="Internal notes not visible to the reporter")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("report", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="responses", to="feedback.feedbackreport")),
                ("responder", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="feedback_responses", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "feedback_responses",
                "ordering": ["created_at"],
            },
        ),
        migrations.CreateModel(
            name="FeedbackStatusHistory",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("old_status", models.CharField(max_length=15)),
                ("new_status", models.CharField(max_length=15)),
                ("note", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("report", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="status_history", to="feedback.feedbackreport")),
                ("changed_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="feedback_status_changes", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "feedback_status_history",
                "ordering": ["-created_at"],
            },
        ),
        # Indexes
        migrations.AddIndex(
            model_name="feedbackreport",
            index=models.Index(fields=["status", "priority", "-created_at"], name="feedback_re_status_7a1b2c_idx"),
        ),
        migrations.AddIndex(
            model_name="feedbackreport",
            index=models.Index(fields=["feedback_type", "status"], name="feedback_re_feedbac_3d4e5f_idx"),
        ),
        migrations.AddIndex(
            model_name="feedbackreport",
            index=models.Index(fields=["user", "-created_at"], name="feedback_re_user_id_6g7h8i_idx"),
        ),
        migrations.AddIndex(
            model_name="feedbackreport",
            index=models.Index(fields=["assigned_to", "status"], name="feedback_re_assigne_9j0k1l_idx"),
        ),
        migrations.AddIndex(
            model_name="feedbackreport",
            index=models.Index(fields=["tracking_id"], name="feedback_re_trackin_2m3n4o_idx"),
        ),
        migrations.AddIndex(
            model_name="feedbackreport",
            index=models.Index(fields=["-created_at"], name="feedback_re_created_5p6q7r_idx"),
        ),
    ]
