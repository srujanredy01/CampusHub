"""
Initial migration for contests app.
No models — this app uses models from apps.coding.
"""
from django.db import migrations


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        ("coding", "0001_initial"),
    ]
    operations = []
