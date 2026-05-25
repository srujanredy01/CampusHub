import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("audit", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserActivityLog",
            fields=[
                ("id",          models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("username",    models.CharField(blank=True, max_length=255)),
                ("student_id",  models.CharField(blank=True, max_length=50)),
                ("role",        models.CharField(blank=True, max_length=20)),
                ("action",      models.CharField(
                    choices=[
                        ("login","Login"),("login_failed","Login Failed"),("logout","Logout"),
                        ("signup","Signup"),("password_change","Password Changed"),
                        ("password_reset_request","Password Reset Requested"),
                        ("password_reset_done","Password Reset Completed"),
                        ("page_visit","Page Visit"),("profile_view","Profile Viewed"),
                        ("profile_update","Profile Updated"),("resource_view","Resource Viewed"),
                        ("resource_download","Resource Downloaded"),("resource_preview","Resource Previewed"),
                        ("news_view","News Viewed"),("news_save","News Saved"),("news_unsave","News Unsaved"),
                        ("question_view","Question Viewed"),("question_save","Question Saved"),
                        ("code_run","Code Run"),("code_submit","Code Submitted"),
                        ("notification_view","Notifications Viewed"),
                        ("notification_mark_read","Notifications Marked Read"),
                        ("admin_action","Admin Action"),("api_request","API Request"),
                    ],
                    db_index=True, max_length=50,
                )),
                ("endpoint",    models.CharField(blank=True, max_length=500)),
                ("method",      models.CharField(blank=True, max_length=10)),
                ("status",      models.CharField(
                    choices=[("success","Success"),("failed","Failed"),("error","Error")],
                    default="success", max_length=10,
                )),
                ("status_code", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("ip_address",  models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent",  models.CharField(blank=True, max_length=1000)),
                ("device",      models.CharField(blank=True, max_length=100)),
                ("browser",     models.CharField(blank=True, max_length=100)),
                ("os",          models.CharField(blank=True, max_length=100)),
                ("metadata",    models.JSONField(blank=True, default=dict)),
                ("created_at",  models.DateTimeField(auto_now_add=True, db_index=True)),
                ("user",        models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="activity_logs_detailed",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "user_activity_logs", "ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="useractivitylog",
            index=models.Index(fields=["user", "-created_at"], name="ual_user_created_idx"),
        ),
        migrations.AddIndex(
            model_name="useractivitylog",
            index=models.Index(fields=["action", "-created_at"], name="ual_action_created_idx"),
        ),
        migrations.AddIndex(
            model_name="useractivitylog",
            index=models.Index(fields=["ip_address"], name="ual_ip_idx"),
        ),
        migrations.AddIndex(
            model_name="useractivitylog",
            index=models.Index(fields=["status"], name="ual_status_idx"),
        ),
    ]
