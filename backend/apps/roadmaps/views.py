"""
Career Roadmaps views.
"""
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter
from rest_framework import generics

from .models import Roadmap, RoadmapMilestone, RoadmapStep, StudentRoadmapProgress, StepCompletion
from .serializers import (
    RoadmapListSerializer, RoadmapDetailSerializer,
    RoadmapAdminSerializer, MilestoneAdminSerializer, StepAdminSerializer,
)
from campushub.permissions import IsAdmin


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    r = {"success": True, "message": message}
    if data is not None:
        r["data"] = data
    return Response(r, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": {"message": message}}, status=code)


class RoadmapListView(generics.ListAPIView):
    """GET /api/roadmaps/ — list all active roadmaps."""
    permission_classes = [IsAuthenticated]
    serializer_class = RoadmapListSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["category", "difficulty"]
    search_fields = ["title", "description"]

    def get_queryset(self):
        return Roadmap.objects.filter(is_active=True)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class RoadmapDetailView(APIView):
    """GET /api/roadmaps/<slug>"""
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        try:
            roadmap = Roadmap.objects.prefetch_related(
                "milestones__steps"
            ).get(slug=slug, is_active=True)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)
        data = RoadmapDetailSerializer(roadmap, context={"request": request}).data
        return ok(data)


class RoadmapEnrollView(APIView):
    """POST /api/roadmaps/<slug>/enroll"""
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        try:
            roadmap = Roadmap.objects.get(slug=slug, is_active=True)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)

        progress, created = StudentRoadmapProgress.objects.get_or_create(
            student=request.user,
            roadmap=roadmap,
            defaults={
                "status": "in_progress",
                "total_steps": roadmap.total_steps,
            },
        )
        if not created:
            return err("Already enrolled in this roadmap.")

        roadmap.enrolled_count += 1
        roadmap.save(update_fields=["enrolled_count"])

        return ok({"status": progress.status, "percentage": progress.progress_percentage}, "Enrolled successfully.", 201)


class RoadmapCompleteStepView(APIView):
    """POST /api/roadmaps/steps/<step_id>/complete"""
    permission_classes = [IsAuthenticated]

    def post(self, request, step_id):
        try:
            step = RoadmapStep.objects.select_related("milestone__roadmap").get(id=step_id)
        except RoadmapStep.DoesNotExist:
            return err("Step not found.", 404)

        roadmap = step.milestone.roadmap

        # Ensure student is enrolled
        try:
            progress = StudentRoadmapProgress.objects.get(student=request.user, roadmap=roadmap)
        except StudentRoadmapProgress.DoesNotExist:
            return err("You must enroll in this roadmap first.")

        # Mark step complete
        _, created = StepCompletion.objects.get_or_create(student=request.user, step=step)
        if not created:
            return err("Step already completed.")

        # Update progress
        progress.completed_steps += 1
        if progress.completed_steps >= progress.total_steps:
            progress.status = "completed"
            progress.completed_at = timezone.now()
        else:
            progress.status = "in_progress"
        progress.save()

        # Award XP
        try:
            from apps.leaderboard.services import award_xp
            award_xp(request.user, "roadmap_step", 10, f"Completed step: {step.title}")
        except Exception:
            pass

        return ok({
            "completed_steps": progress.completed_steps,
            "total_steps": progress.total_steps,
            "percentage": progress.progress_percentage,
            "status": progress.status,
        }, "Step completed!")


class RoadmapUncompleteStepView(APIView):
    """DELETE /api/roadmaps/steps/<step_id>/complete"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, step_id):
        try:
            step = RoadmapStep.objects.select_related("milestone__roadmap").get(id=step_id)
        except RoadmapStep.DoesNotExist:
            return err("Step not found.", 404)

        roadmap = step.milestone.roadmap
        deleted, _ = StepCompletion.objects.filter(student=request.user, step=step).delete()
        if not deleted:
            return err("Step was not completed.")

        try:
            progress = StudentRoadmapProgress.objects.get(student=request.user, roadmap=roadmap)
            progress.completed_steps = max(0, progress.completed_steps - 1)
            progress.status = "in_progress"
            progress.completed_at = None
            progress.save()
        except StudentRoadmapProgress.DoesNotExist:
            pass

        return ok(message="Step uncompleted.")


class MyRoadmapsView(APIView):
    """GET /api/roadmaps/my — student's enrolled roadmaps."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        progress_list = StudentRoadmapProgress.objects.filter(
            student=request.user
        ).select_related("roadmap")
        data = [
            {
                "roadmap": RoadmapListSerializer(p.roadmap, context={"request": request}).data,
                "status": p.status,
                "completed_steps": p.completed_steps,
                "total_steps": p.total_steps,
                "percentage": p.progress_percentage,
                "started_at": p.started_at,
                "completed_at": p.completed_at,
            }
            for p in progress_list
        ]
        return ok(data)


# ── Admin Views ────────────────────────────────────────────────────────────────

class AdminRoadmapListCreateView(APIView):
    """GET/POST /api/admin/roadmaps"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        roadmaps = Roadmap.objects.all()
        data = RoadmapAdminSerializer(roadmaps, many=True).data
        return ok(data)

    def post(self, request):
        s = RoadmapAdminSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        roadmap = s.save(created_by=request.user)
        return ok(RoadmapAdminSerializer(roadmap).data, "Roadmap created.", 201)


class AdminRoadmapDetailView(APIView):
    """PUT/DELETE /api/admin/roadmaps/<uuid:pk>"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def put(self, request, pk):
        try:
            roadmap = Roadmap.objects.get(pk=pk)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)
        s = RoadmapAdminSerializer(roadmap, data=request.data, partial=True)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        s.save()
        return ok(s.data, "Roadmap updated.")

    def delete(self, request, pk):
        try:
            roadmap = Roadmap.objects.get(pk=pk)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)
        roadmap.is_active = False
        roadmap.save(update_fields=["is_active"])
        return ok(message="Roadmap deleted.")


class AdminMilestoneCreateView(APIView):
    """POST /api/admin/roadmaps/<uuid:roadmap_id>/milestones"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, roadmap_id):
        try:
            roadmap = Roadmap.objects.get(pk=roadmap_id)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)
        data = request.data.copy()
        data["roadmap"] = str(roadmap.id)
        s = MilestoneAdminSerializer(data=data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        s.save()
        return ok(s.data, "Milestone created.", 201)


class AdminStepCreateView(APIView):
    """POST /api/admin/roadmaps/milestones/<uuid:milestone_id>/steps"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, milestone_id):
        try:
            milestone = RoadmapMilestone.objects.get(pk=milestone_id)
        except RoadmapMilestone.DoesNotExist:
            return err("Milestone not found.", 404)
        data = request.data.copy()
        data["milestone"] = str(milestone.id)
        s = StepAdminSerializer(data=data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        s.save()
        # Update roadmap total_steps
        roadmap = milestone.roadmap
        roadmap.total_steps = RoadmapStep.objects.filter(milestone__roadmap=roadmap).count()
        roadmap.save(update_fields=["total_steps"])
        return ok(s.data, "Step created.", 201)
