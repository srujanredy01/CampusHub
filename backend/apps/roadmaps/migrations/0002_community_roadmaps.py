"""
Migration: Add community features to roadmaps.
- New fields on Roadmap: status, moderation, community counts, etc.
- New models: RoadmapLike, RoadmapComment, RoadmapRating, RoadmapBookmark, RoadmapReport
"""
import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("roadmaps", "0001_initial"),
    ]

    operations = [
        # ── Add new fields to Roadmap ─────────────────────────────────────────
        migrations.AddField(model_name="roadmap", name="status",
            field=models.CharField(choices=[("draft","Draft"),("submitted","Submitted for Review"),("under_review","Under Review"),("approved","Approved"),("rejected","Rejected"),("needs_changes","Needs Changes"),("archived","Archived")], default="approved", max_length=15)),
        migrations.AddField(model_name="roadmap", name="skills_covered",
            field=models.TextField(blank=True, default="")),
        migrations.AddField(model_name="roadmap", name="target_role",
            field=models.CharField(blank=True, default="", max_length=255)),
        migrations.AddField(model_name="roadmap", name="tags",
            field=models.JSONField(blank=True, default=list)),
        migrations.AddField(model_name="roadmap", name="like_count",
            field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="roadmap", name="comment_count",
            field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="roadmap", name="average_rating",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=3)),
        migrations.AddField(model_name="roadmap", name="rating_count",
            field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="roadmap", name="view_count",
            field=models.PositiveIntegerField(default=0)),
        migrations.AddField(model_name="roadmap", name="is_featured",
            field=models.BooleanField(default=False)),
        migrations.AddField(model_name="roadmap", name="is_faculty_verified",
            field=models.BooleanField(default=False)),
        migrations.AddField(model_name="roadmap", name="reviewed_by",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reviewed_roadmaps", to=settings.AUTH_USER_MODEL)),
        migrations.AddField(model_name="roadmap", name="reviewed_at",
            field=models.DateTimeField(blank=True, null=True)),
        migrations.AddField(model_name="roadmap", name="review_notes",
            field=models.TextField(blank=True, default="")),
        migrations.AddField(model_name="roadmap", name="rejection_reason",
            field=models.TextField(blank=True, default="")),
        migrations.AddField(model_name="roadmap", name="submitted_at",
            field=models.DateTimeField(blank=True, null=True)),

        # ── Add notes field to RoadmapStep ────────────────────────────────────
        migrations.AddField(model_name="roadmapstep", name="notes",
            field=models.TextField(blank=True, default="")),

        # ── Expand category choices ───────────────────────────────────────────
        migrations.AlterField(model_name="roadmap", name="category",
            field=models.CharField(choices=[("web_development","Web Development"),("ai_ml","AI / Machine Learning"),("devops","DevOps"),("cybersecurity","Cybersecurity"),("dsa_placements","DSA + Placements"),("mobile_dev","Mobile Development"),("data_science","Data Science"),("cloud_computing","Cloud Computing"),("system_design","System Design"),("frontend","Frontend Development"),("backend","Backend Development"),("full_stack","Full Stack"),("blockchain","Blockchain"),("game_dev","Game Development"),("academic","Academic Subject"),("placement_prep","Placement Preparation"),("other","Other")], max_length=30)),

        # ── Add step_type choices ─────────────────────────────────────────────
        migrations.AlterField(model_name="roadmapstep", name="step_type",
            field=models.CharField(choices=[("learn","Learn"),("practice","Practice"),("project","Project"),("quiz","Quiz"),("resource","Resource"),("video","Video"),("article","Article")], default="learn", max_length=10)),

        # ── RoadmapLike ───────────────────────────────────────────────────────
        migrations.CreateModel(
            name="RoadmapLike",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("roadmap", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="likes", to="roadmaps.roadmap")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="roadmap_likes", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "roadmap_likes", "unique_together": {("roadmap", "user")}},
        ),

        # ── RoadmapComment ────────────────────────────────────────────────────
        migrations.CreateModel(
            name="RoadmapComment",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("content", models.TextField()),
                ("is_deleted", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("roadmap", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="comments", to="roadmaps.roadmap")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="roadmap_comments", to=settings.AUTH_USER_MODEL)),
                ("parent", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name="replies", to="roadmaps.roadmapcomment")),
            ],
            options={"db_table": "roadmap_comments", "ordering": ["-created_at"]},
        ),

        # ── RoadmapRating ─────────────────────────────────────────────────────
        migrations.CreateModel(
            name="RoadmapRating",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("rating", models.PositiveSmallIntegerField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("roadmap", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="ratings", to="roadmaps.roadmap")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="roadmap_ratings", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "roadmap_ratings", "unique_together": {("roadmap", "user")}},
        ),

        # ── RoadmapBookmark ───────────────────────────────────────────────────
        migrations.CreateModel(
            name="RoadmapBookmark",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("roadmap", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="bookmarks", to="roadmaps.roadmap")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="roadmap_bookmarks", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "roadmap_bookmarks", "unique_together": {("roadmap", "user")}},
        ),

        # ── RoadmapReport ─────────────────────────────────────────────────────
        migrations.CreateModel(
            name="RoadmapReport",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("reason", models.CharField(choices=[("spam","Spam"),("plagiarism","Plagiarism"),("inappropriate","Inappropriate Content"),("misleading","Misleading Information"),("low_quality","Low Quality"),("other","Other")], max_length=20)),
                ("description", models.TextField(blank=True, default="")),
                ("status", models.CharField(choices=[("pending","Pending"),("reviewed","Reviewed"),("resolved","Resolved"),("dismissed","Dismissed")], default="pending", max_length=10)),
                ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("roadmap", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reports", to="roadmaps.roadmap")),
                ("reporter", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="roadmap_reports", to=settings.AUTH_USER_MODEL)),
                ("reviewed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="reviewed_roadmap_reports", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "roadmap_reports", "ordering": ["-created_at"], "unique_together": {("roadmap", "reporter")}},
        ),

        # ── Indexes ───────────────────────────────────────────────────────────
        migrations.AddIndex(model_name="roadmap",
            index=models.Index(fields=["status", "-created_at"], name="rm_status_created_idx")),
        migrations.AddIndex(model_name="roadmap",
            index=models.Index(fields=["created_by", "status"], name="rm_creator_status_idx")),
        migrations.AddIndex(model_name="roadmap",
            index=models.Index(fields=["-like_count"], name="rm_likes_idx")),
        migrations.AddIndex(model_name="roadmapcomment",
            index=models.Index(fields=["roadmap", "-created_at"], name="rm_comment_roadmap_idx")),
    ]
