"""
Migration v2: Add CodingCategory, CodingSolution models;
add slug, hints, topic_tags, supported_languages, view_count,
categories M2M to CodingQuestion.
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("coding", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [

        # ── CodingCategory ────────────────────────────────────────────────
        migrations.CreateModel(
            name="CodingCategory",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=100, unique=True)),
                ("slug", models.SlugField(blank=True, max_length=120, unique=True)),
                ("category_type", models.CharField(
                    choices=[("language", "Language"), ("concept", "Concept")],
                    max_length=10,
                )),
                ("icon", models.CharField(blank=True, default="", max_length=10)),
                ("description", models.TextField(blank=True, default="")),
                ("question_count", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "coding_categories", "ordering": ["category_type", "name"]},
        ),
        migrations.AddIndex(
            model_name="codingcategory",
            index=models.Index(fields=["category_type"], name="cat_type_idx"),
        ),
        migrations.AddIndex(
            model_name="codingcategory",
            index=models.Index(fields=["is_active"], name="cat_active_idx"),
        ),

        # ── New fields on CodingQuestion ──────────────────────────────────
        migrations.AddField(
            model_name="codingquestion",
            name="slug",
            field=models.SlugField(blank=True, default="", max_length=300),
        ),
        migrations.AddField(
            model_name="codingquestion",
            name="hints",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="codingquestion",
            name="topic_tags",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="codingquestion",
            name="supported_languages",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="codingquestion",
            name="view_count",
            field=models.PositiveIntegerField(default=0),
        ),

        # ── M2M: CodingQuestion ↔ CodingCategory ─────────────────────────
        migrations.AddField(
            model_name="codingquestion",
            name="categories",
            field=models.ManyToManyField(
                blank=True,
                related_name="questions",
                to="coding.codingcategory",
            ),
        ),

        # ── CodingSolution ────────────────────────────────────────────────
        migrations.CreateModel(
            name="CodingSolution",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("language", models.CharField(max_length=20)),
                ("solution_code", models.TextField()),
                ("explanation", models.TextField(blank=True, default="")),
                ("time_complexity", models.CharField(blank=True, default="", max_length=50)),
                ("space_complexity", models.CharField(blank=True, default="", max_length=50)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("question", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="solutions",
                    to="coding.codingquestion",
                )),
                ("created_by", models.ForeignKey(
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "coding_solutions"},
        ),
        migrations.AlterUniqueTogether(
            name="codingsolution",
            unique_together={("question", "language")},
        ),
    ]
