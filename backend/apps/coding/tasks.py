"""
Coding service functions for CampusHub.
"""

import logging

logger = logging.getLogger(__name__)


def update_coding_stats(user_id):
    """Update a student's coding stats after a successful submission."""
    try:
        from apps.profiles.models import StudentProfile
        profile = StudentProfile.objects.get(user_id=user_id)
        profile.update_coding_stats()
        logger.info("Updated coding stats for user %s", user_id)
    except Exception as exc:
        logger.error("Failed to update coding stats for user %s: %s", user_id, exc)
