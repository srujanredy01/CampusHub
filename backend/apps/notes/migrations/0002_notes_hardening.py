import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("notes", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="note",
            name="average_rating",
            field=models.DecimalField(decimal_places=2, default=0.0, max_digits=3),
        ),
        migrations.AddField(
            model_name="note",
            name="rating_count",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="note",
            name="moderated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="note",
            name="moderated_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="moderated_notes",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name="NoteRating",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("rating", models.PositiveSmallIntegerField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("note", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="ratings", to="notes.note")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "note_ratings",
                "unique_together": {("note", "user")},
            },
        ),
        migrations.AddIndex(
            model_name="note",
            index=models.Index(fields=["-created_at"], name="notes_note_created_634102_idx"),
        ),
        migrations.AddIndex(
            model_name="note",
            index=models.Index(fields=["-download_count"], name="notes_note_downloa_309fe1_idx"),
        ),
        migrations.AddIndex(
            model_name="note",
            index=models.Index(fields=["-upvotes", "-view_count"], name="notes_note_upvotes_88f8ce_idx"),
        ),
    ]
