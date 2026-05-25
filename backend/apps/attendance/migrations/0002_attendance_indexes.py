from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("attendance", "0001_initial"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="subjectattendance",
            index=models.Index(fields=["student", "semester"], name="attendance_student_sem_idx"),
        ),
        migrations.AddIndex(
            model_name="subjectattendance",
            index=models.Index(fields=["student", "subject_name"], name="attendance_student_subject_idx"),
        ),
    ]
