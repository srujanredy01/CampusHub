"""
Career Roadmaps views — community-driven with moderation workflow.
"""
import logging
from django.db.models import F, Avg, Count
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import (
    Roadmap, RoadmapMilestone, RoadmapStep, StudentRoadmapProgress,
    StepCompletion, RoadmapLike, RoadmapComment, RoadmapRating,
    RoadmapBookmark, RoadmapReport,
)
from .serializers import (
    RoadmapListSerializer, RoadmapDetailSerializer, RoadmapCreateSerializer,
    RoadmapCommentSerializer, RoadmapAdminSerializer,
    MilestoneAdminSerializer, StepAdminSerializer,
)
from campushub.permissions import IsAdmin, IsFacultyOrAdmin, IsModeratorOrAdmin

logger = logging.getLogger(__name__)


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    r = {"success": True, "message": message}
    if data is not None:
        r["data"] = data
    return Response(r, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": {"message": message}}, status=code)


# ═══════════════════════════════════════════════════════════════════════════════
# PUBLIC / STUDENT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


class RoadmapListView(generics.ListAPIView):
    """GET /api/roadmaps/ — list approved public roadmaps."""
    permission_classes = [IsAuthenticated]
    serializer_class = RoadmapListSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "difficulty"]
    search_fields = ["title", "description", "skills_covered", "target_role"]
    ordering_fields = ["created_at", "enrolled_count", "like_count", "average_rating"]
    ordering = ["-is_featured", "-enrolled_count"]

    def get_queryset(self):
        qs = Roadmap.objects.filter(status="approved", is_active=True)
        # Additional filters
        params = self.request.query_params
        if params.get("sort") == "popular":
            qs = qs.order_by("-enrolled_count", "-like_count")
        elif params.get("sort") == "latest":
            qs = qs.order_by("-created_at")
        elif params.get("sort") == "top_rated":
            qs = qs.order_by("-average_rating", "-rating_count")
        elif params.get("sort") == "faculty_verified":
            qs = qs.filter(is_faculty_verified=True)
        return qs

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

        # Allow creator to see their own draft/submitted roadmaps
        if roadmap.status != "approved" and roadmap.created_by != request.user:
            if request.user.role not in ("admin", "super_admin", "moderator"):
                return err("Roadmap not found.", 404)

        # Increment view count
        Roadmap.objects.filter(pk=roadmap.pk).update(view_count=F("view_count") + 1)
        roadmap.refresh_from_db()

        data = RoadmapDetailSerializer(roadmap, context={"request": request}).data
        return ok(data)


class RoadmapCreateView(APIView):
    """POST /api/roadmaps/create — student creates a roadmap (draft)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = RoadmapCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)

        roadmap = serializer.save(created_by=request.user, status="draft")
        logger.info("Roadmap created: '%s' by %s", roadmap.title, request.user.email)
        return ok(
            RoadmapDetailSerializer(roadmap, context={"request": request}).data,
            "Roadmap created as draft.",
            status.HTTP_201_CREATED,
        )


class RoadmapUpdateView(APIView):
    """PUT /api/roadmaps/<slug>/edit — creator edits their roadmap."""
    permission_classes = [IsAuthenticated]

    def put(self, request, slug):
        try:
            roadmap = Roadmap.objects.get(slug=slug)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)

        # Only creator can edit, and only in draft/needs_changes state
        if roadmap.created_by != request.user:
            if request.user.role not in ("admin", "super_admin"):
                return err("Permission denied.", 403)

        if roadmap.status not in ("draft", "needs_changes", "rejected"):
            if request.user.role not in ("admin", "super_admin"):
                return err("Cannot edit a roadmap that is already submitted or approved.", 400)

        serializer = RoadmapCreateSerializer(roadmap, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"success": False, "errors": serializer.errors}, status=400)
        serializer.save()
        roadmap.refresh_from_db()
        return ok(
            RoadmapDetailSerializer(roadmap, context={"request": request}).data,
            "Roadmap updated.",
        )


class RoadmapSubmitView(APIView):
    """POST /api/roadmaps/<slug>/submit — submit for moderator review."""
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        try:
            roadmap = Roadmap.objects.get(slug=slug, created_by=request.user)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)

        if roadmap.status not in ("draft", "needs_changes", "rejected"):
            return err(f"Cannot submit a roadmap with status '{roadmap.status}'.")

        # Validate minimum content
        if roadmap.total_steps < 3:
            return err("Roadmap must have at least 3 steps before submission.")

        roadmap.status = "submitted"
        roadmap.submitted_at = timezone.now()
        roadmap.save(update_fields=["status", "submitted_at"])

        # Notify moderators
        try:
            from apps.notifications.services import create_admin_alert
            create_admin_alert(
                "system_event", "info",
                f"New roadmap submitted: {roadmap.title}",
                f"{request.user.full_name} submitted a roadmap for review",
                user=request.user,
                metadata={"roadmap_id": str(roadmap.id), "roadmap_slug": roadmap.slug},
            )
        except Exception:
            pass

        return ok({"status": roadmap.status}, "Roadmap submitted for review.")


class RoadmapDeleteView(APIView):
    """DELETE /api/roadmaps/<slug> — creator deletes their draft."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, slug):
        try:
            roadmap = Roadmap.objects.get(slug=slug)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)

        if roadmap.created_by != request.user and request.user.role not in ("admin", "super_admin"):
            return err("Permission denied.", 403)

        roadmap.is_active = False
        roadmap.save(update_fields=["is_active"])
        return ok(message="Roadmap deleted.")


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


class MyCreatedRoadmapsView(APIView):
    """GET /api/roadmaps/my-created — roadmaps created by this user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        roadmaps = Roadmap.objects.filter(
            created_by=request.user, is_active=True
        ).order_by("-created_at")
        data = RoadmapListSerializer(roadmaps, many=True, context={"request": request}).data
        return ok(data)


class RoadmapEnrollView(APIView):
    """POST /api/roadmaps/<slug>/enroll"""
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        try:
            roadmap = Roadmap.objects.get(slug=slug, is_active=True, status="approved")
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)

        progress, created = StudentRoadmapProgress.objects.get_or_create(
            student=request.user,
            roadmap=roadmap,
            defaults={"status": "in_progress", "total_steps": roadmap.total_steps},
        )
        if not created:
            return err("Already enrolled in this roadmap.")

        Roadmap.objects.filter(pk=roadmap.pk).update(enrolled_count=F("enrolled_count") + 1)
        return ok({"status": progress.status, "percentage": progress.progress_percentage}, "Enrolled!", 201)


class RoadmapCompleteStepView(APIView):
    """POST /api/roadmaps/steps/<step_id>/complete"""
    permission_classes = [IsAuthenticated]

    def post(self, request, step_id):
        try:
            step = RoadmapStep.objects.select_related("milestone__roadmap").get(id=step_id)
        except RoadmapStep.DoesNotExist:
            return err("Step not found.", 404)

        roadmap = step.milestone.roadmap
        try:
            progress = StudentRoadmapProgress.objects.get(student=request.user, roadmap=roadmap)
        except StudentRoadmapProgress.DoesNotExist:
            return err("You must enroll in this roadmap first.")

        _, created = StepCompletion.objects.get_or_create(student=request.user, step=step)
        if not created:
            return err("Step already completed.")

        progress.completed_steps += 1
        if progress.completed_steps >= progress.total_steps:
            progress.status = "completed"
            progress.completed_at = timezone.now()
        else:
            progress.status = "in_progress"
        progress.save()

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

        deleted, _ = StepCompletion.objects.filter(student=request.user, step=step).delete()
        if not deleted:
            return err("Step was not completed.")

        roadmap = step.milestone.roadmap
        try:
            progress = StudentRoadmapProgress.objects.get(student=request.user, roadmap=roadmap)
            progress.completed_steps = max(0, progress.completed_steps - 1)
            progress.status = "in_progress"
            progress.completed_at = None
            progress.save()
        except StudentRoadmapProgress.DoesNotExist:
            pass

        return ok(message="Step uncompleted.")


# ── Community Features ────────────────────────────────────────────────────────


class RoadmapLikeView(APIView):
    """POST /api/roadmaps/<slug>/like — toggle like."""
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        try:
            roadmap = Roadmap.objects.get(slug=slug, status="approved", is_active=True)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)

        like, created = RoadmapLike.objects.get_or_create(roadmap=roadmap, user=request.user)
        if not created:
            like.delete()
            Roadmap.objects.filter(pk=roadmap.pk).update(like_count=F("like_count") - 1)
            return ok({"is_liked": False, "like_count": roadmap.like_count - 1}, "Like removed.")

        Roadmap.objects.filter(pk=roadmap.pk).update(like_count=F("like_count") + 1)
        return ok({"is_liked": True, "like_count": roadmap.like_count + 1}, "Liked!")


class RoadmapBookmarkView(APIView):
    """POST /api/roadmaps/<slug>/bookmark — toggle bookmark."""
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        try:
            roadmap = Roadmap.objects.get(slug=slug, status="approved", is_active=True)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)

        bm, created = RoadmapBookmark.objects.get_or_create(roadmap=roadmap, user=request.user)
        if not created:
            bm.delete()
            return ok({"is_bookmarked": False}, "Bookmark removed.")
        return ok({"is_bookmarked": True}, "Bookmarked!")


class RoadmapRateView(APIView):
    """POST /api/roadmaps/<slug>/rate — rate 1-5."""
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        try:
            rating_val = int(request.data.get("rating"))
            if rating_val < 1 or rating_val > 5:
                raise ValueError
        except (TypeError, ValueError):
            return err("Rating must be 1-5.")

        try:
            roadmap = Roadmap.objects.get(slug=slug, status="approved", is_active=True)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)

        obj, _ = RoadmapRating.objects.get_or_create(
            roadmap=roadmap, user=request.user, defaults={"rating": rating_val}
        )
        if obj.rating != rating_val:
            obj.rating = rating_val
            obj.save(update_fields=["rating"])

        # Recalculate average
        agg = RoadmapRating.objects.filter(roadmap=roadmap).aggregate(
            avg=Avg("rating"), cnt=Count("id")
        )
        roadmap.average_rating = round(agg["avg"] or 0, 2)
        roadmap.rating_count = agg["cnt"] or 0
        roadmap.save(update_fields=["average_rating", "rating_count"])

        return ok({
            "average_rating": str(roadmap.average_rating),
            "rating_count": roadmap.rating_count,
            "user_rating": rating_val,
        }, "Rating saved.")


class RoadmapCommentsView(APIView):
    """GET/POST /api/roadmaps/<slug>/comments"""
    permission_classes = [IsAuthenticated]

    def get(self, request, slug):
        try:
            roadmap = Roadmap.objects.get(slug=slug, status="approved", is_active=True)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)

        comments = RoadmapComment.objects.filter(
            roadmap=roadmap, is_deleted=False, parent__isnull=True
        ).select_related("user").prefetch_related("replies")[:50]

        data = RoadmapCommentSerializer(comments, many=True).data
        return ok(data)

    def post(self, request, slug):
        try:
            roadmap = Roadmap.objects.get(slug=slug, status="approved", is_active=True)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)

        content = request.data.get("content", "").strip()
        if not content:
            return err("Comment content is required.")
        if len(content) > 2000:
            return err("Comment too long (max 2000 characters).")

        parent_id = request.data.get("parent_id")
        comment = RoadmapComment.objects.create(
            roadmap=roadmap, user=request.user, content=content,
            parent_id=parent_id if parent_id else None,
        )
        Roadmap.objects.filter(pk=roadmap.pk).update(comment_count=F("comment_count") + 1)

        return ok(
            RoadmapCommentSerializer(comment).data,
            "Comment added.",
            status.HTTP_201_CREATED,
        )


class RoadmapReportView(APIView):
    """POST /api/roadmaps/<slug>/report"""
    permission_classes = [IsAuthenticated]

    def post(self, request, slug):
        try:
            roadmap = Roadmap.objects.get(slug=slug, is_active=True)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)

        if RoadmapReport.objects.filter(roadmap=roadmap, reporter=request.user).exists():
            return err("You have already reported this roadmap.")

        reason = request.data.get("reason", "other")
        description = request.data.get("description", "")

        RoadmapReport.objects.create(
            roadmap=roadmap, reporter=request.user,
            reason=reason, description=description,
        )
        return ok(message="Report submitted.")


class RoadmapBookmarkedListView(APIView):
    """GET /api/roadmaps/bookmarked — user's bookmarked roadmaps."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookmarked_ids = RoadmapBookmark.objects.filter(
            user=request.user
        ).values_list("roadmap_id", flat=True)
        roadmaps = Roadmap.objects.filter(
            pk__in=bookmarked_ids, status="approved", is_active=True
        )
        data = RoadmapListSerializer(roadmaps, many=True, context={"request": request}).data
        return ok(data)


# ═══════════════════════════════════════════════════════════════════════════════
# MODERATOR ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


class ModeratorRoadmapQueueView(APIView):
    """GET /api/roadmaps/moderation/queue — pending submissions."""
    permission_classes = [IsAuthenticated, IsModeratorOrAdmin]

    def get(self, request):
        status_filter = request.query_params.get("status", "submitted")
        qs = Roadmap.objects.filter(is_active=True)
        if status_filter == "all":
            qs = qs.exclude(status="draft")
        else:
            qs = qs.filter(status=status_filter)
        qs = qs.select_related("created_by").order_by("-submitted_at", "-created_at")
        data = RoadmapAdminSerializer(qs[:50], many=True).data
        return ok(data)


class ModeratorRoadmapReviewView(APIView):
    """POST /api/roadmaps/moderation/<slug>/review — approve/reject/request changes."""
    permission_classes = [IsAuthenticated, IsModeratorOrAdmin]

    def post(self, request, slug):
        try:
            roadmap = Roadmap.objects.get(slug=slug)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)

        action = request.data.get("action")
        if action not in ("approve", "reject", "needs_changes"):
            return err("Action must be 'approve', 'reject', or 'needs_changes'.")

        notes = request.data.get("notes", "")

        if action == "approve":
            roadmap.status = "approved"
            roadmap.review_notes = notes
            roadmap.rejection_reason = ""
        elif action == "reject":
            roadmap.status = "rejected"
            roadmap.rejection_reason = notes or "Does not meet quality standards."
            roadmap.review_notes = notes
        elif action == "needs_changes":
            roadmap.status = "needs_changes"
            roadmap.review_notes = notes

        roadmap.reviewed_by = request.user
        roadmap.reviewed_at = timezone.now()
        roadmap.save(update_fields=[
            "status", "review_notes", "rejection_reason", "reviewed_by", "reviewed_at"
        ])

        # Notify creator
        try:
            from apps.notifications.services import create_user_notification
            if roadmap.created_by:
                status_msg = {
                    "approve": "Your roadmap has been approved and is now public!",
                    "reject": f"Your roadmap was rejected: {roadmap.rejection_reason}",
                    "needs_changes": f"Your roadmap needs changes: {notes}",
                }
                create_user_notification(
                    roadmap.created_by, "system",
                    f"Roadmap Review: {roadmap.title}",
                    status_msg[action],
                    priority="high" if action == "approve" else "normal",
                    metadata={"roadmap_id": str(roadmap.id), "action": action},
                )
        except Exception:
            pass

        logger.info("Roadmap %s %sd by %s", roadmap.slug, action, request.user.email)
        return ok({"status": roadmap.status}, f"Roadmap {action}d.")


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════


class AdminRoadmapListCreateView(APIView):
    """GET/POST /api/admin/roadmaps"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        roadmaps = Roadmap.objects.all().select_related("created_by", "reviewed_by")
        data = RoadmapAdminSerializer(roadmaps, many=True).data
        return ok(data)

    def post(self, request):
        s = RoadmapCreateSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        roadmap = s.save(created_by=request.user, status="approved")
        return ok(RoadmapAdminSerializer(roadmap).data, "Roadmap created.", 201)


class AdminRoadmapDetailView(APIView):
    """PUT/DELETE /api/admin/roadmaps/<uuid:pk>"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def put(self, request, pk):
        try:
            roadmap = Roadmap.objects.get(pk=pk)
        except Roadmap.DoesNotExist:
            return err("Roadmap not found.", 404)
        s = RoadmapCreateSerializer(roadmap, data=request.data, partial=True)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        s.save()
        return ok(RoadmapAdminSerializer(roadmap).data, "Roadmap updated.")

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
        milestone.roadmap.recalculate_steps()
        return ok(s.data, "Step created.", 201)
