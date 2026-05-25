"""
Coding question views for CampusHub.
"""
import logging
import requests
from django.core.cache import cache
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import (
    CodingQuestion,
    Submission,
    SavedQuestion,
    CodingDraft,
    CodingDiscussionMessage,
    Contest,
    ContestProblem,
    ContestRegistration,
    ContestSubmission,
)
from .serializers import (
    CodingQuestionListSerializer,
    CodingQuestionDetailSerializer,
    CodingQuestionAdminSerializer,
    SubmissionSerializer,
    SavedQuestionSerializer,
    CodingDraftSerializer,
    CodingDiscussionMessageSerializer,
    ContestSerializer,
    ContestDetailSerializer,
    ContestSubmissionSerializer,
)
from campushub.permissions import IsAdmin
from .executor_views import judge_question_submission

logger = logging.getLogger(__name__)


def _compute_streak(dates):
    if not dates:
        return 0, 0
    streak = 1
    best = 1
    prev = dates[0]
    for d in dates[1:]:
        if (prev - d).days == 1:
            streak += 1
            best = max(best, streak)
        elif prev != d:
            streak = 1
        prev = d
    return streak, best


def _contest_queryset_for_user(user):
    qs = Contest.objects.all().annotate(
        problems_count=Count("contest_problems", distinct=True),
        registered_count=Count("registrations", distinct=True),
    )
    if user.role != "admin":
        qs = qs.filter(is_public=True).exclude(status="archived")
    return qs


def _contest_leaderboard(contest):
    rows = []
    registrations = ContestRegistration.objects.filter(contest=contest).select_related("user")
    problems = list(contest.contest_problems.select_related("question").order_by("order", "created_at"))

    for registration in registrations:
        score = 0
        penalty = 0
        solved = 0
        problem_rows = []
        for contest_problem in problems:
            attempts = ContestSubmission.objects.filter(
                contest=contest,
                user=registration.user,
                contest_problem=contest_problem,
            ).select_related("submission").order_by("created_at")
            accepted_attempt = None
            wrong_attempts = 0
            for attempt in attempts:
                if attempt.submission.status == "accepted":
                    accepted_attempt = attempt
                    break
                wrong_attempts += 1

            earned = 0
            problem_penalty = 0
            if accepted_attempt:
                earned = contest_problem.points
                solved += 1
                elapsed = accepted_attempt.created_at - contest.starts_at
                elapsed_seconds = max(int(elapsed.total_seconds()), 0)
                problem_penalty = elapsed_seconds + (wrong_attempts * 20 * 60)
                score += earned
                penalty += problem_penalty

            problem_rows.append({
                "contest_problem_id": str(contest_problem.id),
                "question_id": str(contest_problem.question_id),
                "title": contest_problem.question.title,
                "points": contest_problem.points,
                "score": earned,
                "attempts": attempts.count(),
                "solved": earned > 0,
            })

        rows.append({
            "user_id": str(registration.user_id),
            "full_name": registration.user.full_name,
            "student_id": registration.user.student_id,
            "score": score,
            "penalty_seconds": penalty,
            "solved_count": solved,
            "problems": problem_rows,
        })

    rows.sort(key=lambda row: (-row["score"], row["penalty_seconds"], row["full_name"].lower()))
    for index, row in enumerate(rows, start=1):
        row["rank"] = index
    return rows


class QuestionListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CodingQuestionListSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["topic", "difficulty"]
    search_fields = ["title", "description", "topic_tags", "company_tags"]
    ordering_fields = ["difficulty", "title", "created_at", "total_submissions"]
    ordering = ["difficulty", "title"]

    def get_queryset(self):
        qs = CodingQuestion.objects.filter(is_active=True)
        tag = self.request.query_params.get("tag", "").strip().lower()
        company = self.request.query_params.get("company", "").strip().lower()
        if tag:
            qs = qs.filter(topic_tags__icontains=tag)
        if company:
            qs = qs.filter(company_tags__icontains=company)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class QuestionTagsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Use DB-level aggregation — avoid loading all questions into Python
        tags = set()
        for tag_list in CodingQuestion.objects.filter(is_active=True).values_list("topic_tags", flat=True).iterator(chunk_size=200):
            if isinstance(tag_list, list):
                tags.update(str(t).strip() for t in tag_list if str(t).strip())
        return Response({"success": True, "data": sorted(tags)})


class QuestionCompaniesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        companies = set()
        for company_list in CodingQuestion.objects.filter(is_active=True).values_list("company_tags", flat=True).iterator(chunk_size=200):
            if isinstance(company_list, list):
                companies.update(str(t).strip() for t in company_list if str(t).strip())
        return Response({"success": True, "data": sorted(companies)})


class QuestionLeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        accepted = (
            Submission.objects.filter(status="accepted")
            .values("user", "user__full_name", "user__student_id")
            .annotate(
                solved_count=Count("question", distinct=True),
                accepted_submissions=Count("id"),
            )
            .order_by("-solved_count", "accepted_submissions")[:50]
        )

        rows = []
        for row in accepted:
            dates = list(
                Submission.objects.filter(
                    user_id=row["user"],
                    status="accepted",
                )
                .dates("created_at", "day", order="DESC")
            )
            current_streak, best_streak = _compute_streak(dates) if dates else (0, 0)
            rows.append(
                {
                    "user_id": str(row["user"]),
                    "full_name": row["user__full_name"],
                    "student_id": row["user__student_id"],
                    "solved_count": row["solved_count"],
                    "accepted_submissions": row["accepted_submissions"],
                    "current_streak": current_streak,
                    "best_streak": best_streak,
                }
            )
        rows.sort(key=lambda x: (-x["solved_count"], -x["current_streak"], x["accepted_submissions"]))
        return Response({"success": True, "data": rows})


class MyCodingStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Submission.objects.filter(user=request.user, status="accepted")
        solved_count = qs.values("question").distinct().count()
        total_submissions = Submission.objects.filter(user=request.user).count()
        dates = list(qs.dates("created_at", "day", order="DESC"))
        current_streak, best_streak = _compute_streak(dates) if dates else (0, 0)
        return Response(
            {
                "success": True,
                "data": {
                    "solved_count": solved_count,
                    "total_submissions": total_submissions,
                    "current_streak": current_streak,
                    "best_streak": best_streak,
                },
            }
        )


class QuestionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            question = CodingQuestion.objects.get(pk=pk, is_active=True)
        except CodingQuestion.DoesNotExist:
            return Response({"success": False, "error": {"message": "Question not found."}}, status=404)
        if request.user.role == "admin":
            serializer = CodingQuestionAdminSerializer(question)
        else:
            serializer = CodingQuestionDetailSerializer(question, context={"request": request})
        return Response({"success": True, "data": serializer.data})


class QuestionEditorialView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        question = CodingQuestion.objects.filter(pk=pk, is_active=True).first()
        if not question:
            return Response({"success": False, "error": {"message": "Question not found."}}, status=404)
        return Response(
            {
                "success": True,
                "data": {
                    "title": question.editorial_title,
                    "content": question.editorial_content,
                },
            }
        )


class QuestionCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        s = CodingQuestionAdminSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        question = s.save(created_by=request.user)
        return Response({"success": True, "data": CodingQuestionAdminSerializer(question).data, "message": "Question created."}, status=201)


class QuestionManageView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def _get(self, pk):
        try:
            return CodingQuestion.objects.get(pk=pk)
        except CodingQuestion.DoesNotExist:
            return None

    def put(self, request, pk):
        q = self._get(pk)
        if not q:
            return Response({"success": False, "error": {"message": "Not found."}}, status=404)
        s = CodingQuestionAdminSerializer(q, data=request.data, partial=True)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        q = s.save()
        cache.delete(f"question:{pk}")
        return Response({"success": True, "data": CodingQuestionAdminSerializer(q).data})

    def delete(self, request, pk):
        q = self._get(pk)
        if not q:
            return Response({"success": False, "error": {"message": "Not found."}}, status=404)
        q.is_active = False
        q.save(update_fields=["is_active"])
        cache.delete(f"question:{pk}")
        return Response({"success": True, "message": "Question deleted."})


class SaveQuestionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question_id = request.data.get("question_id")
        if not question_id:
            return Response({"success": False, "error": {"message": "question_id required."}}, status=400)
        try:
            question = CodingQuestion.objects.get(pk=question_id, is_active=True)
        except CodingQuestion.DoesNotExist:
            return Response({"success": False, "error": {"message": "Question not found."}}, status=404)
        saved, created = SavedQuestion.objects.get_or_create(user=request.user, question=question)
        if not created:
            return Response({"success": False, "error": {"message": "Already saved."}}, status=409)
        return Response({"success": True, "message": "Question saved.", "data": {"id": str(saved.id)}}, status=201)


class UnsaveQuestionView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            saved = SavedQuestion.objects.get(user=request.user, question_id=pk)
            saved.delete()
            return Response({"success": True, "message": "Removed from saved."})
        except SavedQuestion.DoesNotExist:
            return Response({"success": False, "error": {"message": "Not found."}}, status=404)


class SavedQuestionsListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        saved = SavedQuestion.objects.filter(user=request.user).select_related("question")
        serializer = SavedQuestionSerializer(saved, many=True, context={"request": request})
        return Response({"success": True, "data": serializer.data})


class SubmissionHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        subs = Submission.objects.filter(user=request.user, question_id=pk).order_by("-created_at")[:50]
        return Response({"success": True, "data": SubmissionSerializer(subs, many=True).data})


class DraftView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        language = request.query_params.get("language", "python")
        draft = CodingDraft.objects.filter(user=request.user, question_id=pk, language=language).first()
        if not draft:
            return Response({"success": True, "data": None})
        return Response({"success": True, "data": CodingDraftSerializer(draft).data})

    def put(self, request, pk):
        language = request.data.get("language")
        code = request.data.get("code", "")
        if not language:
            return Response({"success": False, "error": {"message": "language is required."}}, status=400)
        if len(code) > 50000:
            return Response({"success": False, "error": {"message": "Draft is too large."}}, status=400)
        question = CodingQuestion.objects.filter(pk=pk, is_active=True).first()
        if not question:
            return Response({"success": False, "error": {"message": "Question not found."}}, status=404)
        draft, _ = CodingDraft.objects.update_or_create(
            user=request.user,
            question=question,
            language=language,
            defaults={"code": code},
        )
        return Response({"success": True, "data": CodingDraftSerializer(draft).data, "message": "Draft saved."})


class DiscussionListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        qs = (
            CodingDiscussionMessage.objects.filter(question_id=pk, parent__isnull=True, is_deleted=False)
            .select_related("user")
            .order_by("created_at")
        )
        serializer = CodingDiscussionMessageSerializer(qs, many=True, context={"request": request})
        return Response({"success": True, "data": serializer.data})

    def post(self, request, pk):
        question = CodingQuestion.objects.filter(pk=pk, is_active=True).first()
        if not question:
            return Response({"success": False, "error": {"message": "Question not found."}}, status=404)
        serializer = CodingDiscussionMessageSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)
        parent_id = request.data.get("parent")
        parent = None
        if parent_id:
            parent = CodingDiscussionMessage.objects.filter(pk=parent_id, question=question, is_deleted=False).first()
            if not parent:
                return Response({"success": False, "error": {"message": "Parent discussion not found."}}, status=404)
        msg = serializer.save(user=request.user, question=question, parent=parent)
        return Response({"success": True, "data": CodingDiscussionMessageSerializer(msg, context={"request": request}).data}, status=201)


class ContestListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ContestSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "is_public"]
    search_fields = ["title", "description"]
    ordering_fields = ["starts_at", "ends_at", "created_at"]
    ordering = ["-starts_at"]

    def get_queryset(self):
        phase = self.request.query_params.get("phase", "").strip()
        queryset = _contest_queryset_for_user(self.request.user)
        now = timezone.now()
        if phase == "upcoming":
            queryset = queryset.filter(starts_at__gt=now)
        elif phase == "live":
            queryset = queryset.filter(starts_at__lte=now, ends_at__gte=now)
        elif phase == "ended":
            queryset = queryset.filter(ends_at__lt=now)
        return queryset

    def get_serializer_context(self):
        return {"request": self.request}


class ContestDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        contest = _contest_queryset_for_user(request.user).filter(pk=pk).first()
        if not contest:
            return Response({"success": False, "error": {"message": "Contest not found."}}, status=404)
        serializer = ContestDetailSerializer(contest, context={"request": request})
        return Response({"success": True, "data": serializer.data})


class ContestRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        contest = Contest.objects.filter(pk=pk, is_public=True).first()
        if not contest:
            return Response({"success": False, "error": {"message": "Contest not found."}}, status=404)
        registration, created = ContestRegistration.objects.get_or_create(contest=contest, user=request.user)
        if not created:
            return Response({"success": True, "message": "Already registered.", "data": {"id": str(registration.id)}})
        return Response({"success": True, "message": "Registered for contest.", "data": {"id": str(registration.id)}}, status=201)


class ContestLeaderboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        contest = Contest.objects.filter(pk=pk).first()
        if not contest:
            return Response({"success": False, "error": {"message": "Contest not found."}}, status=404)
        return Response({"success": True, "data": _contest_leaderboard(contest)})


class ContestMySubmissionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        contest = Contest.objects.filter(pk=pk).first()
        if not contest:
            return Response({"success": False, "error": {"message": "Contest not found."}}, status=404)
        queryset = ContestSubmission.objects.filter(contest=contest, user=request.user).select_related(
            "submission", "contest_problem__question"
        )
        return Response({"success": True, "data": ContestSubmissionSerializer(queryset, many=True).data})


class ContestSubmitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        contest = Contest.objects.filter(pk=pk).first()
        if not contest:
            return Response({"success": False, "error": {"message": "Contest not found."}}, status=404)
        now = timezone.now()
        if now < contest.starts_at or now > contest.ends_at:
            return Response({"success": False, "error": {"message": "Contest is not live."}}, status=400)
        if not ContestRegistration.objects.filter(contest=contest, user=request.user).exists():
            return Response({"success": False, "error": {"message": "Register for the contest first."}}, status=403)

        contest_problem_id = request.data.get("contest_problem_id")
        language = request.data.get("language")
        code = request.data.get("code", "")
        if not contest_problem_id or not language or not code:
            return Response({"success": False, "error": {"message": "contest_problem_id, language, and code are required."}}, status=400)

        contest_problem = ContestProblem.objects.select_related("question", "contest").filter(
            pk=contest_problem_id,
            contest=contest,
        ).first()
        if not contest_problem:
            return Response({"success": False, "error": {"message": "Contest problem not found."}}, status=404)

        try:
            submission = judge_question_submission(request.user, contest_problem.question, language, code)
        except requests.Timeout:
            return Response({"success": False, "error": {"message": "Contest submission timed out."}}, status=408)
        except requests.ConnectionError:
            return Response({"success": False, "error": {"message": "Execution service unavailable."}}, status=503)
        except Exception:
            return Response({"success": False, "error": {"message": "Contest submission failed."}}, status=500)

        score = contest_problem.points if submission.status == "accepted" else 0
        penalty_seconds = 0
        if submission.status == "accepted":
            elapsed = submission.created_at - contest.starts_at
            penalty_seconds = max(int(elapsed.total_seconds()), 0)

        contest_submission = ContestSubmission.objects.create(
            contest=contest,
            contest_problem=contest_problem,
            user=request.user,
            submission=submission,
            score=score,
            penalty_seconds=penalty_seconds,
        )
        return Response(
            {
                "success": True,
                "data": ContestSubmissionSerializer(contest_submission).data,
                "message": "Contest submission recorded.",
            },
            status=201,
        )


class ContestAdminCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = ContestSerializer(data=request.data, context={"request": request})
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)
        problems = request.data.get("problems", [])
        with transaction.atomic():
            contest = serializer.save(created_by=request.user)
            for order, problem in enumerate(problems, start=1):
                question_id = problem.get("question_id")
                if not question_id:
                    continue
                ContestProblem.objects.create(
                    contest=contest,
                    question_id=question_id,
                    points=int(problem.get("points") or 100),
                    order=int(problem.get("order") or order),
                )
        return Response({"success": True, "data": ContestDetailSerializer(contest, context={"request": request}).data}, status=201)


class ContestAdminManageView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def put(self, request, pk):
        contest = Contest.objects.filter(pk=pk).first()
        if not contest:
            return Response({"success": False, "error": {"message": "Contest not found."}}, status=404)
        serializer = ContestSerializer(contest, data=request.data, partial=True, context={"request": request})
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)
        problems = request.data.get("problems")
        with transaction.atomic():
            contest = serializer.save()
            if isinstance(problems, list):
                contest.contest_problems.all().delete()
                for order, problem in enumerate(problems, start=1):
                    question_id = problem.get("question_id")
                    if not question_id:
                        continue
                    ContestProblem.objects.create(
                        contest=contest,
                        question_id=question_id,
                        points=int(problem.get("points") or 100),
                        order=int(problem.get("order") or order),
                    )
        return Response({"success": True, "data": ContestDetailSerializer(contest, context={"request": request}).data})

    def delete(self, request, pk):
        contest = Contest.objects.filter(pk=pk).first()
        if not contest:
            return Response({"success": False, "error": {"message": "Contest not found."}}, status=404)
        contest.status = "archived"
        contest.save(update_fields=["status", "updated_at"])
        return Response({"success": True, "message": "Contest archived."})
