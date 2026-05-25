import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("study_groups", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="studygroup",
            name="last_activity_at",
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name="studygroup",
            name="websocket_room",
            field=models.CharField(blank=True, default="", max_length=80),
        ),
        migrations.AddField(
            model_name="grouppost",
            name="is_deleted",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="grouppost",
            name="title",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.CreateModel(
            name="GroupInvitation",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("token", models.CharField(max_length=64, unique=True)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("accepted", "Accepted"), ("declined", "Declined"), ("expired", "Expired")], default="pending", max_length=10)),
                ("expires_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("group", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="invitations", to="study_groups.studygroup")),
                ("invited_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="group_invites_sent", to=settings.AUTH_USER_MODEL)),
                ("invited_user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="group_invites_received", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "group_invitations",
                "unique_together": {("group", "invited_user", "status")},
            },
        ),
        migrations.CreateModel(
            name="GroupMeeting",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=150)),
                ("description", models.TextField(blank=True, default="")),
                ("starts_at", models.DateTimeField()),
                ("ends_at", models.DateTimeField()),
                ("meeting_link", models.URLField(blank=True, default="")),
                ("location", models.CharField(blank=True, default="", max_length=255)),
                ("status", models.CharField(choices=[("scheduled", "Scheduled"), ("completed", "Completed"), ("cancelled", "Cancelled")], default="scheduled", max_length=10)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("group", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="meetings", to="study_groups.studygroup")),
                ("scheduled_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="scheduled_group_meetings", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "group_meetings", "ordering": ["starts_at"]},
        ),
        migrations.AddIndex(
            model_name="studygroup",
            index=models.Index(fields=["visibility", "is_active"], name="study_groups_vis_idx"),
        ),
        migrations.AddIndex(
            model_name="studygroup",
            index=models.Index(fields=["branch", "semester"], name="study_groups_branch_sem_idx"),
        ),
        migrations.AddIndex(
            model_name="studygroup",
            index=models.Index(fields=["-last_activity_at"], name="study_groups_activity_idx"),
        ),
        migrations.AddIndex(
            model_name="groupmembership",
            index=models.Index(fields=["group", "is_active"], name="study_group_member_group_idx"),
        ),
        migrations.AddIndex(
            model_name="groupmembership",
            index=models.Index(fields=["user", "is_active"], name="study_group_member_user_idx"),
        ),
        migrations.AddIndex(
            model_name="grouppost",
            index=models.Index(fields=["group", "-created_at"], name="study_group_post_group_created_idx"),
        ),
        migrations.AddIndex(
            model_name="grouppost",
            index=models.Index(fields=["group", "post_type"], name="study_group_post_type_idx"),
        ),
        migrations.AddIndex(
            model_name="groupinvitation",
            index=models.Index(fields=["group", "status"], name="study_group_inv_group_status_idx"),
        ),
        migrations.AddIndex(
            model_name="groupinvitation",
            index=models.Index(fields=["invited_user", "status"], name="study_group_inv_user_status_idx"),
        ),
        migrations.AddIndex(
            model_name="groupinvitation",
            index=models.Index(fields=["token"], name="study_group_inv_token_idx"),
        ),
        migrations.AddIndex(
            model_name="groupmeeting",
            index=models.Index(fields=["group", "status"], name="study_group_meeting_status_idx"),
        ),
        migrations.AddIndex(
            model_name="groupmeeting",
            index=models.Index(fields=["group", "starts_at"], name="study_group_meeting_start_idx"),
        ),
    ]
