"""
Management command: create_admin
Creates the default admin account if it doesn't exist.
Also repairs missing student_id on existing admin.
Run automatically on container startup.
"""
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

ADMIN_EMAIL      = os.environ.get("ADMIN_EMAIL", "admin@campushub.com")
ADMIN_PASSWORD   = os.environ.get("ADMIN_PASSWORD", "Admin@123")
ADMIN_NAME       = os.environ.get("ADMIN_NAME", "CampusHub Admin")
ADMIN_STUDENT_ID = os.environ.get("ADMIN_STUDENT_ID", "0000000")


class Command(BaseCommand):
    help = "Create default admin user if not exists, repair if broken"

    def add_arguments(self, parser):
        parser.add_argument("--noinput", action="store_true", help="Non-interactive")

    def handle(self, *args, **options):
        existing = User.objects.filter(email=ADMIN_EMAIL).first()

        if existing:
            # Repair: ensure all required fields are set so login works
            repaired = False
            if not existing.student_id:
                existing.student_id = ADMIN_STUDENT_ID
                repaired = True
            if not existing.is_active:
                existing.is_active = True
                repaired = True
            if not existing.is_staff:
                existing.is_staff = True
                repaired = True
            if not existing.is_superuser:
                existing.is_superuser = True
                repaired = True
            if existing.role != "admin":
                existing.role = "admin"
                repaired = True
            if not existing.email_verified:
                existing.email_verified = True
                repaired = True
            if repaired:
                existing.save(update_fields=[
                    "student_id", "is_active", "is_staff",
                    "is_superuser", "role", "email_verified",
                ])
                self.stdout.write(self.style.SUCCESS(
                    f"Admin repaired: student_id={ADMIN_STUDENT_ID}, "
                    f"is_staff=True, is_superuser=True, role=admin"
                ))
            else:
                self.stdout.write(self.style.WARNING(
                    f"Admin already exists: {ADMIN_EMAIL} (student_id={existing.student_id})"
                ))
            return

        User.objects.create_superuser(
            email=ADMIN_EMAIL,
            password=ADMIN_PASSWORD,
            full_name=ADMIN_NAME,
            role="admin",
            is_active=True,
            email_verified=True,
            student_id=ADMIN_STUDENT_ID,
        )
        self.stdout.write(self.style.SUCCESS(
            f"\n{'='*50}\n"
            f"  Admin account created!\n"
            f"  Student ID: {ADMIN_STUDENT_ID}\n"
            f"  Email     : {ADMIN_EMAIL}\n"
            f"  Password  : {ADMIN_PASSWORD}\n"
            f"{'='*50}\n"
            f"  CHANGE THIS PASSWORD IMMEDIATELY after first login!\n"
            f"  Use: POST /api/auth/change-password\n"
        ))
