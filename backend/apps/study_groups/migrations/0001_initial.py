import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="StudyGroup",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("name", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True, default="")),
                ("subject", models.CharField(blank=True, default="", max_length=100)),
                ("branch", models.CharField(blank=True, default="", max_length=100)),
                ("semester", models.PositiveSmallIntegerField(blank=True, null=True)),
                ("visibility", models.CharField(choices=[("public","Public"),("private","Private")], default="public", max_length=10)),
                ("invite_code", models.CharField(blank=True, max_length=12, unique=True)),
                ("max_members", models.PositiveSmallIntegerField(default=50)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="created_groups", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "study_groups", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="GroupMembership",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("role", models.CharField(choices=[("admin","Admin"),("moderator","Moderator"),("member","Member")], default="member", max_length=10)),
                ("is_active", models.BooleanField(default=True)),
                ("joined_at", models.DateTimeField(auto_now_add=True)),
                ("group", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="memberships", to="study_groups.studygroup")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="group_memberships", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "group_memberships", "unique_together": {("group","user")}},
        ),
        migrations.CreateModel(
            name="GroupPost",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("post_type", models.CharField(choices=[("discussion","Discussion"),("announcement","Announcement"),("resource","Resource Share")], default="discussion", max_length=15)),
                ("content", models.TextField()),
                ("attachment", models.FileField(blank=True, null=True, upload_to="group_files/")),
                ("is_pinned", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("author", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
                ("group", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="posts", to="study_groups.studygroup")),
            ],
            options={"db_table": "group_posts", "ordering": ["-is_pinned","-created_at"]},
        ),
    ]
