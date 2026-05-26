"""
Placement Self-Tracker views.
Students self-track their placement journey.
"""
from django.db.models import Count, Q
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from .models import PlacementApplication, InterviewExperience, CompanyNote
from .serializers import (
    PlacementApplicationSerializer,
    PlacementApplicationCreateSerializer,
    InterviewExperienceSerializer,
    CompanyNoteSerializer,
)


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    return Response(payload, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST, errors=None):
    payload = {"success": False, "error": {"message": message}}
    if errors:
        payload["errors"] = errors
    return Response(payload, status=code)


class ApplicationListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PlacementApplicationSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "job_type"]
    search_fields = ["company_name", "role", "location"]
    ordering_fields = ["created_at", "deadline", "package_lpa", "updated_at", "company_name"]
    ordering = ["-updated_at"]

    def get_queryset(self):
        return PlacementApplication.objects.filter(
            student=self.request.user
        ).prefetch_related("interviews")


class ApplicationCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PlacementApplicationCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        application = serializer.save(student=request.user)
        return ok(
            PlacementApplicationSerializer(application).data,
            "Application added.", status.HTTP_201_CREATED,
        )


class ApplicationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def _get(self, pk, user):
        return PlacementApplication.objects.filter(
            pk=pk, student=user
        ).prefetch_related("interviews").first()

    def get(self, request, pk):
        app = self._get(pk, request.user)
        if not app:
            return err("Not found.", status.HTTP_404_NOT_FOUND)
        return ok(PlacementApplicationSerializer(app).data)

    def put(self, request, pk):
        app = self._get(pk, request.user)
        if not app:
            return err("Not found.", status.HTTP_404_NOT_FOUND)
        serializer = PlacementApplicationCreateSerializer(app, data=request.data, partial=True)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        serializer.save()
        app.refresh_from_db()
        return ok(PlacementApplicationSerializer(app).data, "Application updated.")

    def delete(self, request, pk):
        app = self._get(pk, request.user)
        if not app:
            return err("Not found.", status.HTTP_404_NOT_FOUND)
        app.delete()
        return ok(message="Application deleted.")


class InterviewCreateView(APIView):
    """Add interview experience to an application."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        application = PlacementApplication.objects.filter(pk=pk, student=request.user).first()
        if not application:
            return err("Application not found.", status.HTTP_404_NOT_FOUND)
        serializer = InterviewExperienceSerializer(data=request.data)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        interview = serializer.save(application=application)
        return ok(InterviewExperienceSerializer(interview).data, "Interview added.", status.HTTP_201_CREATED)

    def get(self, request, pk):
        application = PlacementApplication.objects.filter(pk=pk, student=request.user).first()
        if not application:
            return err("Application not found.", status.HTTP_404_NOT_FOUND)
        interviews = application.interviews.all()
        return ok(InterviewExperienceSerializer(interviews, many=True).data)


class PlacementKanbanView(APIView):
    """Get applications grouped by status for Kanban board."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = PlacementApplication.objects.filter(
            student=request.user
        ).prefetch_related("interviews")
        serializer = PlacementApplicationSerializer(queryset, many=True)
        columns = {}
        for app in serializer.data:
            columns.setdefault(app["status"], []).append(app)
        all_statuses = [k for k, _ in PlacementApplication.STATUS_CHOICES]
        return ok({"columns": columns, "all_statuses": all_statuses})


class PlacementStatsView(APIView):
    """Placement dashboard statistics."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = PlacementApplication.objects.filter(student=request.user)
        total = qs.count()
        by_status = {}
        for row in qs.values("status").annotate(count=Count("id")):
            by_status[row["status"]] = row["count"]

        interviews_count = InterviewExperience.objects.filter(
            application__student=request.user
        ).count()

        offers = qs.filter(status__in=["offer_received", "selected", "joined"]).count()
        rejections = qs.filter(status="rejected").count()
        wishlist = qs.filter(status="wishlist").count()

        return ok({
            "total_applications": total,
            "by_status": by_status,
            "interviews_count": interviews_count,
            "offers": offers,
            "rejections": rejections,
            "wishlist": wishlist,
        })


class PlacementReadinessView(APIView):
    """Calculate placement readiness score based on multiple factors."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        scores = {}

        # Resume completion (0-100)
        try:
            from apps.resume.models import ResumeProfile
            resume = ResumeProfile.objects.filter(student=user).first()
            scores["resume_completion"] = resume.calculate_completion() if resume else 0
        except Exception:
            scores["resume_completion"] = 0

        # Coding solved
        try:
            from apps.coding.models import Submission
            solved = Submission.objects.filter(
                user=user, status="accepted"
            ).values("question").distinct().count()
            scores["coding_solved"] = min(solved * 2, 100)
        except Exception:
            scores["coding_solved"] = 0

        # Roadmap progress
        try:
            from apps.roadmaps.models import StudentRoadmapProgress
            progress_entries = StudentRoadmapProgress.objects.filter(student=user)
            if progress_entries.exists():
                avg_progress = sum(p.progress_percentage for p in progress_entries) / progress_entries.count()
                scores["roadmap_progress"] = int(avg_progress)
            else:
                scores["roadmap_progress"] = 0
        except Exception:
            scores["roadmap_progress"] = 0

        # Profile completion
        try:
            from apps.profiles.models import StudentProfile
            profile = StudentProfile.objects.filter(user=user).first()
            if profile:
                filled = 0
                if profile.bio:
                    filled += 20
                if profile.github_url:
                    filled += 20
                if profile.linkedin_url:
                    filled += 20
                if profile.profile_image:
                    filled += 20
                if user.phone:
                    filled += 20
                scores["profile_completion"] = filled
            else:
                scores["profile_completion"] = 0
        except Exception:
            scores["profile_completion"] = 0

        # Contests participated
        try:
            from apps.coding.models import ContestRegistration
            contests = ContestRegistration.objects.filter(user=user).count()
            scores["contests_participated"] = min(contests * 10, 100)
        except Exception:
            scores["contests_participated"] = 0

        # Assignments completed
        try:
            from apps.assignments.models import AssignmentSubmission
            completed = AssignmentSubmission.objects.filter(
                student=user, status="graded"
            ).count()
            scores["assignments_completed"] = min(completed * 5, 100)
        except Exception:
            scores["assignments_completed"] = 0

        # Overall score (weighted average)
        weights = {
            "resume_completion": 0.20,
            "coding_solved": 0.25,
            "roadmap_progress": 0.15,
            "profile_completion": 0.15,
            "contests_participated": 0.15,
            "assignments_completed": 0.10,
        }
        overall = sum(scores[k] * weights[k] for k in weights)
        scores["overall_score"] = int(overall)

        return ok(scores)


class CompanyNoteListView(APIView):
    """CRUD for company prep notes."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notes = CompanyNote.objects.filter(student=request.user)
        return ok(CompanyNoteSerializer(notes, many=True).data)

    def post(self, request):
        serializer = CompanyNoteSerializer(data=request.data)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        serializer.save(student=request.user)
        return ok(serializer.data, "Note saved.", status.HTTP_201_CREATED)


class CompanyNoteDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        note = CompanyNote.objects.filter(pk=pk, student=request.user).first()
        if not note:
            return err("Not found.", status.HTTP_404_NOT_FOUND)
        return ok(CompanyNoteSerializer(note).data)

    def put(self, request, pk):
        note = CompanyNote.objects.filter(pk=pk, student=request.user).first()
        if not note:
            return err("Not found.", status.HTTP_404_NOT_FOUND)
        serializer = CompanyNoteSerializer(note, data=request.data, partial=True)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        serializer.save()
        return ok(CompanyNoteSerializer(note).data, "Note updated.")

    def delete(self, request, pk):
        note = CompanyNote.objects.filter(pk=pk, student=request.user).first()
        if not note:
            return err("Not found.", status.HTTP_404_NOT_FOUND)
        note.delete()
        return ok(message="Note deleted.")
