import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="ResumeTemplate",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=100)),
                ("slug", models.SlugField(max_length=120, unique=True)),
                ("description", models.TextField(blank=True, default="")),
                ("preview_image", models.ImageField(blank=True, null=True, upload_to="resume_templates/")),
                ("template_html", models.TextField()),
                ("is_active", models.BooleanField(default=True)),
                ("is_default", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "resume_templates", "ordering": ["-is_default", "name"]},
        ),
        migrations.CreateModel(
            name="ResumeProfile",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(default="My Resume", max_length=100)),
                ("full_name", models.CharField(max_length=255)),
                ("email", models.EmailField(max_length=254)),
                ("phone", models.CharField(blank=True, default="", max_length=20)),
                ("branch", models.CharField(blank=True, default="", max_length=100)),
                ("graduation_year", models.PositiveIntegerField(blank=True, null=True)),
                ("summary", models.TextField(blank=True, default="")),
                ("address", models.CharField(blank=True, default="", max_length=500)),
                ("linkedin_url", models.URLField(blank=True, default="")),
                ("github_url", models.URLField(blank=True, default="")),
                ("portfolio_url", models.URLField(blank=True, default="")),
                ("skills", models.JSONField(blank=True, default=list)),
                ("certifications", models.JSONField(blank=True, default=list)),
                ("projects", models.JSONField(blank=True, default=list)),
                ("internships", models.JSONField(blank=True, default=list)),
                ("education", models.JSONField(blank=True, default=list)),
                ("achievements", models.JSONField(blank=True, default=list)),
                ("coding_profiles", models.JSONField(blank=True, default=dict)),
                ("is_primary", models.BooleanField(default=False)),
                ("completion_score", models.PositiveIntegerField(default=0)),
                ("last_exported_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="resumes", to=settings.AUTH_USER_MODEL)),
                ("template", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="resume.resumetemplate")),
            ],
            options={"db_table": "resume_profiles", "ordering": ["-is_primary", "-updated_at"]},
        ),
    ]
