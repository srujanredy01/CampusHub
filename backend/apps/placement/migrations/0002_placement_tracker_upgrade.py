from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("placement", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="company",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="company",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name="placementapplication",
            name="offer_received_at",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="placementapplication",
            name="rejection_reason",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="placementapplication",
            name="reminder_enabled",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="placementapplication",
            name="reminder_sent_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="company",
            index=models.Index(fields=["name"], name="placement_c_name_e677c8_idx"),
        ),
        migrations.AddIndex(
            model_name="company",
            index=models.Index(fields=["industry", "is_active"], name="placement_c_indust_747145_idx"),
        ),
        migrations.AddIndex(
            model_name="placementapplication",
            index=models.Index(fields=["student", "status"], name="placement_a_student_43a521_idx"),
        ),
        migrations.AddIndex(
            model_name="placementapplication",
            index=models.Index(fields=["student", "deadline"], name="placement_a_student_cfbec2_idx"),
        ),
        migrations.AddIndex(
            model_name="placementapplication",
            index=models.Index(fields=["company", "status"], name="placement_a_company_159ddf_idx"),
        ),
        migrations.AddIndex(
            model_name="placementapplication",
            index=models.Index(fields=["status", "deadline"], name="placement_a_status_cee9f7_idx"),
        ),
        migrations.AddIndex(
            model_name="interviewround",
            index=models.Index(fields=["application", "round_number"], name="interview_r_application_e40f0f_idx"),
        ),
        migrations.AddIndex(
            model_name="interviewround",
            index=models.Index(fields=["result"], name="interview_r_result_5134f5_idx"),
        ),
    ]
