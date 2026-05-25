import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("attendance", "0002_attendance_indexes"),
    ]

    operations = [
        migrations.CreateModel(
            name="AttendanceHistory",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("subject_name", models.CharField(max_length=100)),
                ("subject_code", models.CharField(blank=True, default="", max_length=20)),
                ("semester", models.PositiveSmallIntegerField()),
                ("action", models.CharField(
                    choices=[
                        ("created", "Created"),
                        ("updated", "Updated"),
                        ("marked_present", "Marked Present"),
                        ("marked_absent", "Marked Absent"),
                        ("deleted", "Deleted"),
                    ],
                    max_length=20,
                )),
                ("old_total", models.PositiveIntegerField(default=0)),
                ("old_attended", models.PositiveIntegerField(default=0)),
                ("new_total", models.PositiveIntegerField(default=0)),
                ("new_attended", models.PositiveIntegerField(default=0)),
                ("old_percentage", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("new_percentage", models.DecimalField(decimal_places=2, default=0, max_digits=5)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("student", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="attendance_history",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("subject", models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="history",
                    to="attendance.subjectattendance",
                )),
            ],
            options={
                "db_table": "attendance_history",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="attendancehistory",
            index=models.Index(fields=["student", "-created_at"], name="att_hist_student_date_idx"),
        ),
        migrations.AddIndex(
            model_name="attendancehistory",
            index=models.Index(fields=["subject", "-created_at"], name="att_hist_subject_date_idx"),
        ),
    ]
