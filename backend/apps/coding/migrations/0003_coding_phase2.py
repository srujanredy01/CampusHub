import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("coding", "0002_coding_v2"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="codingquestion",
            name="company_tags",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="codingquestion",
            name="editorial_content",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="codingquestion",
            name="editorial_title",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.CreateModel(
            name="CodingDiscussionMessage",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("body", models.TextField()),
                ("is_deleted", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("parent", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="replies", to="coding.codingdiscussionmessage")),
                ("question", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="discussions", to="coding.codingquestion")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="coding_discussions", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "coding_discussion_messages",
                "ordering": ["created_at"],
            },
        ),
        migrations.CreateModel(
            name="CodingDraft",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("language", models.CharField(choices=[("python", "Python"), ("java", "Java"), ("cpp", "C++"), ("javascript", "JavaScript"), ("c", "C"), ("sql", "SQL"), ("go", "Go")], max_length=15)),
                ("code", models.TextField(blank=True, default="")),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("question", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="drafts", to="coding.codingquestion")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="coding_drafts", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "coding_drafts",
                "unique_together": {("user", "question", "language")},
            },
        ),
        migrations.AddIndex(
            model_name="codingdraft",
            index=models.Index(fields=["user", "question"], name="coding_drafts_user_question_idx"),
        ),
        migrations.AddIndex(
            model_name="codingdraft",
            index=models.Index(fields=["updated_at"], name="coding_drafts_updated_idx"),
        ),
        migrations.AddIndex(
            model_name="codingdiscussionmessage",
            index=models.Index(fields=["question", "created_at"], name="coding_discuss_question_created_idx"),
        ),
        migrations.AddIndex(
            model_name="codingdiscussionmessage",
            index=models.Index(fields=["user", "created_at"], name="coding_discuss_user_created_idx"),
        ),
    ]
