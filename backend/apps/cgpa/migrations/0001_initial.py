import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="CGPARecord",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("current_cgpa", models.DecimalField(decimal_places=2, default=0, max_digits=4)),
                ("total_credits_earned", models.PositiveIntegerField(default=0)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="cgpa_record", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "cgpa_records"},
        ),
        migrations.CreateModel(
            name="SemesterGPA",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("semester", models.PositiveSmallIntegerField()),
                ("semester_name", models.CharField(blank=True, default="", max_length=50)),
                ("sgpa", models.DecimalField(decimal_places=2, default=0, max_digits=4)),
                ("total_credits", models.PositiveIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("record", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="semesters", to="cgpa.cgparecord")),
            ],
            options={"db_table": "semester_gpas", "ordering": ["semester"], "unique_together": {("record","semester")}},
        ),
        migrations.CreateModel(
            name="SubjectGrade",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("subject_name", models.CharField(max_length=100)),
                ("subject_code", models.CharField(blank=True, default="", max_length=20)),
                ("credits", models.PositiveSmallIntegerField(default=3)),
                ("grade", models.CharField(default="O", max_length=2)),
                ("grade_points", models.DecimalField(decimal_places=2, default=10, max_digits=4)),
                ("semester_gpa", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="subjects", to="cgpa.semestergpa")),
            ],
            options={"db_table": "subject_grades", "ordering": ["subject_name"]},
        ),
    ]
