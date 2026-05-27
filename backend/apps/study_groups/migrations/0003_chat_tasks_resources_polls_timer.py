"""
Add ChatMessage, GroupTask, SharedResource, GroupPoll, PollOption, PollVote, StudyTimer models.
Also adds tags field to StudyGroup and last_seen/topic fields.
"""
import uuid
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("study_groups", "0002_groups_advanced_features"),
    ]

    operations = [
        # Add tags to StudyGroup
        migrations.AddField(
            model_name="studygroup",
            name="tags",
            field=models.JSONField(blank=True, default=list),
        ),
        # Add last_seen to GroupMembership
        migrations.AddField(
            model_name="groupmembership",
            name="last_seen",
            field=models.DateTimeField(blank=True, null=True),
        ),
        # Add topic to GroupMeeting
        migrations.AddField(
            model_name="groupmeeting",
            name="topic",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
        # ChatMessage
        migrations.CreateModel(
            name="ChatMessage",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("content", models.TextField()),
                ("message_type", models.CharField(choices=[("text", "Text"), ("system", "System"), ("file", "File")], default="text", max_length=10)),
                ("attachment", models.FileField(blank=True, null=True, upload_to="group_chat_files/")),
                ("is_pinned", models.BooleanField(default=False)),
                ("is_deleted", models.BooleanField(default=False)),
                ("edited_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("group", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="chat_messages", to="study_groups.studygroup")),
                ("sender", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="group_chat_messages", to=settings.AUTH_USER_MODEL)),
                ("reply_to", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="replies", to="study_groups.chatmessage")),
            ],
            options={
                "db_table": "group_chat_messages",
                "ordering": ["created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="chatmessage",
            index=models.Index(fields=["group", "created_at"], name="group_chat__group_i_idx"),
        ),
        migrations.AddIndex(
            model_name="chatmessage",
            index=models.Index(fields=["group", "is_pinned"], name="group_chat__group_p_idx"),
        ),
        migrations.AddIndex(
            model_name="chatmessage",
            index=models.Index(fields=["sender", "created_at"], name="group_chat__sender_idx"),
        ),
        # MessageReadReceipt
        migrations.CreateModel(
            name="MessageReadReceipt",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("read_at", models.DateTimeField(auto_now_add=True)),
                ("message", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="read_receipts", to="study_groups.chatmessage")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "group_message_read_receipts",
                "unique_together": {("message", "user")},
            },
        ),
        # GroupTask
        migrations.CreateModel(
            name="GroupTask",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True, default="")),
                ("status", models.CharField(choices=[("todo", "To Study"), ("in_progress", "In Progress"), ("completed", "Completed")], default="todo", max_length=15)),
                ("priority", models.CharField(choices=[("low", "Low"), ("medium", "Medium"), ("high", "High")], default="medium", max_length=10)),
                ("deadline", models.DateTimeField(blank=True, null=True)),
                ("position", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("group", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="tasks", to="study_groups.studygroup")),
                ("assigned_to", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="assigned_group_tasks", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="created_group_tasks", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "group_tasks",
                "ordering": ["position", "-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="grouptask",
            index=models.Index(fields=["group", "status"], name="group_tasks_grp_status_idx"),
        ),
        migrations.AddIndex(
            model_name="grouptask",
            index=models.Index(fields=["assigned_to", "status"], name="group_tasks_assign_idx"),
        ),
        # SharedResource
        migrations.CreateModel(
            name="SharedResource",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=200)),
                ("description", models.TextField(blank=True, default="")),
                ("resource_type", models.CharField(choices=[("pdf", "PDF"), ("ppt", "Presentation"), ("doc", "Document"), ("link", "Link"), ("image", "Image"), ("other", "Other")], default="other", max_length=10)),
                ("file", models.FileField(blank=True, null=True, upload_to="group_resources/")),
                ("url", models.URLField(blank=True, default="")),
                ("file_size", models.PositiveIntegerField(default=0)),
                ("download_count", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("group", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shared_resources", to="study_groups.studygroup")),
                ("uploaded_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="shared_group_resources", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "group_shared_resources",
                "ordering": ["-created_at"],
            },
        ),
        # GroupPoll
        migrations.CreateModel(
            name="GroupPoll",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("question", models.CharField(max_length=300)),
                ("is_active", models.BooleanField(default=True)),
                ("allow_multiple", models.BooleanField(default=False)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("group", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="polls", to="study_groups.studygroup")),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="created_group_polls", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "group_polls",
                "ordering": ["-created_at"],
            },
        ),
        # PollOption
        migrations.CreateModel(
            name="PollOption",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("text", models.CharField(max_length=200)),
                ("poll", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="options", to="study_groups.grouppoll")),
            ],
            options={
                "db_table": "group_poll_options",
            },
        ),
        # PollVote
        migrations.CreateModel(
            name="PollVote",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("voted_at", models.DateTimeField(auto_now_add=True)),
                ("option", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="votes", to="study_groups.polloption")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "group_poll_votes",
                "unique_together": {("option", "user")},
            },
        ),
        # StudyTimer
        migrations.CreateModel(
            name="StudyTimer",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("mode", models.CharField(choices=[("pomodoro_25", "25 min Focus"), ("pomodoro_50", "50 min Focus"), ("custom", "Custom")], default="pomodoro_25", max_length=15)),
                ("duration_minutes", models.PositiveIntegerField(default=25)),
                ("break_minutes", models.PositiveIntegerField(default=5)),
                ("status", models.CharField(choices=[("active", "Active"), ("paused", "Paused"), ("completed", "Completed"), ("cancelled", "Cancelled")], default="active", max_length=10)),
                ("started_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("ends_at", models.DateTimeField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("group", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="timers", to="study_groups.studygroup")),
                ("started_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="started_timers", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "group_study_timers",
                "ordering": ["-created_at"],
            },
        ),
    ]
