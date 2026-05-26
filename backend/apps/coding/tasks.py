"""
Coding service tasks for CampusHub.
Handles code execution via the executor service and stats updates.
"""
import logging
import requests
from django.conf import settings
from celery import shared_task

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


@shared_task(bind=True, max_retries=2, default_retry_delay=5)
def execute_submission(self, submission_id, contest_submission_id=None):
    """
    Execute a code submission via the executor service.
    Judges against hidden test cases and updates submission status.
    """
    try:
        from .models import Submission, ContestSubmission, ContestProblem

        submission = Submission.objects.select_related("question").get(id=submission_id)
        question = submission.question

        # Build test cases from hidden_test_cases
        test_cases = []
        for tc in question.hidden_test_cases:
            test_cases.append({
                "input": tc.get("input", ""),
                "expected_output": tc.get("expected_output", ""),
                "is_hidden": tc.get("is_hidden", True),
            })

        # Also add sample test case
        if question.sample_input and question.sample_output:
            test_cases.insert(0, {
                "input": question.sample_input,
                "expected_output": question.sample_output,
                "is_hidden": False,
            })

        if not test_cases:
            # No test cases — just run the code
            payload = {
                "language": submission.language,
                "code": submission.code,
                "stdin": question.sample_input or "",
                "timeout_sec": settings.EXECUTOR_TIMEOUT,
                "memory_limit_mb": getattr(settings, "EXECUTOR_MEMORY_MB", 192),
            }
            response = requests.post(
                f"{settings.EXECUTOR_SERVICE_URL}/execute",
                json=payload,
                timeout=settings.EXECUTOR_TIMEOUT + 5,
            )
            result = response.json()
            submission.stdout = result.get("stdout", "")
            submission.stderr = result.get("stderr", "")
            submission.execution_time = result.get("execution_time", 0)
            submission.status = "accepted" if result.get("status") == "success" else _map_status(result.get("status", "RE"))
            submission.save(update_fields=["stdout", "stderr", "execution_time", "status"])
        else:
            # Judge with test cases
            payload = {
                "language": submission.language,
                "code": submission.code,
                "test_cases": test_cases,
                "timeout_sec": settings.EXECUTOR_TIMEOUT,
                "memory_limit_mb": getattr(settings, "EXECUTOR_MEMORY_MB", 192),
            }
            response = requests.post(
                f"{settings.EXECUTOR_SERVICE_URL}/judge",
                json=payload,
                timeout=(settings.EXECUTOR_TIMEOUT + 5) * len(test_cases),
            )
            result = response.json()

            test_results = result.get("test_results", [])
            passed = sum(1 for t in test_results if t.get("passed"))
            total = len(test_results)

            submission.test_results = test_results
            submission.passed_test_cases = passed
            submission.total_test_cases = total
            submission.stdout = result.get("stdout", "")
            submission.stderr = result.get("stderr", "")
            submission.execution_time = result.get("execution_time", 0)

            if passed == total and total > 0:
                submission.status = "accepted"
            elif any(t.get("status") == "CE" for t in test_results):
                submission.status = "compilation_error"
            elif any(t.get("status") == "TLE" for t in test_results):
                submission.status = "time_limit_exceeded"
            elif any(t.get("status") == "MLE" for t in test_results):
                submission.status = "memory_limit_exceeded"
            elif any(t.get("status") == "RE" for t in test_results):
                submission.status = "runtime_error"
            else:
                submission.status = "wrong_answer"

            submission.save(update_fields=[
                "test_results", "passed_test_cases", "total_test_cases",
                "stdout", "stderr", "execution_time", "status",
            ])

        # Update question stats
        question.total_submissions += 1
        if submission.status == "accepted":
            question.accepted_submissions += 1
        question.save(update_fields=["total_submissions", "accepted_submissions"])

        # Update contest submission score if applicable
        if contest_submission_id:
            try:
                cs = ContestSubmission.objects.get(id=contest_submission_id)
                if submission.status == "accepted":
                    cs.score = cs.contest_problem.points
                else:
                    cs.score = 0
                cs.save(update_fields=["score"])
            except ContestSubmission.DoesNotExist:
                pass

        # Update user coding stats
        if submission.status == "accepted":
            update_coding_stats(str(submission.user_id))

            # Award XP
            try:
                from apps.leaderboard.utils import award_xp
                award_xp(submission.user, "coding_solve", 10, f"Solved: {question.title}")
            except Exception:
                pass

        logger.info("Submission %s judged: %s", submission_id, submission.status)

    except requests.RequestException as exc:
        logger.error("Executor service error for submission %s: %s", submission_id, exc)
        try:
            from .models import Submission
            Submission.objects.filter(id=submission_id).update(
                status="runtime_error",
                stderr="Code execution service temporarily unavailable. Please try again.",
            )
        except Exception:
            pass
        raise self.retry(exc=exc)
    except Exception as exc:
        logger.exception("Failed to execute submission %s: %s", submission_id, exc)
        try:
            from .models import Submission
            Submission.objects.filter(id=submission_id).update(
                status="runtime_error",
                stderr="An error occurred during execution.",
            )
        except Exception:
            pass


def _map_status(executor_status):
    """Map executor status codes to submission status."""
    mapping = {
        "success": "accepted",
        "CE": "compilation_error",
        "TLE": "time_limit_exceeded",
        "MLE": "memory_limit_exceeded",
        "RE": "runtime_error",
    }
    return mapping.get(executor_status, "runtime_error")


@shared_task
def update_leaderboard_ranks():
    """Periodic task to recalculate coding ranks."""
    try:
        from apps.profiles.models import StudentProfile
        profiles = StudentProfile.objects.order_by("-total_questions_solved")
        for rank, profile in enumerate(profiles, 1):
            if profile.coding_rank != rank:
                profile.coding_rank = rank
                profile.save(update_fields=["coding_rank"])
        logger.info("Updated coding ranks for %d profiles", profiles.count())
    except Exception as exc:
        logger.error("Failed to update leaderboard ranks: %s", exc)
