import uuid
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="Company",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("name", models.CharField(max_length=200)),
                ("website", models.URLField(blank=True, default="")),
                ("logo_url", models.URLField(blank=True, default="")),
                ("industry", models.CharField(blank=True, default="", max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"db_table": "placement_companies", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="PlacementApplication",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("role", models.CharField(max_length=200)),
                ("status", models.CharField(choices=[("applied","Applied"),("shortlisted","Shortlisted"),("interview","Interview"),("offer","Offer Received"),("accepted","Offer Accepted"),("rejected","Rejected"),("withdrawn","Withdrawn")], default="applied", max_length=15)),
                ("package_lpa", models.DecimalField(blank=True, decimal_places=2, max_digits=6, null=True)),
                ("applied_date", models.DateField(blank=True, null=True)),
                ("deadline", models.DateField(blank=True, null=True)),
                ("notes", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("company", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="applications", to="placement.company")),
                ("student", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="applications", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "placement_applications", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="InterviewRound",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ("round_number", models.PositiveSmallIntegerField(default=1)),
                ("round_type", models.CharField(choices=[("online_test","Online Test"),("coding","Coding Round"),("technical","Technical Interview"),("hr","HR Interview"),("group_discussion","Group Discussion"),("other","Other")], max_length=20)),
                ("round_date", models.DateField(blank=True, null=True)),
                ("result", models.CharField(choices=[("pending","Pending"),("cleared","Cleared"),("failed","Failed")], default="pending", max_length=10)),
                ("feedback", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("application", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="rounds", to="placement.placementapplication")),
            ],
            options={"db_table": "interview_rounds", "ordering": ["round_number"]},
        ),
    ]
