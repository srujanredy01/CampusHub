"""
Saved Content service — handles save/unsave operations and pushes real-time
updates via WebSocket channel layer. All functions are safe (never raise)
for use in views and signals.
"""
import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Count

from .models import SavedItem
from .serializers import SavedItemSerializer

logger = logging.getLogger(__name__)


def _get_channel_layer():
    """Get channel layer, returns None if not configured."""
    try:
        return get_channel_layer()
    except Exception:
        return None


def get_user_saved_counts(user):
    """Get saved item counts by content type for a user."""
    counts_qs = (
        SavedItem.objects.filter(user=user)
        .values("content_type")
        .annotate(count=Count("id"))
    )
    counts = {item["content_type"]: item["count"] for item in counts_qs}
    counts["total"] = sum(counts.values())
    return counts


def push_saved_item_added(user, saved_item):
    """
    Push a 'saved_item_added' event to the user's WebSocket group.
    Called after a new SavedItem is created.
    """
    try:
        channel_layer = _get_channel_layer()
        if not channel_layer:
            return

        group_name = f"user_saved_{user.id}"
        counts = get_user_saved_counts(user)

        serialized = SavedItemSerializer(saved_item).data

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "saved_item_added",
                "item": serialized,
                "counts": counts,
            },
        )
    except Exception as e:
        logger.debug("WebSocket push saved_item_added failed: %s", e)


def push_saved_item_removed(user, item_id, content_type, object_id):
    """
    Push a 'saved_item_removed' event to the user's WebSocket group.
    Called after a SavedItem is deleted.
    """
    try:
        channel_layer = _get_channel_layer()
        if not channel_layer:
            return

        group_name = f"user_saved_{user.id}"
        counts = get_user_saved_counts(user)

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "saved_item_removed",
                "item_id": str(item_id),
                "content_type": content_type,
                "object_id": str(object_id),
                "counts": counts,
            },
        )
    except Exception as e:
        logger.debug("WebSocket push saved_item_removed failed: %s", e)
