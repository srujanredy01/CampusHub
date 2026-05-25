"""
Migration: Add AdminAlert model, priority field to Notification,
and enhanced fields to ScheduledNotification.
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("notifications", "0001_initial"),
    ]

    operations = [
        # Add priority field to Notification
        migrations.AddField(
            model_name="notification",
            name="priority",
            field=models.CharField(
                choices=[("low", "Low"), ("normal", "Normal"), ("high", "High"), ("critical", "Critical")],
                default="normal",
                max_length=10,
            ),
        ),
        # Add new notification types
        migrations.AlterField(
            model_name="notification",
            name="notification_type",
            field=models.CharField(
                choices=[
                    ("new_resource", "New Resource"),
                    ("campus_news", "Campus News"),
                    ("coding_reminder", "Coding Reminder"),
                    ("system", "System"),
                    ("academic", "Academic"),
                    ("placement", "Placement"),
                    ("event", "Event"),
                    ("reminder", "Reminder"),
                    ("alert", "Alert"),
                    ("attendance", "Attendance"),
                    ("study_group", "Study Group"),
                    ("coding_contest", "Coding Contest"),
                    ("maintenance", "Maintenance"),
                ],
                max_length=20,
            ),
        ),
        # Add indexes for priority and notification_type
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["notification_type"], name="notifications_type_idx"),
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["priority"], name="notifications_priority_idx"),
        ),
        # Create AdminAlert model
        migrations.CreateModel(
            name="AdminAlert",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("alert_type", models.CharField(
                    choices=[
                        ("new_signup", "New Signup"),
                        ("user_login", "User Login"),
                        ("failed_login", "Failed Login"),
                        ("password_reset", "Password Reset"),
                        ("multiple_failed_logins", "Multiple Failed Logins"),
                        ("code_submission", "Code Submission"),
                        ("note_upload", "Note Upload"),
                        ("attendance_update", "Attendance Update"),
                        ("cgpa_save", "CGPA Save"),
                        ("resource_upload", "Resource Upload"),
                        ("placement_update", "Placement Update"),
                        ("group_created", "Group Created"),
                        ("suspicious_activity", "Suspicious Activity"),
                        ("permission_violation", "Permission Violation"),
                        ("excessive_requests", "Excessive Requests"),
                        ("profile_change", "Profile Change"),
                        ("system_event", "System Event"),
                    ],
                    max_length=30,
                )),
                ("category", models.CharField(
                    choices=[("info", "Info"), ("warning", "Warning"), ("critical", "Critical"), ("security", "Security")],
                    default="info",
                    max_length=10,
                )),
                ("title", models.CharField(max_length=255)),
                ("message", models.TextField()),
                ("is_read", models.BooleanField(default=False)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(
                    blank=True,
                    help_text="The user who triggered this alert",
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="triggered_alerts",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "db_table": "admin_alerts",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="adminalert",
            index=models.Index(fields=["is_read", "-created_at"], name="admin_alerts_unread_idx"),
        ),
        migrations.AddIndex(
            model_name="adminalert",
            index=models.Index(fields=["alert_type"], name="admin_alerts_type_idx"),
        ),
        migrations.AddIndex(
            model_name="adminalert",
            index=models.Index(fields=["category"], name="admin_alerts_category_idx"),
        ),
        migrations.AddIndex(
            model_name="adminalert",
            index=models.Index(fields=["-created_at"], name="admin_alerts_created_idx"),
        ),
        # Update ScheduledNotification
        migrations.AddField(
            model_name="schedulednotification",
            name="priority",
            field=models.CharField(
                choices=[("low", "Low"), ("normal", "Normal"), ("high", "High"), ("critical", "Critical")],
                default="normal",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="schedulednotification",
            name="target_type",
            field=models.CharField(
                choices=[
                    ("all", "All Users"),
                    ("branch", "By Branch"),
                    ("semester", "By Semester"),
                    ("role", "By Role"),
                    ("selected", "Selected Users"),
                ],
                default="all",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="schedulednotification",
            name="sent_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="schedulednotification",
            name="read_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="schedulednotification",
            name="target_users",
            field=models.ManyToManyField(
                blank=True,
                related_name="targeted_notifications",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
