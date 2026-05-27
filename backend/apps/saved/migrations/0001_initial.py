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
            name="SavedItem",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("content_type", models.CharField(
                    choices=[
                        ("coding_problem", "Coding Problem"),
                        ("news_article", "News Article"),
                        ("resource", "Resource"),
                    ],
                    max_length=20,
                )),
                ("object_id", models.UUIDField()),
                ("saved_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="saved_items",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                "db_table": "saved_items",
                "ordering": ["-saved_at"],
                "unique_together": {("user", "content_type", "object_id")},
            },
        ),
        migrations.AddIndex(
            model_name="saveditem",
            index=models.Index(fields=["user", "content_type"], name="saved_user_type_idx"),
        ),
        migrations.AddIndex(
            model_name="saveditem",
            index=models.Index(fields=["user", "-saved_at"], name="saved_user_date_idx"),
        ),
        migrations.AddIndex(
            model_name="saveditem",
            index=models.Index(fields=["content_type", "object_id"], name="saved_type_obj_idx"),
        ),
    ]
