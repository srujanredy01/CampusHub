import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserSettings",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("theme", models.CharField(choices=[("light", "Light"), ("dark", "Dark"), ("system", "System")], default="system", max_length=10)),
                ("coding_alerts", models.BooleanField(default=True)),
                ("contest_reminders", models.BooleanField(default=True)),
                ("assignment_reminders", models.BooleanField(default=True)),
                ("placement_updates", models.BooleanField(default=True)),
                ("news_updates", models.BooleanField(default=True)),
                ("email_notifications", models.BooleanField(default=True)),
                ("push_notifications", models.BooleanField(default=True)),
                ("profile_visibility", models.BooleanField(default=True, help_text="Profile visible to others")),
                ("show_coding_profile", models.BooleanField(default=True)),
                ("show_achievements", models.BooleanField(default=True)),
                ("leaderboard_visibility", models.BooleanField(default=True)),
                ("language", models.CharField(choices=[("en", "English"), ("hi", "Hindi"), ("te", "Telugu"), ("ta", "Tamil"), ("kn", "Kannada")], default="en", max_length=5)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="settings", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "user_settings",
                "verbose_name": "User Settings",
                "verbose_name_plural": "User Settings",
            },
        ),
        migrations.CreateModel(
            name="UserSession",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("device", models.CharField(blank=True, default="", max_length=255)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("location", models.CharField(blank=True, default="", max_length=255)),
                ("user_agent", models.TextField(blank=True, default="")),
                ("is_active", models.BooleanField(default=True)),
                ("last_active", models.DateTimeField(auto_now=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sessions_log", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "user_sessions",
                "ordering": ["-last_active"],
            },
        ),
    ]
