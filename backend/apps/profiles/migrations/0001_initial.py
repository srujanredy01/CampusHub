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
            name="StudentProfile",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("profile_image", models.ImageField(blank=True, null=True, upload_to="profiles/")),
                ("bio", models.TextField(blank=True, default="")),
                ("github_url", models.URLField(blank=True, default="")),
                ("linkedin_url", models.URLField(blank=True, default="")),
                ("total_questions_solved", models.PositiveIntegerField(default=0)),
                ("easy_solved", models.PositiveIntegerField(default=0)),
                ("medium_solved", models.PositiveIntegerField(default=0)),
                ("hard_solved", models.PositiveIntegerField(default=0)),
                ("total_submissions", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "student_profiles"},
        ),
        migrations.CreateModel(
            name="ActivityLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("activity_type", models.CharField(choices=[("login", "Login"), ("resource_view", "Resource Viewed"), ("question_solved", "Question Solved"), ("question_saved", "Question Saved"), ("news_view", "News Viewed"), ("profile_update", "Profile Updated")], max_length=50)),
                ("description", models.CharField(max_length=255)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="activity_logs", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "activity_logs", "ordering": ["-created_at"]},
        ),
    ]
