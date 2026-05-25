from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("cgpa", "0001_initial"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="semestergpa",
            index=models.Index(fields=["record", "semester"], name="semester_gpa_record_sem_idx"),
        ),
        migrations.AddIndex(
            model_name="semestergpa",
            index=models.Index(fields=["-updated_at"], name="semester_gpa_updated_idx"),
        ),
        migrations.AddIndex(
            model_name="subjectgrade",
            index=models.Index(fields=["semester_gpa"], name="subject_grade_sem_idx"),
        ),
        migrations.AddIndex(
            model_name="subjectgrade",
            index=models.Index(fields=["grade"], name="subject_grade_grade_idx"),
        ),
    ]
