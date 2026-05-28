"""
Migration: Add ChannelRequest model for moderated channel creation.
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("communication", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ChannelRequest",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True, default="")),
                ("channel_type", models.CharField(
                    choices=[
                        ("academic_section", "Academic Section"), ("subject", "Subject"),
                        ("coding_community", "Coding Community"), ("placement", "Placement"),
                        ("study_group", "Study Group"), ("faculty", "Faculty"),
                        ("admin_broadcast", "Admin Broadcast"), ("general", "General"), ("club", "Club"),
                    ],
                    max_length=20,
                )),
                ("visibility", models.CharField(
                    choices=[("public", "Public"), ("private", "Private"), ("restricted", "Restricted")],
                    default="public", max_length=12,
                )),
                ("purpose", models.TextField(blank=True, default="")),
                ("rules", models.TextField(blank=True, default="")),
                ("branch", models.CharField(blank=True, default="", max_length=100)),
                ("semester", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("section", models.CharField(blank=True, default="", max_length=10)),
                ("status", models.CharField(
                    choices=[("pending", "Pending"), ("approved", "Approved"), ("rejected", "Rejected"), ("needs_changes", "Needs Changes")],
                    default="pending", max_length=15,
                )),
                ("review_notes", models.TextField(blank=True, default="")),
                ("rejection_reason", models.TextField(blank=True, default="")),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("requested_by", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="channel_requests",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("reviewed_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="reviewed_channel_requests",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("created_channel", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="request",
                    to="communication.channel",
                )),
            ],
            options={
                "db_table": "comm_channel_requests",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="channelrequest",
            index=models.Index(fields=["status", "-created_at"], name="comm_chreq_status_idx"),
        ),
        migrations.AddIndex(
            model_name="channelrequest",
            index=models.Index(fields=["requested_by", "status"], name="comm_chreq_user_idx"),
        ),
    ]
