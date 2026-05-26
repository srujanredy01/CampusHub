"""
Management command to create the initial super admin account.
Used during first deployment via entrypoint.prod.sh.
"""
import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Create the initial super admin account from environment variables."

    def add_arguments(self, parser):
        parser.add_argument("--noinput", action="store_true", help="Non-interactive mode")

    def handle(self, *args, **options):
        email = os.environ.get("ADMIN_EMAIL", "admin@campushub.com")
        password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
        full_name = os.environ.get("ADMIN_NAME", "CampusHub Admin")
        student_id = os.environ.get("ADMIN_STUDENT_ID", "0000000")

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f"Admin account already exists: {email}"))
            # Ensure existing admin has super_admin role
            user = User.objects.get(email=email)
            if user.role != "super_admin":
                user.role = "super_admin"
                user.is_staff = True
                user.is_superuser = True
                user.save(update_fields=["role", "is_staff", "is_superuser"])
                self.stdout.write(self.style.SUCCESS(f"Upgraded {email} to super_admin role."))
            return

        user = User.objects.create_user(
            email=email,
            password=password,
            full_name=full_name,
            student_id=student_id,
            role="super_admin",
            is_staff=True,
            is_superuser=True,
            is_active=True,
            email_verified=True,
        )
        self.stdout.write(self.style.SUCCESS(f"Super admin created: {email}"))
