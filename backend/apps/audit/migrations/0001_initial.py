import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AuditLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("action", models.CharField(choices=[("admin_login", "Admin Login"), ("admin_logout", "Admin Logout"), ("student_view", "Student Viewed"), ("student_deactivate", "Student Deactivated"), ("student_activate", "Student Activated"), ("student_delete", "Student Deleted"), ("student_password_reset", "Student Password Reset"), ("student_export", "Student List Exported"), ("resource_upload", "Resource Uploaded"), ("resource_edit", "Resource Edited"), ("resource_delete", "Resource Deleted"), ("news_create", "News Created"), ("news_edit", "News Edited"), ("news_delete", "News Deleted"), ("news_pin", "News Pinned"), ("question_create", "Question Created"), ("question_edit", "Question Edited"), ("question_delete", "Question Deleted"), ("notification_send", "Notification Sent"), ("settings_change", "Settings Changed")], max_length=50)),
                ("target_model", models.CharField(blank=True, max_length=100)),
                ("target_id", models.CharField(blank=True, max_length=255)),
                ("description", models.TextField()),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("user_agent", models.CharField(blank=True, max_length=500)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("admin", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="audit_logs", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "audit_logs", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="ExecutionLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("language", models.CharField(max_length=20)),
                ("status", models.CharField(choices=[("success", "Success"), ("timeout", "Timeout"), ("memory_exceeded", "Memory Exceeded"), ("runtime_error", "Runtime Error"), ("compilation_error", "Compilation Error"), ("suspicious", "Suspicious")], max_length=30)),
                ("execution_time", models.FloatField(blank=True, null=True)),
                ("memory_used", models.PositiveIntegerField(blank=True, null=True)),
                ("is_submission", models.BooleanField(default=False)),
                ("question_id", models.CharField(blank=True, max_length=255)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="execution_logs", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "execution_logs", "ordering": ["-created_at"]},
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["admin", "-created_at"], name="audit_admin_created_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["action"], name="audit_action_idx"),
        ),
        migrations.AddIndex(
            model_name="auditlog",
            index=models.Index(fields=["-created_at"], name="audit_created_idx"),
        ),
        migrations.AddIndex(
            model_name="executionlog",
            index=models.Index(fields=["-created_at"], name="execlog_created_idx"),
        ),
        migrations.AddIndex(
            model_name="executionlog",
            index=models.Index(fields=["status"], name="execlog_status_idx"),
        ),
        migrations.AddIndex(
            model_name="executionlog",
            index=models.Index(fields=["user"], name="execlog_user_idx"),
        ),
    ]
