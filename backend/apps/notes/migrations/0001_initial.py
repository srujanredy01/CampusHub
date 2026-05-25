import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="Note",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("title", models.CharField(max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("subject", models.CharField(max_length=100)),
                ("branch", models.CharField(max_length=100)),
                ("semester", models.PositiveSmallIntegerField()),
                ("tags", models.CharField(blank=True, default="", max_length=500)),
                ("file", models.FileField(upload_to="notes/")),
                ("file_name", models.CharField(blank=True, max_length=255)),
                ("file_size", models.PositiveBigIntegerField(default=0)),
                ("file_type", models.CharField(choices=[("pdf","PDF"),("docx","Word Document"),("ppt","Presentation"),("image","Image"),("other","Other")], default="pdf", max_length=10)),
                ("status", models.CharField(choices=[("pending","Pending Review"),("approved","Approved"),("rejected","Rejected")], default="pending", max_length=10)),
                ("rejection_reason", models.TextField(blank=True, default="")),
                ("download_count", models.PositiveIntegerField(default=0)),
                ("view_count", models.PositiveIntegerField(default=0)),
                ("upvotes", models.PositiveIntegerField(default=0)),
                ("downvotes", models.PositiveIntegerField(default=0)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("uploaded_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="uploaded_notes", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "notes", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="NoteVote",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("vote", models.CharField(choices=[("up","Upvote"),("down","Downvote")], max_length=4)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("note", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="votes", to="notes.note")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "note_votes", "unique_together": {("note","user")}},
        ),
        migrations.CreateModel(
            name="NoteBookmark",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("note", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="bookmarks", to="notes.note")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "note_bookmarks", "unique_together": {("note","user")}},
        ),
        migrations.AddIndex(model_name="note", index=models.Index(fields=["branch","semester"], name="note_branch_sem_idx")),
        migrations.AddIndex(model_name="note", index=models.Index(fields=["subject"], name="note_subject_idx")),
        migrations.AddIndex(model_name="note", index=models.Index(fields=["status","is_active"], name="note_status_idx")),
    ]
