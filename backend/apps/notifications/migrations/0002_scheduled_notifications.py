import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ScheduledNotification",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("notification_type", models.CharField(choices=[("new_resource", "New Resource"), ("campus_news", "Campus News"), ("coding_reminder", "Coding Reminder"), ("system", "System")], default="system", max_length=20)),
                ("title", models.CharField(max_length=255)),
                ("message", models.TextField()),
                ("target_branch", models.CharField(blank=True, default="", max_length=100)),
                ("target_semester", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("scheduled_for", models.DateTimeField(blank=True, null=True)),
                ("status", models.CharField(choices=[("draft", "Draft"), ("scheduled", "Scheduled"), ("approved", "Approved"), ("sent", "Sent"), ("cancelled", "Cancelled")], default="draft", max_length=20)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("approved_at", models.DateTimeField(blank=True, null=True)),
                ("sent_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("approved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="scheduled_notifications_approved", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="scheduled_notifications_created", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "scheduled_notifications",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="schedulednotification",
            index=models.Index(fields=["status", "scheduled_for"], name="scheduled_notifications_status_scheduled_idx"),
        ),
        migrations.AddIndex(
            model_name="schedulednotification",
            index=models.Index(fields=["target_branch", "target_semester"], name="scheduled_notifications_target_idx"),
        ),
    ]
