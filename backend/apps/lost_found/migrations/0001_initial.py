import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.CreateModel(
            name="LostFoundItem",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("item_name", models.CharField(max_length=255)),
                ("category", models.CharField(choices=[("id_card", "ID Card"), ("wallet", "Wallet"), ("charger", "Charger"), ("book", "Book"), ("calculator", "Calculator"), ("keys", "Keys"), ("electronics", "Electronics"), ("clothing", "Clothing"), ("bag", "Bag"), ("other", "Other")], max_length=20)),
                ("description", models.TextField(blank=True, default="")),
                ("status", models.CharField(choices=[("lost", "Lost"), ("found", "Found"), ("claimed", "Claimed"), ("closed", "Closed")], default="lost", max_length=10)),
                ("date_lost_found", models.DateField()),
                ("location", models.CharField(max_length=255)),
                ("image", models.ImageField(blank=True, null=True, upload_to="lost_found/")),
                ("contact_name", models.CharField(blank=True, default="", max_length=255)),
                ("contact_phone", models.CharField(blank=True, default="", max_length=20)),
                ("contact_email", models.EmailField(blank=True, default="", max_length=254)),
                ("is_active", models.BooleanField(default=True)),
                ("is_flagged", models.BooleanField(default=False)),
                ("flag_reason", models.TextField(blank=True, default="")),
                ("resolved_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("posted_by", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="lost_found_posts", to=settings.AUTH_USER_MODEL)),
                ("flagged_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="flagged_items", to=settings.AUTH_USER_MODEL)),
                ("claimed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="claimed_items", to=settings.AUTH_USER_MODEL)),
            ],
            options={"db_table": "lost_found_items", "ordering": ["-created_at"]},
        ),
    ]
