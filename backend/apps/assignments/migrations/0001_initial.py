import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="Assignment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField()),
                ("subject", models.CharField(choices=[("mathematics", "Mathematics"), ("physics", "Physics"), ("chemistry", "Chemistry"), ("computer_science", "Computer Science"), ("electronics", "Electronics"), ("mechanical", "Mechanical"), ("civil", "Civil"), ("english", "English"), ("other", "Other")], default="other", max_length=30)),
                ("branch", models.CharField(blank=True, default="", max_length=100)),
                ("semester", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("section", models.CharField(blank=True, default="", max_length=10)),
                ("attachment", models.FileField(blank=True, null=True, upload_to="assignments/")),
                ("attachment_name", models.CharField(blank=True, default="", max_length=255)),
                ("max_marks", models.PositiveIntegerField(default=100)),
                ("grading_rubric", models.TextField(blank=True, default="")),
                ("deadline", models.DateTimeField()),
                ("late_submission_allowed", models.BooleanField(default=False)),
                ("late_deadline", models.DateTimeField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="created_assignments", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "assignments", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="AssignmentSubmission",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("submitted", "Submitted"), ("late", "Late Submission"), ("graded", "Graded"), ("returned", "Returned for Revision")], default="pending", max_length=15)),
                ("content", models.TextField(blank=True, default="")),
                ("file", models.FileField(blank=True, null=True, upload_to="assignment_submissions/")),
                ("file_name", models.CharField(blank=True, default="", max_length=255)),
                ("marks", models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True)),
                ("feedback", models.TextField(blank=True, default="")),
                ("graded_at", models.DateTimeField(blank=True, null=True)),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("assignment", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="submissions", to="assignments.assignment")),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="assignment_submissions", to=settings.AUTH_USER_MODEL)),
                ("graded_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="graded_submissions", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "assignment_submissions", "ordering": ["-submitted_at"], "unique_together": {("assignment", "student")}},
        ),
        migrations.CreateModel(
            name="AssignmentComment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("content", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("submission", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="comments", to="assignments.assignmentsubmission")),
                ("author", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "assignment_comments", "ordering": ["created_at"]},
        ),
    ]
