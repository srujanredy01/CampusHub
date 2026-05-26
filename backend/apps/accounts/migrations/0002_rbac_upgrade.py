"""
Migration: Upgrade User model with RBAC roles and security fields.
"""
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        # Expand role field to support new roles
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("super_admin", "Super Admin"),
                    ("admin", "Admin"),
                    ("faculty", "Faculty"),
                    ("student", "Student"),
                    ("moderator", "Moderator"),
                ],
                default="student",
                max_length=15,
            ),
        ),
        # Add phone field
        migrations.AddField(
            model_name="user",
            name="phone",
            field=models.CharField(blank=True, default="", max_length=15),
        ),
        # Add batch field
        migrations.AddField(
            model_name="user",
            name="batch",
            field=models.CharField(blank=True, default="", max_length=20),
        ),
        # Add security fields
        migrations.AddField(
            model_name="user",
            name="is_locked",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="user",
            name="failed_login_attempts",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="user",
            name="locked_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="user",
            name="phone_verified",
            field=models.BooleanField(default=False),
        ),
        # Add index for role + is_active
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["is_active", "role"], name="users_active_role_idx"),
        ),
    ]
