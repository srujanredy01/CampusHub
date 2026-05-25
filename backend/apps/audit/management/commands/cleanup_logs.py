"""
Management command: cleanup_logs
Deletes old activity logs to prevent unbounded table growth.

Usage:
    python manage.py cleanup_logs                    # default: keep 90 days
    python manage.py cleanup_logs --days 30          # keep 30 days
    python manage.py cleanup_logs --dry-run          # preview only
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = "Delete activity logs older than N days (default: 90)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--days", type=int, default=90,
            help="Retain logs for this many days (default: 90)",
        )
        parser.add_argument(
            "--dry-run", action="store_true",
            help="Show what would be deleted without deleting",
        )

    def handle(self, *args, **options):
        days    = options["days"]
        dry_run = options["dry_run"]
        cutoff  = timezone.now() - timedelta(days=days)

        from apps.audit.models import UserActivityLog, AuditLog, ExecutionLog

        counts = {
            "UserActivityLog": UserActivityLog.objects.filter(created_at__lt=cutoff).count(),
            "AuditLog":        AuditLog.objects.filter(created_at__lt=cutoff).count(),
            "ExecutionLog":    ExecutionLog.objects.filter(created_at__lt=cutoff).count(),
        }

        self.stdout.write(f"Cutoff: {cutoff.strftime('%Y-%m-%d %H:%M UTC')} (keeping last {days} days)")
        for model, count in counts.items():
            self.stdout.write(f"  {model}: {count} records to delete")

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run — nothing deleted."))
            return

        total = 0
        for Model, count in [
            (UserActivityLog, counts["UserActivityLog"]),
            (AuditLog,        counts["AuditLog"]),
            (ExecutionLog,    counts["ExecutionLog"]),
        ]:
            if count > 0:
                deleted, _ = Model.objects.filter(created_at__lt=cutoff).delete()
                total += deleted

        self.stdout.write(self.style.SUCCESS(f"Deleted {total} log records older than {days} days."))
