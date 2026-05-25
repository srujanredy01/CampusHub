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
            name="NewsAnnouncement",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=255)),
                ("content", models.TextField()),
                ("category", models.CharField(choices=[("placement", "Placement"), ("internship", "Internship"), ("event", "Campus Event"), ("circular", "College Circular"), ("exam", "Exam Update"), ("general", "General")], default="general", max_length=20)),
                ("priority", models.CharField(choices=[("low", "Low"), ("medium", "Medium"), ("high", "High"), ("urgent", "Urgent")], default="medium", max_length=10)),
                ("attachment", models.FileField(blank=True, null=True, upload_to="news/")),
                ("attachment_name", models.CharField(blank=True, max_length=255)),
                ("external_link", models.URLField(blank=True, default="")),
                ("target_branch", models.CharField(blank=True, default="", max_length=100)),
                ("target_semester", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("is_pinned", models.BooleanField(default=False)),
                ("view_count", models.PositiveIntegerField(default=0)),
                ("publish_at", models.DateTimeField(blank=True, null=True)),
                ("expires_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_news", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "news_announcements", "ordering": ["-is_pinned", "-created_at"]},
        ),
        migrations.AddIndex(
            model_name="newsannouncement",
            index=models.Index(fields=["category", "is_active"], name="news_category_active_idx"),
        ),
        migrations.AddIndex(
            model_name="newsannouncement",
            index=models.Index(fields=["is_pinned", "-created_at"], name="news_pinned_created_idx"),
        ),
    ]
