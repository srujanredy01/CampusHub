"""
Signals for the profiles app.
Auto-creates a StudentProfile when a new User is created.
"""
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import StudentProfile


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_student_profile(sender, instance, created, **kwargs):
    """Create a StudentProfile for every new user."""
    if created:
        StudentProfile.objects.get_or_create(user=instance)
