import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="Badge",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=50, unique=True)),
                ("slug", models.SlugField(max_length=60, unique=True)),
                ("description", models.TextField()),
                ("icon", models.CharField(default="🏆", max_length=10)),
                ("color", models.CharField(default="#F59E0B", max_length=7)),
                ("xp_reward", models.PositiveIntegerField(default=50)),
                ("criteria", models.JSONField(default=dict)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "badges", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="StudentXP",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("total_xp", models.PositiveIntegerField(default=0)),
                ("level", models.PositiveIntegerField(default=1)),
                ("rank", models.PositiveIntegerField(default=0)),
                ("streak_days", models.PositiveIntegerField(default=0)),
                ("longest_streak", models.PositiveIntegerField(default=0)),
                ("last_activity_date", models.DateField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("student", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="xp_profile", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "student_xp", "ordering": ["-total_xp"]},
        ),
        migrations.CreateModel(
            name="XPTransaction",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("source", models.CharField(choices=[("coding_solve", "Solved Coding Question"), ("contest_rank", "Contest Ranking"), ("resource_read", "Read Resource"), ("assignment_complete", "Assignment Completed"), ("roadmap_step", "Roadmap Step Completed"), ("roadmap_complete", "Roadmap Completed"), ("profile_complete", "Profile Completed"), ("streak_bonus", "Streak Bonus"), ("badge_earned", "Badge Earned"), ("note_upload", "Note Uploaded"), ("attendance_bonus", "Attendance Bonus")], max_length=30)),
                ("points", models.IntegerField()),
                ("description", models.CharField(max_length=255)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="xp_transactions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "xp_transactions", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="StudentBadge",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("earned_at", models.DateTimeField(auto_now_add=True)),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="earned_badges", to=settings.AUTH_USER_MODEL)),
                ("badge", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="earners", to="leaderboard.badge")),
            ],
            options={"db_table": "student_badges", "ordering": ["-earned_at"], "unique_together": {("student", "badge")}},
        ),
    ]
