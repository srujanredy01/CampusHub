import django.contrib.auth.models
import django.utils.timezone
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                ("password", models.CharField(max_length=128, verbose_name="password")),
                ("last_login", models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("is_superuser", models.BooleanField(default=False)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("full_name", models.CharField(max_length=255)),
                ("student_id", models.CharField(blank=True, max_length=50, null=True, unique=True)),
                ("email", models.EmailField(max_length=254, unique=True)),
                ("branch", models.CharField(blank=True, default="", max_length=100)),
                ("semester", models.PositiveSmallIntegerField(default=1)),
                ("section", models.CharField(blank=True, default="", max_length=10)),
                ("role", models.CharField(choices=[("student", "Student"), ("admin", "Admin")], default="student", max_length=10)),
                ("is_active", models.BooleanField(default=False)),
                ("is_staff", models.BooleanField(default=False)),
                ("email_verified", models.BooleanField(default=False)),
                ("email_verification_token", models.CharField(blank=True, max_length=255, null=True)),
                ("email_verification_sent_at", models.DateTimeField(blank=True, null=True)),
                ("password_reset_token", models.CharField(blank=True, max_length=255, null=True)),
                ("password_reset_sent_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("groups", models.ManyToManyField(blank=True, related_name="user_set", related_query_name="user", to="auth.group", verbose_name="groups")),
                ("user_permissions", models.ManyToManyField(blank=True, related_name="user_set", related_query_name="user", to="auth.permission", verbose_name="user permissions")),
            ],
            options={"db_table": "users"},
            managers=[("objects", django.contrib.auth.models.UserManager())],
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["email"], name="users_email_idx"),
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["student_id"], name="users_student_id_idx"),
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["role"], name="users_role_idx"),
        ),
    ]
