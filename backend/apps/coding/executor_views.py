"""
Code execution views for CampusHub.
Forwards execution requests to the isolated executor service.
"""

import logging
import requests
from django.conf import settings
from django.db.models import F
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .models import CodingQuestion, Submission
from .serializers import CodeRunSerializer, CodeSubmitSerializer, SubmissionSerializer

logger = logging.getLogger(__name__)

EXECUTOR_URL = settings.EXECUTOR_SERVICE_URL
EXECUTOR_TIMEOUT = settings.EXECUTOR_TIMEOUT          # per-test-case execution timeout (seconds)
EXECUTOR_MEMORY_MB = getattr(settings, "EXECUTOR_MEMORY_MB", 192)
# HTTP connection/read timeout for the executor service — slightly longer than execution timeout
_EXECUTOR_HTTP_TIMEOUT = EXECUTOR_TIMEOUT + 5


class CodeRunThrottle(UserRateThrottle):
    scope = "code_run"


class CodeSubmitThrottle(UserRateThrottle):
    scope = "code_submit"


def judge_question_submission(user, question, language, code):
    submission = Submission.objects.create(
        user=user,
        question=question,
        language=language,
        code=code,
        status="running",
    )

    test_cases = []
    if question.sample_input:
        test_cases.append({
            "input": question.sample_input,
            "expected_output": question.sample_output,
            "is_hidden": False,
        })
    for test_case in question.hidden_test_cases:
        test_cases.append({
            "input": test_case.get("input", ""),
            "expected_output": test_case.get("expected_output", ""),
            "is_hidden": True,
        })

    if not test_cases:
        submission.status = "wrong_answer"
        submission.stderr = "No test cases configured for this question."
        submission.save(update_fields=["status", "stderr"])
        return submission

    payload = {
        "language": language,
        "code": code,
        "test_cases": test_cases,
        "timeout_sec": EXECUTOR_TIMEOUT,
        "memory_limit_mb": EXECUTOR_MEMORY_MB,
    }

    try:
        response = requests.post(
            f"{EXECUTOR_URL}/judge",
            json=payload,
            timeout=EXECUTOR_TIMEOUT * len(test_cases) + 5,
        )
        result = response.json()
    except requests.Timeout:
        submission.status = "time_limit_exceeded"
        submission.save(update_fields=["status"])
        raise
    except requests.ConnectionError as exc:
        submission.status = "runtime_error"
        submission.stderr = "Executor service unavailable."
        submission.save(update_fields=["status", "stderr"])
        raise
    except Exception as exc:
        submission.status = "runtime_error"
        submission.stderr = str(exc)
        submission.save(update_fields=["status", "stderr"])
        raise
    test_results = result.get("test_results", [])
    passed = sum(1 for test_result in test_results if test_result.get("passed"))
    total = len(test_results)
    overall_status = "accepted" if passed == total and total > 0 else "wrong_answer"

    for test_result in test_results:
        if test_result.get("status") == "TLE":
            overall_status = "time_limit_exceeded"
            break
        if test_result.get("status") == "MLE":
            overall_status = "memory_limit_exceeded"
            break
        if test_result.get("status") == "RE":
            overall_status = "runtime_error"
            break
        if test_result.get("status") == "CE":
            overall_status = "compilation_error"
            break

    submission.status = overall_status
    submission.stdout = result.get("stdout", "")
    submission.stderr = result.get("stderr", "")
    submission.execution_time = result.get("execution_time")
    submission.memory_used = result.get("memory_used")
    submission.test_results = test_results
    submission.passed_test_cases = passed
    submission.total_test_cases = total
    submission.save()
    return submission


class CodeRunView(APIView):
    """
    POST /api/code/run
    Run code with custom stdin (no test cases, just execute).
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [CodeRunThrottle]

    def post(self, request):
        serializer = CodeRunSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payload = {
            "language": serializer.validated_data["language"],
            "code": serializer.validated_data["code"],
            "stdin": serializer.validated_data.get("stdin", ""),
            "timeout_sec": EXECUTOR_TIMEOUT,
            "memory_limit_mb": EXECUTOR_MEMORY_MB,
        }

        try:
            response = requests.post(
                f"{EXECUTOR_URL}/execute",
                json=payload,
                timeout=_EXECUTOR_HTTP_TIMEOUT,
            )
            result = response.json()
        except requests.Timeout:
            return Response(
                {"success": False, "error": {"message": "Code execution timed out."}},
                status=status.HTTP_408_REQUEST_TIMEOUT,
            )
        except requests.ConnectionError:
            logger.error("Cannot connect to executor service at %s", EXECUTOR_URL)
            return Response(
                {"success": False, "error": {"message": "Execution service unavailable. Please try again."}},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as e:
            logger.exception("Executor error: %s", e)
            return Response(
                {"success": False, "error": {"message": "Execution failed."}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"success": True, "data": result})


class CodeSubmitView(APIView):
    """
    POST /api/code/submit
    Submit code against a question's hidden test cases.
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [CodeSubmitThrottle]

    def post(self, request):
        serializer = CodeSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        question_id = serializer.validated_data["question_id"]
        language = serializer.validated_data["language"]
        code = serializer.validated_data["code"]

        try:
            question = CodingQuestion.objects.get(pk=question_id, is_active=True)
        except CodingQuestion.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Question not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            submission = judge_question_submission(request.user, question, language, code)
        except requests.Timeout:
            return Response(
                {"success": False, "error": {"message": "Submission timed out."}},
                status=status.HTTP_408_REQUEST_TIMEOUT,
            )
        except Exception as e:
            logger.exception("Submission executor error: %s", e)
            return Response(
                {"success": False, "error": {"message": "Execution failed."}},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        overall_status = submission.status

        # Update question stats
        CodingQuestion.objects.filter(pk=question_id).update(
            total_submissions=F("total_submissions") + 1,
        )
        if overall_status == "accepted":
            CodingQuestion.objects.filter(pk=question_id).update(
                accepted_submissions=F("accepted_submissions") + 1,
            )
            # Update profile stats
            try:
                from apps.profiles.models import ActivityLog
                ActivityLog.objects.create(
                    user=request.user,
                    activity_type="question_solved",
                    description=f"Solved: {question.title}",
                    metadata={"question_id": str(question_id), "difficulty": question.difficulty},
                )
            except Exception:
                pass
            # Update coding stats
            try:
                from apps.coding.tasks import update_coding_stats
                update_coding_stats(str(request.user.id))
            except Exception:
                pass

        # Track submission activity
        try:
            from apps.audit.utils import log_code_submit
            log_code_submit(request, question_id, language, overall_status)
        except Exception:
            pass

        return Response({
            "success": True,
            "data": SubmissionSerializer(submission).data,
            "message": f"Submission {overall_status.replace('_', ' ').title()}",
        })
