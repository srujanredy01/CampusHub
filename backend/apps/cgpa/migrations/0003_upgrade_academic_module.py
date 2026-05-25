"""
Migration to upgrade CGPA module to full academic performance tracking system.
Renames existing tables and adds new fields/models.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("cgpa", "0002_cgpa_indexes"),
    ]

    operations = [
        # ── Rename tables to new names ────────────────────────────────────────
        migrations.RenameModel(
            old_name="CGPARecord",
            new_name="AcademicProfile",
        ),
        migrations.RenameModel(
            old_name="SemesterGPA",
            new_name="SemesterRecord",
        ),
        migrations.RenameModel(
            old_name="SubjectGrade",
            new_name="SubjectRecord",
        ),

        # ── Add new fields to AcademicProfile ─────────────────────────────────
        migrations.AddField(
            model_name="academicprofile",
            name="total_semesters",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="academicprofile",
            name="highest_sgpa",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=4),
        ),
        migrations.AddField(
            model_name="academicprofile",
            name="lowest_sgpa",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=4),
        ),
        migrations.AddField(
            model_name="academicprofile",
            name="total_backlogs",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="academicprofile",
            name="academic_standing",
            field=models.CharField(
                choices=[
                    ("excellent", "Excellent"),
                    ("good", "Good"),
                    ("average", "Average"),
                    ("at_risk", "At Risk"),
                    ("critical", "Critical"),
                ],
                default="good",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="academicprofile",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, default="2024-01-01T00:00:00Z"),
            preserve_default=False,
        ),

        # ── Add new fields to SemesterRecord ──────────────────────────────────
        migrations.AddField(
            model_name="semesterrecord",
            name="academic_year",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        migrations.AddField(
            model_name="semesterrecord",
            name="total_subjects",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="semesterrecord",
            name="failed_subjects",
            field=models.PositiveSmallIntegerField(default=0),
        ),

        # ── Add new fields to SubjectRecord ───────────────────────────────────
        migrations.AddField(
            model_name="subjectrecord",
            name="internal_marks",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name="subjectrecord",
            name="external_marks",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name="subjectrecord",
            name="total_marks",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name="subjectrecord",
            name="is_backlog",
            field=models.BooleanField(default=False),
        ),

        # ── Rename ForeignKey fields ──────────────────────────────────────────
        migrations.RenameField(
            model_name="semesterrecord",
            old_name="record",
            new_name="profile",
        ),
        migrations.RenameField(
            model_name="subjectrecord",
            old_name="semester_gpa",
            new_name="semester_record",
        ),

        # ── Create CGPAHistory model ──────────────────────────────────────────
        migrations.CreateModel(
            name="CGPAHistory",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("cgpa_at_time", models.DecimalField(decimal_places=2, max_digits=4)),
                ("total_credits_at_time", models.PositiveIntegerField()),
                ("total_semesters_at_time", models.PositiveSmallIntegerField()),
                ("action", models.CharField(
                    choices=[
                        ("semester_added", "Semester Added"),
                        ("semester_updated", "Semester Updated"),
                        ("semester_deleted", "Semester Deleted"),
                        ("bulk_save", "Bulk Save"),
                    ],
                    default="semester_added",
                    max_length=30,
                )),
                ("details", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="cgpa_history",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "db_table": "cgpa_history",
                "ordering": ["-created_at"],
            },
        ),

        # ── Add indexes ───────────────────────────────────────────────────────
        migrations.AddIndex(
            model_name="academicprofile",
            index=models.Index(fields=["current_cgpa"], name="cgpa_profile_cgpa_idx"),
        ),
        migrations.AddIndex(
            model_name="academicprofile",
            index=models.Index(fields=["academic_standing"], name="cgpa_profile_standing_idx"),
        ),
        migrations.AddIndex(
            model_name="cgpahistory",
            index=models.Index(fields=["user", "-created_at"], name="cgpa_history_user_idx"),
        ),
        migrations.AddIndex(
            model_name="cgpahistory",
            index=models.Index(fields=["action"], name="cgpa_history_action_idx"),
        ),
        migrations.AddIndex(
            model_name="subjectrecord",
            index=models.Index(fields=["subject_code"], name="cgpa_subject_code_idx"),
        ),

        # ── Alter table names ─────────────────────────────────────────────────
        migrations.AlterModelTable(
            name="academicprofile",
            table="academic_profiles",
        ),
        migrations.AlterModelTable(
            name="semesterrecord",
            table="semester_records",
        ),
        migrations.AlterModelTable(
            name="subjectrecord",
            table="subject_records",
        ),

        # ── Update related_name on user FK ────────────────────────────────────
        migrations.AlterField(
            model_name="academicprofile",
            name="user",
            field=models.OneToOneField(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="academic_profile",
                to=settings.AUTH_USER_MODEL,
            ),
        ),

        # ── Update unique_together for renamed fields ─────────────────────────
        migrations.AlterUniqueTogether(
            name="semesterrecord",
            unique_together={("profile", "semester")},
        ),
    ]
