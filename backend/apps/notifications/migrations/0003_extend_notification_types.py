"""
Migration: extend notification_type choices to include academic, placement,
event, reminder, alert — used by the admin notification panel.

This is a data migration only (choices are not enforced at DB level for
CharField), so no schema change is needed. The migration is a no-op at the
DB level but keeps Django's migration history consistent.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0002_scheduled_notifications"),
    ]

    operations = [
        # CharField choices are not stored in the DB schema — no AlterField needed.
        # This migration exists to document the choices expansion in history.
    ]
