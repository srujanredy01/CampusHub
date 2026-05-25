"""
Migration v2: Add slug, short_description, featured_image, tags, read_count
to NewsAnnouncement; add SavedNews model.
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("news", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # Add new fields to NewsAnnouncement
        migrations.AddField(
            model_name="newsannouncement",
            name="slug",
            field=models.SlugField(blank=True, default="", max_length=280),
        ),
        migrations.AddField(
            model_name="newsannouncement",
            name="short_description",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
        migrations.AddField(
            model_name="newsannouncement",
            name="featured_image",
            field=models.ImageField(blank=True, null=True, upload_to="news/images/"),
        ),
        migrations.AddField(
            model_name="newsannouncement",
            name="tags",
            field=models.CharField(blank=True, default="", max_length=500),
        ),
        migrations.AddField(
            model_name="newsannouncement",
            name="read_count",
            field=models.PositiveIntegerField(default=0),
        ),

        # Update category choices (add academics, campus_update)
        migrations.AlterField(
            model_name="newsannouncement",
            name="category",
            field=models.CharField(
                choices=[
                    ("placement",     "Placements"),
                    ("internship",    "Internships"),
                    ("event",         "Events"),
                    ("academics",     "Academics"),
                    ("campus_update", "Campus Updates"),
                    ("general",       "General"),
                ],
                default="general",
                max_length=20,
            ),
        ),

        # Update attachment upload path
        migrations.AlterField(
            model_name="newsannouncement",
            name="attachment",
            field=models.FileField(blank=True, null=True, upload_to="news/attachments/"),
        ),

        # Add new index
        migrations.AddIndex(
            model_name="newsannouncement",
            index=models.Index(fields=["is_active", "-created_at"], name="news_active_created_idx"),
        ),

        # Create SavedNews model
        migrations.CreateModel(
            name="SavedNews",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("save_type", models.CharField(
                    choices=[("saved", "Saved"), ("saved_for_later", "Saved for Later")],
                    default="saved",
                    max_length=20,
                )),
                ("saved_at", models.DateTimeField(auto_now_add=True)),
                ("article", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="saved_by",
                    to="news.newsannouncement",
                )),
                ("student", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="saved_news",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "saved_news", "ordering": ["-saved_at"]},
        ),
        migrations.AlterUniqueTogether(
            name="savednews",
            unique_together={("student", "article")},
        ),
    ]
