"""
Saved Content API views with real-time WebSocket integration.
All save/unsave operations push instant updates via channel layer.

IMPORTANT: This aggregates saved items from BOTH the unified SavedItem table
AND module-specific save tables (SavedNews, SavedQuestion) to provide a
complete view of all saved content.
"""
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SavedItem
from .serializers import SavedItemSerializer, SavedItemCreateSerializer
from .services import push_saved_item_added, push_saved_item_removed, get_user_saved_counts


def _get_all_saved_items(user):
    """
    Aggregate saved items from all sources:
    - Unified SavedItem table
    - SavedNews (news module)
    - SavedQuestion (coding module)
    Returns a list of dicts in a unified format.
    """
    items = []

    # 1. Unified SavedItem entries
    for item in SavedItem.objects.filter(user=user).order_by("-saved_at"):
        items.append({
            "id": str(item.id),
            "content_type": item.content_type,
            "object_id": str(item.object_id),
            "saved_at": item.saved_at.isoformat(),
            "metadata": item.metadata,
            "content_detail": None,  # Will be resolved below
            "_source": "unified",
            "_obj": item,
        })

    # 2. SavedNews entries
    try:
        from apps.news.models import SavedNews
        for sn in SavedNews.objects.filter(student=user).select_related("article").order_by("-saved_at"):
            # Skip if already in unified table
            if any(i["content_type"] == "news_article" and i["object_id"] == str(sn.article_id) for i in items):
                continue
            article = sn.article
            items.append({
                "id": f"news_{sn.id}",
                "content_type": "news_article",
                "object_id": str(sn.article_id),
                "saved_at": sn.saved_at.isoformat(),
                "metadata": {"save_type": sn.save_type},
                "content_detail": {
                    "id": str(article.id),
                    "title": article.title,
                    "short_description": getattr(article, "short_description", ""),
                    "category": article.category,
                    "priority": article.priority,
                    "created_at": article.created_at.isoformat(),
                    "slug": getattr(article, "slug", ""),
                } if article else None,
                "_source": "news",
            })
    except Exception:
        pass

    # 3. SavedQuestion entries
    try:
        from apps.coding.models import SavedQuestion
        for sq in SavedQuestion.objects.filter(user=user).select_related("question").order_by("-created_at"):
            # Skip if already in unified table
            if any(i["content_type"] == "coding_problem" and i["object_id"] == str(sq.question_id) for i in items):
                continue
            q = sq.question
            items.append({
                "id": f"coding_{sq.id}",
                "content_type": "coding_problem",
                "object_id": str(sq.question_id),
                "saved_at": sq.created_at.isoformat(),
                "metadata": {},
                "content_detail": {
                    "id": str(q.id),
                    "title": q.title,
                    "difficulty": q.difficulty,
                    "topic": q.topic,
                    "topic_tags": getattr(q, "topic_tags", []),
                    "slug": getattr(q, "slug", ""),
                    "acceptance_rate": getattr(q, "acceptance_rate", 0),
                } if q else None,
                "_source": "coding",
            })
    except Exception:
        pass

    # Resolve content_detail for unified items that don't have it yet
    for item in items:
        if item.get("_source") == "unified" and item["content_detail"] is None:
            obj = item.get("_obj")
            if obj:
                item["content_detail"] = SavedItemSerializer().get_content_detail(obj)

    # Clean up internal fields
    for item in items:
        item.pop("_source", None)
        item.pop("_obj", None)

    # Sort by saved_at descending
    items.sort(key=lambda x: x["saved_at"], reverse=True)
    return items


def _get_aggregated_counts(user):
    """Get saved counts from all sources."""
    counts = {"coding_problem": 0, "news_article": 0, "resource": 0, "assignment": 0, "contest": 0, "roadmap": 0}

    # Unified table counts
    from django.db.models import Count
    for row in SavedItem.objects.filter(user=user).values("content_type").annotate(count=Count("id")):
        counts[row["content_type"]] = row["count"]

    # News-specific saves
    try:
        from apps.news.models import SavedNews
        news_count = SavedNews.objects.filter(student=user).count()
        # Only add news that aren't already in unified table
        unified_news = SavedItem.objects.filter(user=user, content_type="news_article").count()
        counts["news_article"] = max(counts["news_article"], news_count)
    except Exception:
        pass

    # Coding-specific saves
    try:
        from apps.coding.models import SavedQuestion
        coding_count = SavedQuestion.objects.filter(user=user).count()
        unified_coding = SavedItem.objects.filter(user=user, content_type="coding_problem").count()
        counts["coding_problem"] = max(counts["coding_problem"], coding_count)
    except Exception:
        pass

    counts["total"] = sum(counts.values())
    return counts


class SavedItemListView(APIView):
    """
    GET /api/saved/list — List all saved items for the authenticated user.
    Aggregates from unified SavedItem + module-specific tables (SavedNews, SavedQuestion).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = _get_all_saved_items(request.user)

        # Optional content_type filter
        content_type = request.query_params.get("content_type")
        if content_type:
            items = [i for i in items if i["content_type"] == content_type]

        return Response({
            "success": True,
            "data": items,
        })


class SavedCodingListView(APIView):
    """
    GET /api/saved/coding — List saved coding problems from all sources.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = _get_all_saved_items(request.user)
        data = [i for i in items if i["content_type"] == "coding_problem"]

        search = request.query_params.get("search", "").strip()
        difficulty = request.query_params.get("difficulty", "").strip()
        topic = request.query_params.get("topic", "").strip()

        if search:
            search_lower = search.lower()
            data = [item for item in data if item.get("content_detail") and
                    search_lower in item["content_detail"].get("title", "").lower()]
        if difficulty:
            data = [item for item in data if item.get("content_detail") and
                    item["content_detail"].get("difficulty") == difficulty]
        if topic:
            data = [item for item in data if item.get("content_detail") and
                    item["content_detail"].get("topic") == topic]

        return Response({"success": True, "data": data})


class SavedNewsListView(APIView):
    """
    GET /api/saved/news — List saved news articles from all sources.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = _get_all_saved_items(request.user)
        data = [i for i in items if i["content_type"] == "news_article"]

        search = request.query_params.get("search", "").strip()
        if search:
            search_lower = search.lower()
            data = [item for item in data if item.get("content_detail") and
                    search_lower in item["content_detail"].get("title", "").lower()]

        return Response({"success": True, "data": data})


class SavedResourcesListView(APIView):
    """
    GET /api/saved/resources — List saved resources.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = _get_all_saved_items(request.user)
        data = [i for i in items if i["content_type"] == "resource"]

        search = request.query_params.get("search", "").strip()
        file_type = request.query_params.get("file_type", "").strip()
        semester = request.query_params.get("semester", "").strip()

        if search:
            search_lower = search.lower()
            data = [item for item in data if item.get("content_detail") and
                    search_lower in item["content_detail"].get("title", "").lower()]
        if file_type:
            data = [item for item in data if item.get("content_detail") and
                    item["content_detail"].get("file_type") == file_type]
        if semester:
            data = [item for item in data if item.get("content_detail") and
                    str(item["content_detail"].get("semester")) == semester]

        return Response({"success": True, "data": data})


class SavedAssignmentsListView(APIView):
    """
    GET /api/saved/assignments — List saved assignments.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = _get_all_saved_items(request.user)
        data = [i for i in items if i["content_type"] == "assignment"]

        search = request.query_params.get("search", "").strip()
        if search:
            search_lower = search.lower()
            data = [item for item in data if item.get("content_detail") and
                    search_lower in item["content_detail"].get("title", "").lower()]

        return Response({"success": True, "data": data})


class SavedContestsListView(APIView):
    """
    GET /api/saved/contests — List saved contests.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = _get_all_saved_items(request.user)
        data = [i for i in items if i["content_type"] == "contest"]

        search = request.query_params.get("search", "").strip()
        if search:
            search_lower = search.lower()
            data = [item for item in data if item.get("content_detail") and
                    search_lower in item["content_detail"].get("title", "").lower()]

        return Response({"success": True, "data": data})


class SavedRoadmapsListView(APIView):
    """
    GET /api/saved/roadmaps — List saved roadmaps.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        items = _get_all_saved_items(request.user)
        data = [i for i in items if i["content_type"] == "roadmap"]

        search = request.query_params.get("search", "").strip()
        if search:
            search_lower = search.lower()
            data = [item for item in data if item.get("content_detail") and
                    search_lower in item["content_detail"].get("title", "").lower()]

        return Response({"success": True, "data": data})


class SavedItemCreateView(APIView):
    """
    POST /api/saved/ — Save a content item.
    Body: { "object_id": "<uuid>", "content_type": "coding_problem|news_article|resource|assignment|contest|roadmap" }
    Pushes real-time WebSocket event on success.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SavedItemCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "error": {"message": "Validation failed."}, "errors": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        obj, created = SavedItem.objects.get_or_create(
            user=request.user,
            content_type=serializer.validated_data["content_type"],
            object_id=serializer.validated_data["object_id"],
        )

        if not created:
            return Response(
                {"success": False, "error": {"message": "Item already saved."}},
                status=status.HTTP_409_CONFLICT,
            )

        # Push real-time update via WebSocket
        push_saved_item_added(request.user, obj)

        return Response(
            {
                "success": True,
                "data": SavedItemSerializer(obj).data,
                "message": "Item saved successfully.",
            },
            status=status.HTTP_201_CREATED,
        )


class SavedItemDeleteView(APIView):
    """
    DELETE /api/saved/<id>/ — Remove a saved item.
    Handles both unified IDs (UUID) and composite IDs (news_<uuid>, coding_<uuid>).
    Pushes real-time WebSocket event on success.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        # Try unified table first
        item = SavedItem.objects.filter(pk=pk, user=request.user).first()
        if item:
            item_id = item.id
            content_type = item.content_type
            object_id = item.object_id
            item.delete()
            push_saved_item_removed(request.user, item_id, content_type, object_id)
            return Response({"success": True, "message": "Item removed from saved."})

        return Response(
            {"success": False, "error": {"message": "Saved item not found."}},
            status=status.HTTP_404_NOT_FOUND,
        )


class SavedItemUnsaveByObjectView(APIView):
    """
    DELETE /api/saved/unsave — Remove a saved item by content_type + object_id.
    Body: { "content_type": "...", "object_id": "..." }
    Checks both unified table and module-specific tables.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        content_type = request.data.get("content_type")
        object_id = request.data.get("object_id")

        if not content_type or not object_id:
            return Response(
                {"success": False, "error": {"message": "content_type and object_id required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        removed = False

        # Try unified table
        item = SavedItem.objects.filter(
            user=request.user,
            content_type=content_type,
            object_id=object_id,
        ).first()

        if item:
            item_id = item.id
            item.delete()
            push_saved_item_removed(request.user, item_id, content_type, object_id)
            removed = True

        # Also try module-specific tables
        if content_type == "news_article":
            try:
                from apps.news.models import SavedNews
                deleted, _ = SavedNews.objects.filter(student=request.user, article_id=object_id).delete()
                if deleted:
                    removed = True
            except Exception:
                pass
        elif content_type == "coding_problem":
            try:
                from apps.coding.models import SavedQuestion
                deleted, _ = SavedQuestion.objects.filter(user=request.user, question_id=object_id).delete()
                if deleted:
                    removed = True
            except Exception:
                pass

        if not removed:
            return Response(
                {"success": False, "error": {"message": "Saved item not found."}},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"success": True, "message": "Item removed from saved."})


class SavedItemCheckView(APIView):
    """
    GET /api/saved/check?content_type=...&object_id=...
    Check if an item is saved by the current user.
    Checks both unified table and module-specific tables.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        content_type = request.query_params.get("content_type")
        object_id = request.query_params.get("object_id")

        if not content_type or not object_id:
            return Response(
                {"success": False, "error": {"message": "content_type and object_id required."}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check unified table first
        item = SavedItem.objects.filter(
            user=request.user,
            content_type=content_type,
            object_id=object_id,
        ).first()

        if item:
            return Response({
                "success": True,
                "data": {
                    "is_saved": True,
                    "saved_item_id": str(item.id),
                },
            })

        # Check module-specific tables
        is_saved = False
        saved_item_id = None

        if content_type == "news_article":
            try:
                from apps.news.models import SavedNews
                sn = SavedNews.objects.filter(student=request.user, article_id=object_id).first()
                if sn:
                    is_saved = True
                    saved_item_id = f"news_{sn.id}"
            except Exception:
                pass
        elif content_type == "coding_problem":
            try:
                from apps.coding.models import SavedQuestion
                sq = SavedQuestion.objects.filter(user=request.user, question_id=object_id).first()
                if sq:
                    is_saved = True
                    saved_item_id = f"coding_{sq.id}"
            except Exception:
                pass

        return Response({
            "success": True,
            "data": {
                "is_saved": is_saved,
                "saved_item_id": saved_item_id,
            },
        })


class SavedCountsView(APIView):
    """
    GET /api/saved/counts — Get saved item counts by type.
    Aggregates from all save sources.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        counts = _get_aggregated_counts(request.user)
        return Response({
            "success": True,
            "data": counts,
        })
