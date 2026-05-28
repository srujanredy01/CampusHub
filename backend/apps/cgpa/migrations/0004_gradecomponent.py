"""
Migration to add GradeComponent model for detailed grade breakdowns.
"""
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("cgpa", "0003_upgrade_academic_module"),
    ]

    operations = [
        migrations.CreateModel(
            name="GradeComponent",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "component_type",
                    models.CharField(
                        choices=[
                            ("internal", "Internal Exam"),
                            ("external", "External Exam"),
                            ("assignment", "Assignment"),
                            ("lab", "Lab Work"),
                            ("project", "Project"),
                            ("mid_exam", "Mid Exam"),
                            ("quiz", "Quiz"),
                            ("attendance", "Attendance"),
                            ("presentation", "Presentation"),
                            ("viva", "Viva"),
                        ],
                        max_length=20,
                    ),
                ),
                (
                    "component_name",
                    models.CharField(blank=True, default="", max_length=100),
                ),
                (
                    "marks_obtained",
                    models.DecimalField(decimal_places=2, default=0, max_digits=5),
                ),
                (
                    "max_marks",
                    models.DecimalField(decimal_places=2, default=100, max_digits=5),
                ),
                (
                    "weightage",
                    models.DecimalField(decimal_places=2, default=0, max_digits=5),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "subject_record",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="components",
                        to="cgpa.subjectrecord",
                    ),
                ),
            ],
            options={
                "db_table": "grade_components",
                "ordering": ["component_type"],
            },
        ),
        migrations.AddIndex(
            model_name="gradecomponent",
            index=models.Index(
                fields=["subject_record", "component_type"],
                name="grade_compo_subject_8a1b2c_idx",
            ),
        ),
    ]
