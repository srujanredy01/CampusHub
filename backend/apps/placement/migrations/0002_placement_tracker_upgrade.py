"""
Migration: Upgrade placement module to self-tracker model.
Drops old Company-based model, creates new self-tracking model.
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("placement", "0001_initial"),
    ]

    operations = [
        # Drop old models
        migrations.DeleteModel(name="InterviewRound"),
        migrations.DeleteModel(name="PlacementApplication"),
        migrations.DeleteModel(name="Company"),

        # Create new PlacementApplication (self-tracking)
        migrations.CreateModel(
            name="PlacementApplication",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("company_name", models.CharField(max_length=255)),
                ("role", models.CharField(max_length=255)),
                ("package_lpa", models.DecimalField(blank=True, decimal_places=2, max_digits=8, null=True)),
                ("status", models.CharField(
                    choices=[
                        ("wishlist", "Wishlist"), ("applied", "Applied"),
                        ("oa_scheduled", "OA Scheduled"), ("oa_completed", "OA Completed"),
                        ("shortlisted", "Shortlisted"), ("interview_round_1", "Interview Round 1"),
                        ("interview_round_2", "Interview Round 2"), ("hr_round", "HR Round"),
                        ("selected", "Selected"), ("rejected", "Rejected"),
                        ("offer_received", "Offer Received"), ("joined", "Joined"),
                    ],
                    default="wishlist", max_length=20,
                )),
                ("application_date", models.DateField(blank=True, null=True)),
                ("deadline", models.DateField(blank=True, null=True)),
                ("job_link", models.URLField(blank=True, default="")),
                ("location", models.CharField(blank=True, default="", max_length=255)),
                ("job_type", models.CharField(
                    choices=[("full_time", "Full Time"), ("internship", "Internship"), ("contract", "Contract")],
                    default="full_time", max_length=20,
                )),
                ("notes", models.TextField(blank=True, default="")),
                ("offer_received_at", models.DateField(blank=True, null=True)),
                ("rejection_reason", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("student", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="placement_applications",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "db_table": "placement_applications",
                "ordering": ["-updated_at"],
            },
        ),
        migrations.AddIndex(
            model_name="placementapplication",
            index=models.Index(fields=["student", "status"], name="placement_a_student_status_idx"),
        ),
        migrations.AddIndex(
            model_name="placementapplication",
            index=models.Index(fields=["student", "-updated_at"], name="placement_a_student_updated_idx"),
        ),
        migrations.AddIndex(
            model_name="placementapplication",
            index=models.Index(fields=["status"], name="placement_a_status_idx"),
        ),

        # Create InterviewExperience
        migrations.CreateModel(
            name="InterviewExperience",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("round_type", models.CharField(
                    choices=[
                        ("online_test", "Online Test"), ("coding", "Coding Round"),
                        ("technical_1", "Technical Interview 1"), ("technical_2", "Technical Interview 2"),
                        ("hr", "HR Interview"), ("group_discussion", "Group Discussion"),
                        ("system_design", "System Design"), ("managerial", "Managerial Round"),
                        ("other", "Other"),
                    ],
                    max_length=20,
                )),
                ("round_number", models.PositiveSmallIntegerField(default=1)),
                ("interview_date", models.DateField(blank=True, null=True)),
                ("result", models.CharField(
                    choices=[("pending", "Pending"), ("cleared", "Cleared"), ("failed", "Failed")],
                    default="pending", max_length=10,
                )),
                ("questions_asked", models.TextField(blank=True, default="")),
                ("experience_notes", models.TextField(blank=True, default="")),
                ("difficulty", models.CharField(
                    blank=True, choices=[("easy", "Easy"), ("medium", "Medium"), ("hard", "Hard")],
                    default="", max_length=10,
                )),
                ("duration_minutes", models.PositiveIntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("application", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="interviews",
                    to="placement.placementapplication",
                )),
            ],
            options={
                "db_table": "interview_experiences",
                "ordering": ["round_number"],
            },
        ),

        # Create CompanyNote
        migrations.CreateModel(
            name="CompanyNote",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("company_name", models.CharField(max_length=255)),
                ("notes", models.TextField()),
                ("salary_info", models.TextField(blank=True, default="")),
                ("interview_tips", models.TextField(blank=True, default="")),
                ("saved_questions", models.JSONField(blank=True, default=list)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("student", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="company_notes",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "db_table": "company_notes",
                "ordering": ["-updated_at"],
                "unique_together": {("student", "company_name")},
            },
        ),
    ]
