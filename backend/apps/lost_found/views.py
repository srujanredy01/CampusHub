"""
Lost & Found views for CampusHub.
Students can post lost/found items, claim them, flag inappropriate posts.
"""
import logging
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import LostFoundItem
from .serializers import LostFoundItemSerializer, LostFoundCreateSerializer
from campushub.permissions import IsAdmin

logger = logging.getLogger(__name__)


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    r = {"success": True, "message": message}
    if data is not None:
        r["data"] = data
    return Response(r, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": {"message": message}}, status=code)


class LostFoundListView(generics.ListAPIView):
    """GET /api/lost-found/ — list all active, non-flagged items."""
    permission_classes = [IsAuthenticated]
    serializer_class = LostFoundItemSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "status"]
    search_fields = ["item_name", "description", "location"]
    ordering_fields = ["created_at", "date_lost_found"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return LostFoundItem.objects.filter(
            is_active=True, is_flagged=False
        ).select_related("posted_by")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class LostFoundCreateView(APIView):
    """POST /api/lost-found/create — post a lost/found item."""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        s = LostFoundCreateSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        item = s.save(posted_by=request.user)
        logger.info("Lost/Found item created: %s by %s", item.item_name, request.user.email)
        return ok(
            LostFoundItemSerializer(item, context={"request": request}).data,
            "Item posted successfully.",
            201,
        )


class LostFoundDetailView(APIView):
    """GET/PUT/DELETE /api/lost-found/<uuid:pk>"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def _get(self, pk):
        try:
            return LostFoundItem.objects.get(pk=pk, is_active=True)
        except LostFoundItem.DoesNotExist:
            return None

    def get(self, request, pk):
        item = self._get(pk)
        if not item:
            return err("Item not found.", 404)
        return ok(LostFoundItemSerializer(item, context={"request": request}).data)

    def put(self, request, pk):
        item = self._get(pk)
        if not item:
            return err("Item not found.", 404)
        # Only the poster or admin can edit
        if item.posted_by != request.user and request.user.role != "admin":
            return err("You can only edit your own posts.", 403)
        s = LostFoundCreateSerializer(item, data=request.data, partial=True)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        s.save()
        return ok(
            LostFoundItemSerializer(item, context={"request": request}).data,
            "Item updated.",
        )

    def delete(self, request, pk):
        item = self._get(pk)
        if not item:
            return err("Item not found.", 404)
        if item.posted_by != request.user and request.user.role != "admin":
            return err("You can only delete your own posts.", 403)
        item.is_active = False
        item.save(update_fields=["is_active"])
        return ok(message="Item deleted.")


class LostFoundClaimView(APIView):
    """POST /api/lost-found/<uuid:pk>/claim — claim a found item."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            item = LostFoundItem.objects.get(pk=pk, is_active=True)
        except LostFoundItem.DoesNotExist:
            return err("Item not found.", 404)

        if item.status == "claimed":
            return err("This item has already been claimed.")
        if item.status == "closed":
            return err("This item has been closed.")
        if item.posted_by == request.user:
            return err("You cannot claim your own post.")

        item.claimed_by = request.user
        item.status = "claimed"
        item.save(update_fields=["claimed_by", "status", "updated_at"])

        # Notify the poster
        try:
            from apps.notifications.services import create_user_notification
            create_user_notification(
                item.posted_by,
                "system",
                f"Item Claimed: {item.item_name}",
                f"{request.user.full_name} has claimed your {item.get_status_display()} item '{item.item_name}'.",
                metadata={"item_id": str(item.id)},
            )
        except Exception:
            pass

        return ok(
            LostFoundItemSerializer(item, context={"request": request}).data,
            "Item claimed successfully.",
        )


class LostFoundResolveView(APIView):
    """POST /api/lost-found/<uuid:pk>/resolve — mark item as resolved/closed."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            item = LostFoundItem.objects.get(pk=pk, is_active=True)
        except LostFoundItem.DoesNotExist:
            return err("Item not found.", 404)

        # Only the poster or admin can resolve
        if item.posted_by != request.user and request.user.role != "admin":
            return err("Only the poster or admin can resolve this item.", 403)

        item.status = "closed"
        item.resolved_at = timezone.now()
        item.save(update_fields=["status", "resolved_at", "updated_at"])

        return ok(
            LostFoundItemSerializer(item, context={"request": request}).data,
            "Item resolved and closed.",
        )


class LostFoundFlagView(APIView):
    """POST /api/lost-found/<uuid:pk>/flag — flag an inappropriate item."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            item = LostFoundItem.objects.get(pk=pk, is_active=True)
        except LostFoundItem.DoesNotExist:
            return err("Item not found.", 404)

        reason = request.data.get("reason", "").strip()
        if not reason:
            return err("Reason is required for flagging.")

        item.is_flagged = True
        item.flag_reason = reason
        item.flagged_by = request.user
        item.save(update_fields=["is_flagged", "flag_reason", "flagged_by", "updated_at"])

        logger.info("Item flagged: %s by %s — reason: %s", item.item_name, request.user.email, reason)
        return ok(message="Item flagged for review.")


class MyLostFoundView(APIView):
    """GET /api/lost-found/my — user's own posts."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = LostFoundItem.objects.filter(
            posted_by=request.user, is_active=True
        ).order_by("-created_at")
        data = LostFoundItemSerializer(items, many=True, context={"request": request}).data
        return ok(data)


# ── Admin Views ────────────────────────────────────────────────────────────────

class AdminLostFoundListView(generics.ListAPIView):
    """GET /api/admin/lost-found — all items including flagged."""
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = LostFoundItemSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["category", "status", "is_flagged", "is_active"]
    search_fields = ["item_name", "description", "location"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return LostFoundItem.objects.all().select_related("posted_by", "flagged_by", "claimed_by")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class AdminLostFoundRemoveView(APIView):
    """DELETE /api/admin/lost-found/<uuid:pk> — admin remove/unflag item."""
    permission_classes = [IsAuthenticated, IsAdmin]

    def delete(self, request, pk):
        try:
            item = LostFoundItem.objects.get(pk=pk)
        except LostFoundItem.DoesNotExist:
            return err("Item not found.", 404)
        item.is_active = False
        item.save(update_fields=["is_active"])
        logger.info("Admin removed lost/found item: %s", item.item_name)
        return ok(message="Item removed.")

    def post(self, request, pk):
        """POST to unflag an item."""
        try:
            item = LostFoundItem.objects.get(pk=pk)
        except LostFoundItem.DoesNotExist:
            return err("Item not found.", 404)
        item.is_flagged = False
        item.flag_reason = ""
        item.flagged_by = None
        item.save(update_fields=["is_flagged", "flag_reason", "flagged_by", "updated_at"])
        return ok(message="Item unflagged.")
