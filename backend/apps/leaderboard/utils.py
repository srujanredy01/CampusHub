"""
Leaderboard & Gamification utility functions.
"""
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


def award_xp(user, source, points, description=""):
    """
    Award XP to a user and update their total.
    Safe to call from anywhere — never raises.
    """
    try:
        from .models import StudentXP, XPTransaction

        xp_profile, created = StudentXP.objects.get_or_create(student=user)

        # Create transaction
        XPTransaction.objects.create(
            student=user,
            source=source,
            points=points,
            description=description,
        )

        # Update total
        xp_profile.total_xp += points
        xp_profile.calculate_level()

        # Update streak
        today = timezone.now().date()
        if xp_profile.last_activity_date != today:
            if xp_profile.last_activity_date and (today - xp_profile.last_activity_date).days == 1:
                xp_profile.streak_days += 1
                if xp_profile.streak_days > xp_profile.longest_streak:
                    xp_profile.longest_streak = xp_profile.streak_days
            elif xp_profile.last_activity_date and (today - xp_profile.last_activity_date).days > 1:
                xp_profile.streak_days = 1
            else:
                xp_profile.streak_days = 1
            xp_profile.last_activity_date = today

        xp_profile.save()

        # Check for badge eligibility
        _check_badges(user, xp_profile)

        logger.debug("Awarded %d XP to %s for %s", points, user.email, source)
    except Exception as exc:
        logger.warning("Failed to award XP to %s: %s", user.id, exc)


def _check_badges(user, xp_profile):
    """Check if user qualifies for any new badges."""
    try:
        from .models import Badge, StudentBadge

        earned_badge_ids = set(
            StudentBadge.objects.filter(student=user).values_list("badge_id", flat=True)
        )

        badges = Badge.objects.filter(is_active=True).exclude(id__in=earned_badge_ids)

        for badge in badges:
            criteria = badge.criteria
            if not criteria:
                continue

            earned = False

            # Check criteria
            if criteria.get("min_xp") and xp_profile.total_xp >= criteria["min_xp"]:
                earned = True
            elif criteria.get("min_questions_solved"):
                try:
                    from apps.profiles.models import StudentProfile
                    profile = StudentProfile.objects.get(user=user)
                    if profile.total_questions_solved >= criteria["min_questions_solved"]:
                        earned = True
                except Exception:
                    pass
            elif criteria.get("min_streak") and xp_profile.streak_days >= criteria["min_streak"]:
                earned = True
            elif criteria.get("min_contests"):
                try:
                    from apps.coding.models import ContestRegistration
                    count = ContestRegistration.objects.filter(user=user).count()
                    if count >= criteria["min_contests"]:
                        earned = True
                except Exception:
                    pass

            if earned:
                StudentBadge.objects.create(student=user, badge=badge)
                # Award bonus XP for badge
                if badge.xp_reward > 0:
                    from .models import XPTransaction
                    XPTransaction.objects.create(
                        student=user,
                        source="badge_earned",
                        points=badge.xp_reward,
                        description=f"Earned badge: {badge.name}",
                    )
                    xp_profile.total_xp += badge.xp_reward
                    xp_profile.save(update_fields=["total_xp"])

    except Exception as exc:
        logger.warning("Badge check failed for %s: %s", user.id, exc)


def recalculate_ranks():
    """Recalculate all student XP ranks."""
    try:
        from .models import StudentXP
        profiles = StudentXP.objects.order_by("-total_xp")
        for rank, profile in enumerate(profiles, 1):
            if profile.rank != rank:
                profile.rank = rank
                profile.save(update_fields=["rank"])
    except Exception as exc:
        logger.error("Failed to recalculate ranks: %s", exc)
