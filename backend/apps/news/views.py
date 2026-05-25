"""
News & Updates views for CampusHub.
"""
import logging
from datetime import timedelta

from django.db.models import F, Q
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import NewsAnnouncement, SavedNews
from .serializers import (
    NewsAnnouncementSerializer,
    NewsListSerializer,
    NewsCreateUpdateSerializer,
    SavedNewsSerializer,
)
from campushub.permissions import IsAdmin

logger = logging.getLogger(__name__)


def _base_qs():
    now = timezone.now()
    return (
        NewsAnnouncement.objects
        .filter(is_active=True)
        .filter(Q(publish_at__isnull=True) | Q(publish_at__lte=now))
        .filter(Q(expires_at__isnull=True) | Q(expires_at__gte=now))
        .select_related("created_by")
    )


class NewsListView(generics.ListAPIView):
    """
    GET /api/news/
    Params: search, filter (week|month|year), category, page
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = NewsListSerializer
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ["category", "priority", "is_pinned"]
    search_fields      = ["title", "short_description", "content", "tags"]
    ordering_fields    = ["created_at", "priority", "is_pinned", "read_count"]
    ordering           = ["-is_pinned", "-created_at"]

    def get_queryset(self):
        qs   = _base_qs()
        user = self.request.user

        # Branch targeting for students
        if user.role == "student" and user.branch:
            qs = qs.filter(Q(target_branch="") | Q(target_branch=user.branch))

        # Date filter
        date_filter = self.request.query_params.get("filter", "")
        now = timezone.now()
        if date_filter == "week":
            qs = qs.filter(created_at__gte=now - timedelta(days=7))
        elif date_filter == "month":
            qs = qs.filter(created_at__gte=now - timedelta(days=30))
        elif date_filter == "year":
            qs = qs.filter(created_at__gte=now - timedelta(days=365))

        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class NewsDetailView(APIView):
    """GET /api/news/<id>/ — full article + increment read_count."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            news = NewsAnnouncement.objects.get(pk=pk, is_active=True)
        except NewsAnnouncement.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Article not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )
        NewsAnnouncement.objects.filter(pk=pk).update(
            view_count=F("view_count") + 1,
            read_count=F("read_count") + 1,
        )
        return Response({
            "success": True,
            "data": NewsAnnouncementSerializer(news, context={"request": request}).data,
        })


class NewsSaveView(APIView):
    """
    POST /api/news/save/
    Body: { "article_id": "<uuid>", "save_type": "saved" }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        article_id = request.data.get("article_id")
        save_type  = request.data.get("save_type", "saved")

        if save_type not in ("saved", "saved_for_later"):
            return Response(
                {"success": False, "error": {"message": "Invalid save_type."}},
                status=400,
            )
        try:
            article = NewsAnnouncement.objects.get(pk=article_id, is_active=True)
        except NewsAnnouncement.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Article not found."}},
                status=404,
            )

        obj, created = SavedNews.objects.update_or_create(
            student=request.user,
            article=article,
            defaults={"save_type": save_type},
        )
        return Response({
            "success": True,
            "data": {"save_type": obj.save_type, "saved_at": obj.saved_at},
            "message": "Saved." if created else "Updated.",
        }, status=201 if created else 200)


class NewsUnsaveView(APIView):
    """DELETE /api/news/<id>/unsave/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        deleted, _ = SavedNews.objects.filter(student=request.user, article_id=pk).delete()
        if not deleted:
            return Response(
                {"success": False, "error": {"message": "Not saved."}}, status=404
            )
        return Response({"success": True, "message": "Removed from saved."})


class NewsSavedListView(generics.ListAPIView):
    """GET /api/news/saved/ — user's saved articles."""
    permission_classes = [IsAuthenticated]
    serializer_class   = SavedNewsSerializer

    def get_queryset(self):
        save_type = self.request.query_params.get("save_type", "")
        qs = SavedNews.objects.filter(
            student=self.request.user,
            article__is_active=True,
        ).select_related("article", "article__created_by")
        if save_type in ("saved", "saved_for_later"):
            qs = qs.filter(save_type=save_type)
        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


# ── Admin-only views ──────────────────────────────────────────────────────────

class NewsCreateView(APIView):
    """POST /api/news/create — create article (admin only)."""
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        s = NewsCreateUpdateSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        news = s.save(created_by=request.user)
        logger.info("News created: %s by %s", news.title, request.user.email)
        try:
            from apps.notifications.tasks import send_news_notification
            send_news_notification(str(news.id))
        except Exception:
            pass
        return Response({
            "success": True,
            "data": NewsAnnouncementSerializer(news, context={"request": request}).data,
            "message": "Article created.",
        }, status=201)


class NewsManageView(APIView):
    """PUT/DELETE /api/news/<id>/manage — update/delete (admin only)."""
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes     = [MultiPartParser, FormParser, JSONParser]

    def _get(self, pk):
        try:
            return NewsAnnouncement.objects.get(pk=pk)
        except NewsAnnouncement.DoesNotExist:
            return None

    def put(self, request, pk):
        news = self._get(pk)
        if not news:
            return Response({"success": False, "error": {"message": "Not found."}}, status=404)
        s = NewsCreateUpdateSerializer(news, data=request.data, partial=True)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        news = s.save()
        return Response({
            "success": True,
            "data": NewsAnnouncementSerializer(news, context={"request": request}).data,
            "message": "Article updated.",
        })

    def delete(self, request, pk):
        news = self._get(pk)
        if not news:
            return Response({"success": False, "error": {"message": "Not found."}}, status=404)
        news.is_active = False
        news.save(update_fields=["is_active"])
        logger.info("News deleted: %s by %s", news.title, request.user.email)
        return Response({"success": True, "message": "Article deleted."})


class NewsPinView(APIView):
    """POST /api/news/<id>/pin — toggle pin (admin only)."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            news = NewsAnnouncement.objects.get(pk=pk)
        except NewsAnnouncement.DoesNotExist:
            return Response({"success": False, "error": {"message": "Not found."}}, status=404)
        news.is_pinned = not news.is_pinned
        news.save(update_fields=["is_pinned"])
        return Response({
            "success": True,
            "data": {"is_pinned": news.is_pinned},
            "message": f"Article {'pinned' if news.is_pinned else 'unpinned'}.",
        })
