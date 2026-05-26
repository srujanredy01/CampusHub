"""
Coding Contests views — enhanced contest management, leaderboard, and analytics.
Uses models from apps.coding (Contest, ContestProblem, ContestRegistration, ContestSubmission).
"""
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework import generics

from campushub.permissions import IsAdmin, IsFacultyOrAdmin
from apps.coding.models import (
    Contest, ContestProblem, ContestRegistration,
    ContestSubmission, CodingQuestion, Submission,
)
from .serializers import (
    ContestListSerializer, ContestDetailSerializer,
    ContestCreateSerializer, ContestProblemSerializer,
    ContestLeaderboardSerializer, ContestRegistrationSerializer,
)


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    return Response(payload, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": {"message": message}}, status=code)


class ContestListView(generics.ListAPIView):
    """List all published contests."""
    permission_classes = [IsAuthenticated]
    serializer_class = ContestListSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["starts_at", "ends_at", "created_at"]
    ordering = ["-starts_at"]

    def get_queryset(self):
        qs = Contest.objects.filter(status="published")
        phase = self.request.query_params.get("phase")
        now = timezone.now()
        if phase == "upcoming":
            qs = qs.filter(starts_at__gt=now)
        elif phase == "live":
            qs = qs.filter(starts_at__lte=now, ends_at__gte=now)
        elif phase == "ended":
            qs = qs.filter(ends_at__lt=now)
        return qs


class ContestDetailView(APIView):
    """Get contest details with problems (if registered and contest started)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        contest = Contest.objects.filter(pk=pk).first()
        if not contest:
            return err("Contest not found.", 404)

        data = ContestDetailSerializer(contest, context={"request": request}).data

        # Include problems only if contest has started and user is registered
        now = timezone.now()
        is_registered = ContestRegistration.objects.filter(
            contest=contest, user=request.user
        ).exists()

        if is_registered and now >= contest.starts_at:
            problems = ContestProblem.objects.filter(
                contest=contest
            ).select_related("question").order_by("order")
            data["problems"] = ContestProblemSerializer(problems, many=True).data
        else:
            data["problems"] = []

        data["is_registered"] = is_registered
        data["phase"] = contest.phase
        return ok(data)


class ContestRegisterView(APIView):
    """Register for a contest."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        contest = Contest.objects.filter(pk=pk, status="published").first()
        if not contest:
            return err("Contest not found.", 404)

        if timezone.now() > contest.ends_at:
            return err("Contest has already ended.")

        registration, created = ContestRegistration.objects.get_or_create(
            contest=contest, user=request.user
        )
        if not created:
            return err("Already registered for this contest.")

        return ok(message="Successfully registered for the contest.", code=201)


class ContestLeaderboardView(APIView):
    """Get contest leaderboard with rankings."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        contest = Contest.objects.filter(pk=pk).first()
        if not contest:
            return err("Contest not found.", 404)

        # Aggregate scores per user
        leaderboard = (
            ContestSubmission.objects.filter(contest=contest)
            .values("user__id", "user__full_name", "user__student_id")
            .annotate(
                total_score=Sum("score"),
                total_penalty=Sum("penalty_seconds"),
                problems_solved=Count("contest_problem", distinct=True, filter=Q(score__gt=0)),
            )
            .order_by("-total_score", "total_penalty")
        )

        results = []
        for rank, entry in enumerate(leaderboard, 1):
            results.append({
                "rank": rank,
                "user_id": str(entry["user__id"]),
                "full_name": entry["user__full_name"],
                "student_id": entry["user__student_id"],
                "total_score": entry["total_score"] or 0,
                "total_penalty": entry["total_penalty"] or 0,
                "problems_solved": entry["problems_solved"],
            })

        return ok({
            "contest_id": str(contest.id),
            "contest_title": contest.title,
            "leaderboard": results,
            "total_participants": ContestRegistration.objects.filter(contest=contest).count(),
        })


class ContestSubmitView(APIView):
    """Submit code for a contest problem."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk, problem_id):
        contest = Contest.objects.filter(pk=pk, status="published").first()
        if not contest:
            return err("Contest not found.", 404)

        now = timezone.now()
        if now < contest.starts_at:
            return err("Contest has not started yet.")
        if now > contest.ends_at:
            return err("Contest has ended.")

        if not ContestRegistration.objects.filter(contest=contest, user=request.user).exists():
            return err("You are not registered for this contest.")

        contest_problem = ContestProblem.objects.filter(pk=problem_id, contest=contest).first()
        if not contest_problem:
            return err("Problem not found in this contest.", 404)

        language = request.data.get("language")
        code = request.data.get("code")
        if not language or not code:
            return err("Language and code are required.")

        # Create the base submission
        submission = Submission.objects.create(
            user=request.user,
            question=contest_problem.question,
            language=language,
            code=code,
            status="pending",
        )

        # Calculate penalty (seconds since contest start)
        penalty = int((now - contest.starts_at).total_seconds())

        # Create contest submission
        contest_submission = ContestSubmission.objects.create(
            contest=contest,
            contest_problem=contest_problem,
            user=request.user,
            submission=submission,
            score=0,
            penalty_seconds=penalty,
        )

        # Trigger code execution asynchronously
        try:
            from apps.coding.tasks import execute_submission
            execute_submission.delay(str(submission.id), str(contest_submission.id))
        except Exception:
            pass

        return ok({
            "submission_id": str(submission.id),
            "contest_submission_id": str(contest_submission.id),
            "status": "pending",
        }, "Submission received. Judging in progress.", 201)


# ── Admin Contest Management ──────────────────────────────────────────────────

class AdminContestCreateView(APIView):
    """Admin/Faculty creates a new contest."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def post(self, request):
        serializer = ContestCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        contest = serializer.save(created_by=request.user)
        return ok(ContestDetailSerializer(contest).data, "Contest created.", 201)


class AdminContestUpdateView(APIView):
    """Admin/Faculty updates a contest."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def put(self, request, pk):
        contest = Contest.objects.filter(pk=pk).first()
        if not contest:
            return err("Contest not found.", 404)
        serializer = ContestCreateSerializer(contest, data=request.data, partial=True)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        serializer.save()
        return ok(ContestDetailSerializer(contest).data, "Contest updated.")

    def delete(self, request, pk):
        contest = Contest.objects.filter(pk=pk).first()
        if not contest:
            return err("Contest not found.", 404)
        contest.status = "archived"
        contest.save(update_fields=["status"])
        return ok(message="Contest archived.")


class AdminContestAddProblemView(APIView):
    """Add a problem to a contest."""
    permission_classes = [IsAuthenticated, IsFacultyOrAdmin]

    def post(self, request, pk):
        contest = Contest.objects.filter(pk=pk).first()
        if not contest:
            return err("Contest not found.", 404)

        question_id = request.data.get("question_id")
        points = request.data.get("points", 100)
        order = request.data.get("order", 0)

        question = CodingQuestion.objects.filter(pk=question_id, is_active=True).first()
        if not question:
            return err("Question not found.", 404)

        if ContestProblem.objects.filter(contest=contest, question=question).exists():
            return err("Question already added to this contest.")

        problem = ContestProblem.objects.create(
            contest=contest, question=question, points=points, order=order
        )
        return ok(ContestProblemSerializer(problem).data, "Problem added to contest.", 201)
