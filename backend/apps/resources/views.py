import logging
from django.core.cache import cache
from django.db.models import F, Q, Count
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.throttling import UserRateThrottle
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Resource
from .serializers import ResourceSerializer, ResourceUploadSerializer
from campushub.permissions import IsAdmin

logger = logging.getLogger(__name__)


class UploadThrottle(UserRateThrottle):
    scope = "upload"

COUNTS_CACHE_KEY = "resource_counts"
COUNTS_CACHE_TTL = 60 * 5  # 5 minutes


def _build_counts(queryset=None):
    """Build year/semester/file_type counts dict."""
    qs = queryset or Resource.objects.filter(is_active=True)

    year_counts = dict(
        qs.values("academic_year")
          .annotate(c=Count("id"))
          .values_list("academic_year", "c")
    )
    sem_counts = dict(
        qs.values("semester")
          .annotate(c=Count("id"))
          .values_list("semester", "c")
    )
    type_counts = dict(
        qs.values("file_type")
          .annotate(c=Count("id"))
          .values_list("file_type", "c")
    )
    return {
        "years":      {str(k): v for k, v in year_counts.items()},
        "semesters":  {str(k): v for k, v in sem_counts.items()},
        "file_types": type_counts,
    }


class ResourceListView(generics.ListAPIView):
    """
    GET /api/resources/
    Filters: academic_year, semester, file_type, search, branch, page
    Students see only their branch first (prioritized), then others.
    Admins see all.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ResourceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["branch", "semester", "academic_year", "file_type"]
    search_fields = ["title", "description", "subject", "tags"]
    ordering_fields = ["created_at", "title", "view_count", "download_count"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = Resource.objects.filter(is_active=True).select_related("uploaded_by")
        user = self.request.user

        # Branch filter: students see their branch prioritized
        branch_param = self.request.query_params.get("branch", "")
        if branch_param:
            qs = qs.filter(branch__iexact=branch_param)
        elif user.role == "student" and user.branch:
            # Annotate to sort student's branch first
            from django.db.models import Case, When, IntegerField
            qs = qs.annotate(
                branch_priority=Case(
                    When(branch__iexact=user.branch, then=0),
                    default=1,
                    output_field=IntegerField(),
                )
            ).order_by("branch_priority", "-created_at")

        return qs

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class ResourceCountsView(APIView):
    """
    GET /api/resources/counts/
    Returns counts by year, semester, file_type.
    Cached for 5 minutes.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Optionally filter by branch
        branch = request.query_params.get("branch", "")
        cache_key = f"{COUNTS_CACHE_KEY}:{branch}" if branch else COUNTS_CACHE_KEY

        cached = cache.get(cache_key)
        if cached:
            return Response({"success": True, "data": cached})

        qs = Resource.objects.filter(is_active=True)
        if branch:
            qs = qs.filter(branch__iexact=branch)

        counts = _build_counts(qs)
        cache.set(cache_key, counts, COUNTS_CACHE_TTL)
        return Response({"success": True, "data": counts})


class ResourceDetailView(APIView):
    """GET /api/resources/<id>/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            r = Resource.objects.get(pk=pk, is_active=True)
        except Resource.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Not found."}}, status=404
            )
        Resource.objects.filter(pk=pk).update(view_count=F("view_count") + 1)
        return Response({
            "success": True,
            "data": ResourceSerializer(r, context={"request": request}).data,
        })


class ResourceDownloadView(APIView):
    """GET /api/resources/<id>/download/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            resource = Resource.objects.get(pk=pk, is_active=True)
        except Resource.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Not found."}}, status=404
            )
        if not resource.file and not resource.external_url:
            return Response(
                {"success": False, "error": {"message": "No file attached."}}, status=404
            )
        Resource.objects.filter(pk=pk).update(download_count=F("download_count") + 1)
        # Invalidate counts cache
        cache.delete(COUNTS_CACHE_KEY)

        # Track download activity
        try:
            from apps.audit.utils import log_resource_download
            log_resource_download(request, pk, resource.title)
        except Exception:
            pass

        if resource.file:
            file_url = request.build_absolute_uri(resource.file.url)
        else:
            file_url = resource.external_url

        return Response({
            "success": True,
            "data": {
                "download_url": file_url,
                "file_name": resource.file_name or resource.title,
                "preview_supported": resource.preview_supported,
            },
        })


class ResourcePreviewView(APIView):
    """GET /api/resources/<id>/preview/"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            resource = Resource.objects.get(pk=pk, is_active=True)
        except Resource.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Not found."}}, status=404
            )
        if not resource.preview_supported:
            return Response(
                {"success": False, "error": {"message": "Preview not supported."}},
                status=400,
            )
        if resource.file:
            preview_url = request.build_absolute_uri(resource.file.url)
        elif resource.external_url:
            preview_url = resource.external_url
        else:
            return Response(
                {"success": False, "error": {"message": "No file available."}}, status=404
            )
        return Response({"success": True, "data": {"preview_url": preview_url}})


# ── Admin-only views ──────────────────────────────────────────────────────────

class ResourceUploadView(APIView):
    """POST /api/resources/upload"""
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    throttle_classes = [UploadThrottle]

    def post(self, request):
        s = ResourceUploadSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        resource = s.save(uploaded_by=request.user)

        # Invalidate counts cache
        cache.delete(COUNTS_CACHE_KEY)

        try:
            from apps.notifications.tasks import send_resource_notification
            send_resource_notification(str(resource.id))
        except Exception:
            pass

        try:
            from apps.audit.utils import log_action
            log_action(
                request, "resource_upload",
                f"Uploaded '{resource.title}'", "Resource", str(resource.id)
            )
        except Exception:
            pass

        return Response({
            "success": True,
            "data": ResourceSerializer(resource, context={"request": request}).data,
            "message": "Resource uploaded successfully.",
        }, status=201)


class ResourceManageView(APIView):
    """PUT/DELETE /api/resources/<id>/manage"""
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get(self, pk):
        try:
            return Resource.objects.get(pk=pk)
        except Resource.DoesNotExist:
            return None

    def put(self, request, pk):
        r = self._get(pk)
        if not r:
            return Response(
                {"success": False, "error": {"message": "Not found."}}, status=404
            )
        s = ResourceUploadSerializer(r, data=request.data, partial=True)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        r = s.save()
        cache.delete(COUNTS_CACHE_KEY)
        try:
            from apps.audit.utils import log_action
            log_action(request, "resource_edit", f"Edited '{r.title}'", "Resource", str(pk))
        except Exception:
            pass
        return Response({
            "success": True,
            "data": ResourceSerializer(r, context={"request": request}).data,
        })

    def delete(self, request, pk):
        r = self._get(pk)
        if not r:
            return Response(
                {"success": False, "error": {"message": "Not found."}}, status=404
            )
        title = r.title
        r.is_active = False
        r.save(update_fields=["is_active"])
        cache.delete(COUNTS_CACHE_KEY)
        try:
            from apps.audit.utils import log_action
            log_action(request, "resource_delete", f"Deleted '{title}'", "Resource", str(pk))
        except Exception:
            pass
        return Response({"success": True, "message": "Resource deleted."})


class ResourceToggleActiveView(APIView):
    """POST /api/resources/<id>/toggle-active"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            r = Resource.objects.get(pk=pk)
        except Resource.DoesNotExist:
            return Response(
                {"success": False, "error": {"message": "Not found."}}, status=404
            )
        r.is_active = not r.is_active
        r.save(update_fields=["is_active"])
        cache.delete(COUNTS_CACHE_KEY)
        return Response({
            "success": True,
            "data": {"is_active": r.is_active},
            "message": f"Resource {'activated' if r.is_active else 'deactivated'}.",
        })
