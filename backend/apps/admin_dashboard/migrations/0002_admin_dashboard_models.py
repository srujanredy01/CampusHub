"""
Migration for Department, Section, and Announcement models.
"""
import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("admin_dashboard", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Department",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=100, unique=True)),
                ("code", models.CharField(max_length=20, unique=True)),
                ("description", models.TextField(blank=True, default="")),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("head", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="headed_departments", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_departments", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "departments",
                "ordering": ["name"],
            },
        ),
        migrations.CreateModel(
            name="Section",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=50)),
                ("semester", models.PositiveSmallIntegerField()),
                ("max_students", models.PositiveIntegerField(default=60)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("department", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sections", to="admin_dashboard.department")),
                ("faculty_advisor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="advised_sections", to=settings.AUTH_USER_MODEL)),
                ("moderator", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="moderated_sections", to=settings.AUTH_USER_MODEL)),
                ("created_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="created_sections", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "sections",
                "ordering": ["department__code", "semester", "name"],
                "unique_together": {("department", "name", "semester")},
            },
        ),
        migrations.CreateModel(
            name="Announcement",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=255)),
                ("content", models.TextField()),
                ("target", models.CharField(choices=[("all", "All Users"), ("students", "All Students"), ("faculty", "All Faculty"), ("department", "Specific Department"), ("section", "Specific Section")], default="all", max_length=20)),
                ("priority", models.CharField(choices=[("low", "Low"), ("normal", "Normal"), ("high", "High"), ("urgent", "Urgent")], default="normal", max_length=10)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("target_department", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="admin_dashboard.department")),
                ("target_section", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="admin_dashboard.section")),
                ("created_by", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="admin_announcements", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "admin_announcements",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="department",
            index=models.Index(fields=["code"], name="dept_code_idx"),
        ),
        migrations.AddIndex(
            model_name="department",
            index=models.Index(fields=["is_active"], name="dept_active_idx"),
        ),
        migrations.AddIndex(
            model_name="section",
            index=models.Index(fields=["department", "semester"], name="sec_dept_sem_idx"),
        ),
        migrations.AddIndex(
            model_name="section",
            index=models.Index(fields=["is_active"], name="sec_active_idx"),
        ),
        migrations.AddIndex(
            model_name="announcement",
            index=models.Index(fields=["target", "is_active"], name="ann_target_idx"),
        ),
        migrations.AddIndex(
            model_name="announcement",
            index=models.Index(fields=["-created_at"], name="ann_created_idx"),
        ),
    ]
