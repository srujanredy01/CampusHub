"""
Gamification engine — XP awarding and badge checking.
"""
import logging
from django.utils import timezone
from .models import StudentXP, XPTransaction, Badge, StudentBadge

logger = logging.getLogger(__name__)


def award_xp(user, source, points, description="", metadata=None):
    """Award XP to a student. Safe — never raises."""
    try:
        xp_profile, _ = StudentXP.objects.get_or_create(student=user)
        XPTransaction.objects.create(
            student=user,
            source=source,
            points=points,
            description=description,
            metadata=metadata or {},
        )
        xp_profile.total_xp += points
        xp_profile.calculate_level()

        # Update streak
        today = timezone.now().date()
        if xp_profile.last_activity_date != today:
            if xp_profile.last_activity_date and (today - xp_profile.last_activity_date).days == 1:
                xp_profile.streak_days += 1
                xp_profile.longest_streak = max(xp_profile.longest_streak, xp_profile.streak_days)
            elif xp_profile.last_activity_date and (today - xp_profile.last_activity_date).days > 1:
                xp_profile.streak_days = 1
            else:
                xp_profile.streak_days = 1
            xp_profile.last_activity_date = today

        xp_profile.save()
        check_badges(user, xp_profile)
    except Exception as e:
        logger.warning("award_xp failed: %s", e)


def check_badges(user, xp_profile):
    """Check and award badges based on criteria."""
    try:
        badges = Badge.objects.filter(is_active=True)
        for badge in badges:
            if StudentBadge.objects.filter(student=user, badge=badge).exists():
                continue
            if _meets_criteria(user, xp_profile, badge):
                StudentBadge.objects.create(student=user, badge=badge)
                # Award bonus XP for badge
                XPTransaction.objects.create(
                    student=user,
                    source="badge_earned",
                    points=badge.xp_reward,
                    description=f"Earned badge: {badge.name}",
                )
                xp_profile.total_xp += badge.xp_reward
                xp_profile.save(update_fields=["total_xp"])
    except Exception as e:
        logger.warning("check_badges failed: %s", e)


def _meets_criteria(user, xp_profile, badge):
    """Evaluate badge criteria against user stats."""
    criteria = badge.criteria
    if not criteria:
        return False

    slug = badge.slug

    if slug == "problem-solver":
        from apps.coding.models import Submission
        solved = Submission.objects.filter(user=user, status="accepted").values("question").distinct().count()
        return solved >= criteria.get("min_solved", 10)

    elif slug == "top-coder":
        return xp_profile.total_xp >= criteria.get("min_xp", 2000)

    elif slug == "consistent-performer":
        return xp_profile.streak_days >= criteria.get("min_streak", 7)

    elif slug == "fast-learner":
        from apps.roadmaps.models import StudentRoadmapProgress
        completed = StudentRoadmapProgress.objects.filter(student=user, status="completed").count()
        return completed >= criteria.get("min_roadmaps", 1)

    elif slug == "contest-champion":
        from apps.coding.models import ContestSubmission
        wins = ContestSubmission.objects.filter(user=user, score__gte=criteria.get("min_score", 80)).count()
        return wins >= criteria.get("min_contests", 3)

    elif slug == "resource-explorer":
        from apps.profiles.models import ActivityLog
        reads = ActivityLog.objects.filter(user=user, activity_type="resource_view").count()
        return reads >= criteria.get("min_reads", 20)

    return False


def recalculate_ranks():
    """Recalculate global ranks based on total XP."""
    profiles = StudentXP.objects.order_by("-total_xp")
    for rank, profile in enumerate(profiles, start=1):
        if profile.rank != rank:
            profile.rank = rank
            profile.save(update_fields=["rank"])
