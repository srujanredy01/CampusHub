import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Roadmap",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=255)),
                ("slug", models.SlugField(max_length=280, unique=True)),
                ("category", models.CharField(choices=[("web_development", "Web Development"), ("ai_ml", "AI / Machine Learning"), ("devops", "DevOps"), ("cybersecurity", "Cybersecurity"), ("dsa_placements", "DSA + Placements"), ("mobile_dev", "Mobile Development"), ("data_science", "Data Science"), ("cloud_computing", "Cloud Computing")], max_length=30)),
                ("description", models.TextField()),
                ("icon", models.CharField(blank=True, default="🗺️", max_length=10)),
                ("color", models.CharField(default="#3B82F6", max_length=7)),
                ("estimated_weeks", models.PositiveIntegerField(default=12)),
                ("difficulty", models.CharField(choices=[("beginner", "Beginner"), ("intermediate", "Intermediate"), ("advanced", "Advanced")], default="beginner", max_length=15)),
                ("prerequisites", models.TextField(blank=True, default="")),
                ("total_steps", models.PositiveIntegerField(default=0)),
                ("enrolled_count", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_roadmaps", to=settings.AUTH_USER_MODEL)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "roadmaps", "ordering": ["title"]},
        ),
        migrations.CreateModel(
            name="RoadmapMilestone",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("order", models.PositiveIntegerField(default=0)),
                ("estimated_days", models.PositiveIntegerField(default=7)),
                ("roadmap", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="milestones", to="roadmaps.roadmap")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "roadmap_milestones", "ordering": ["order"]},
        ),
        migrations.CreateModel(
            name="RoadmapStep",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("step_type", models.CharField(choices=[("learn", "Learn"), ("practice", "Practice"), ("project", "Project"), ("quiz", "Quiz"), ("resource", "Resource")], default="learn", max_length=10)),
                ("order", models.PositiveIntegerField(default=0)),
                ("resource_url", models.URLField(blank=True, default="")),
                ("resource_title", models.CharField(blank=True, default="", max_length=255)),
                ("estimated_minutes", models.PositiveIntegerField(default=30)),
                ("is_optional", models.BooleanField(default=False)),
                ("milestone", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="steps", to="roadmaps.roadmapmilestone")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "roadmap_steps", "ordering": ["order"]},
        ),
        migrations.CreateModel(
            name="StudentRoadmapProgress",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status", models.CharField(choices=[("enrolled", "Enrolled"), ("in_progress", "In Progress"), ("completed", "Completed"), ("paused", "Paused")], default="enrolled", max_length=15)),
                ("completed_steps", models.PositiveIntegerField(default=0)),
                ("total_steps", models.PositiveIntegerField(default=0)),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("last_activity_at", models.DateTimeField(auto_now=True)),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="roadmap_progress", to=settings.AUTH_USER_MODEL)),
                ("roadmap", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="student_progress", to="roadmaps.roadmap")),
            ],
            options={"db_table": "student_roadmap_progress", "unique_together": {("student", "roadmap")}},
        ),
        migrations.CreateModel(
            name="StepCompletion",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("completed_at", models.DateTimeField(auto_now_add=True)),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="step_completions", to=settings.AUTH_USER_MODEL)),
                ("step", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="completions", to="roadmaps.roadmapstep")),
            ],
            options={"db_table": "step_completions", "unique_together": {("student", "step")}},
        ),
    ]
