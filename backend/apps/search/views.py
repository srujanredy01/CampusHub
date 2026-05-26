"""
Global Search — searches across all modules.
"""
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    r = {"success": True, "message": message}
    if data is not None:
        r["data"] = data
    return Response(r, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": {"message": message}}, status=code)


class GlobalSearchView(APIView):
    """GET /api/search/?q=... — universal search."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        category = request.query_params.get("category", "all")
        if len(query) < 2:
            return err("Query must be at least 2 characters.")

        results = {}
        limit = 8

        if category in ("all", "resources"):
            from apps.resources.models import Resource
            results["resources"] = list(
                Resource.objects.filter(
                    is_active=True
                ).filter(
                    Q(title__icontains=query) | Q(description__icontains=query) | Q(subject__icontains=query)
                ).values("id", "title", "subject", "file_type", "branch")[:limit]
            )

        if category in ("all", "coding"):
            from apps.coding.models import CodingQuestion
            results["coding_questions"] = list(
                CodingQuestion.objects.filter(
                    is_active=True
                ).filter(
                    Q(title__icontains=query) | Q(description__icontains=query)
                ).values("id", "title", "difficulty", "topic")[:limit]
            )

        if category in ("all", "contests"):
            from apps.coding.models import Contest
            results["contests"] = list(
                Contest.objects.filter(
                    Q(title__icontains=query) | Q(description__icontains=query)
                ).values("id", "title", "status", "starts_at")[:limit]
            )

        if category in ("all", "news"):
            from apps.news.models import NewsAnnouncement
            results["news"] = list(
                NewsAnnouncement.objects.filter(
                    is_active=True
                ).filter(
                    Q(title__icontains=query) | Q(content__icontains=query)
                ).values("id", "title", "category", "created_at")[:limit]
            )

        if category in ("all", "assignments"):
            from apps.assignments.models import Assignment
            results["assignments"] = list(
                Assignment.objects.filter(
                    is_active=True
                ).filter(
                    Q(title__icontains=query) | Q(description__icontains=query)
                ).values("id", "title", "subject", "deadline")[:limit]
            )

        if category in ("all", "lost_found"):
            from apps.lost_found.models import LostFoundItem
            results["lost_found"] = list(
                LostFoundItem.objects.filter(
                    is_active=True, is_flagged=False
                ).filter(
                    Q(item_name__icontains=query) | Q(description__icontains=query)
                ).values("id", "item_name", "category", "status", "location")[:limit]
            )

        if category in ("all", "roadmaps"):
            from apps.roadmaps.models import Roadmap
            results["roadmaps"] = list(
                Roadmap.objects.filter(
                    is_active=True
                ).filter(
                    Q(title__icontains=query) | Q(description__icontains=query)
                ).values("id", "title", "category", "difficulty")[:limit]
            )

        if category in ("all", "notes"):
            from apps.notes.models import Note
            results["notes"] = list(
                Note.objects.filter(
                    is_active=True, status="approved"
                ).filter(
                    Q(title__icontains=query) | Q(subject__icontains=query)
                ).values("id", "title", "subject", "branch")[:limit]
            )

        return ok(results)
