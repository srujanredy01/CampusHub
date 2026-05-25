import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="SubjectAttendance",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("subject_name", models.CharField(max_length=100)),
                ("subject_code", models.CharField(blank=True, default="", max_length=20)),
                ("semester", models.PositiveSmallIntegerField()),
                ("total_classes", models.PositiveIntegerField(default=0)),
                ("attended_classes", models.PositiveIntegerField(default=0)),
                ("required_percentage", models.DecimalField(decimal_places=2, default=75.0, max_digits=5)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="attendance_records", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "subject_attendance", "ordering": ["subject_name"], "unique_together": {("student","subject_name","semester")}},
        ),
    ]
