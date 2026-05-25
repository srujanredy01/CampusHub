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
            name="Resource",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("resource_type", models.CharField(choices=[("notes", "Notes"), ("pdf", "PDF"), ("ppt", "Presentation"), ("assignment", "Assignment"), ("lecture", "Recorded Lecture"), ("other", "Other")], max_length=20)),
                ("branch", models.CharField(max_length=100)),
                ("semester", models.PositiveSmallIntegerField()),
                ("subject", models.CharField(max_length=100)),
                ("file", models.FileField(blank=True, null=True, upload_to="resources/")),
                ("file_name", models.CharField(blank=True, max_length=255)),
                ("file_size", models.PositiveBigIntegerField(default=0)),
                ("file_type", models.CharField(blank=True, max_length=50)),
                ("external_url", models.URLField(blank=True, default="")),
                ("view_count", models.PositiveIntegerField(default=0)),
                ("download_count", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("uploaded_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="uploaded_resources", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "resources", "ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="resource",
            index=models.Index(fields=["branch", "semester", "subject"], name="resources_branch_sem_subj_idx"),
        ),
        migrations.AddIndex(
            model_name="resource",
            index=models.Index(fields=["resource_type"], name="resources_type_idx"),
        ),
    ]
