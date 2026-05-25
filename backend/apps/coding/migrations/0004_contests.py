import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("coding", "0003_coding_phase2"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Contest",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("starts_at", models.DateTimeField()),
                ("ends_at", models.DateTimeField()),
                ("status", models.CharField(choices=[("draft", "Draft"), ("published", "Published"), ("archived", "Archived")], default="draft", max_length=20)),
                ("is_public", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_contests", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "coding_contests",
                "ordering": ["-starts_at"],
            },
        ),
        migrations.AddIndex(
            model_name="contest",
            index=models.Index(fields=["status", "starts_at"], name="coding_contests_status_start_idx"),
        ),
        migrations.AddIndex(
            model_name="contest",
            index=models.Index(fields=["starts_at", "ends_at"], name="coding_contests_window_idx"),
        ),
        migrations.CreateModel(
            name="ContestProblem",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("points", models.PositiveIntegerField(default=100)),
                ("order", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("contest", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="contest_problems", to="coding.contest")),
                ("question", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="contest_entries", to="coding.codingquestion")),
            ],
            options={
                "db_table": "coding_contest_problems",
                "ordering": ["order", "created_at"],
                "unique_together": {("contest", "question")},
            },
        ),
        migrations.AddIndex(
            model_name="contestproblem",
            index=models.Index(fields=["contest", "order"], name="coding_contest_problem_order_idx"),
        ),
        migrations.CreateModel(
            name="ContestRegistration",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("registered_at", models.DateTimeField(auto_now_add=True)),
                ("contest", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="registrations", to="coding.contest")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="contest_registrations", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "coding_contest_registrations",
                "unique_together": {("contest", "user")},
            },
        ),
        migrations.AddIndex(
            model_name="contestregistration",
            index=models.Index(fields=["contest", "user"], name="coding_contest_registration_idx"),
        ),
        migrations.CreateModel(
            name="ContestSubmission",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("score", models.PositiveIntegerField(default=0)),
                ("penalty_seconds", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("contest", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="contest_submissions", to="coding.contest")),
                ("contest_problem", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="contest_submissions", to="coding.contestproblem")),
                ("submission", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="contest_submission", to="coding.submission")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="contest_submissions", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "coding_contest_submissions",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="contestsubmission",
            index=models.Index(fields=["contest", "user"], name="coding_contest_submission_user_idx"),
        ),
        migrations.AddIndex(
            model_name="contestsubmission",
            index=models.Index(fields=["contest_problem", "user"], name="coding_contest_problem_user_idx"),
        ),
        migrations.AddIndex(
            model_name="contestsubmission",
            index=models.Index(fields=["score", "penalty_seconds"], name="coding_contest_score_idx"),
        ),
    ]
