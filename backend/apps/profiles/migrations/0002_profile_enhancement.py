"""
Migration: Enhance StudentProfile with coding profiles, academic, and privacy fields.
"""
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("profiles", "0001_initial"),
    ]

    operations = [
        # Coding profiles
        migrations.AddField(
            model_name="studentprofile",
            name="leetcode_url",
            field=models.URLField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="codechef_url",
            field=models.URLField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="hackerrank_url",
            field=models.URLField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="portfolio_url",
            field=models.URLField(blank=True, default=""),
        ),
        # Academic
        migrations.AddField(
            model_name="studentprofile",
            name="cgpa",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=4, null=True),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="advisor",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        # Rankings
        migrations.AddField(
            model_name="studentprofile",
            name="coding_rank",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="contest_rank",
            field=models.PositiveIntegerField(default=0),
        ),
        # Achievements
        migrations.AddField(
            model_name="studentprofile",
            name="certificates",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="achievements",
            field=models.JSONField(blank=True, default=list),
        ),
        # Notification preferences
        migrations.AddField(
            model_name="studentprofile",
            name="email_notifications",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="push_notifications",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="assignment_reminders",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="contest_reminders",
            field=models.BooleanField(default=True),
        ),
        # Privacy
        migrations.AddField(
            model_name="studentprofile",
            name="profile_public",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="show_coding_stats",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="studentprofile",
            name="show_placement_status",
            field=models.BooleanField(default=False),
        ),
        # Indexes
        migrations.AddIndex(
            model_name="studentprofile",
            index=models.Index(fields=["coding_rank"], name="profiles_coding_rank_idx"),
        ),
    ]
