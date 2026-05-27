import logging
from django.db.models import F
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from campushub.permissions import IsAdmin
from .models import Note, NoteBookmark, NoteRating, NoteVote, NoteComment, NoteShare, NoteReport
from .serializers import NoteSerializer, NoteUploadSerializer

logger = logging.getLogger(__name__)


def _ok(data=None, message="Success", code=status.HTTP_200_OK):
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    return Response(payload, status=code)


def _err(message, code=status.HTTP_400_BAD_REQUEST, errors=None):
    payload = {"success": False, "error": {"message": message}}
    if errors:
        payload["errors"] = errors
    return Response(payload, status=code)


class NoteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NoteSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["branch", "semester", "file_type"]
    search_fields = ["title", "description", "subject", "tags"]
    ordering_fields = ["created_at", "download_count", "upvotes", "view_count", "average_rating"]
    ordering = ["-created_at"]

    def get_queryset(self):
        base_qs = Note.objects.select_related("uploaded_by").all()
        if self.action in {"mine"}:
            return base_qs.filter(uploaded_by=self.request.user).order_by("-created_at")
        if self.action in {"bookmarks"}:
            bookmarked_ids = NoteBookmark.objects.filter(user=self.request.user).values_list("note_id", flat=True)
            return base_qs.filter(pk__in=bookmarked_ids, status="approved", is_active=True).order_by("-created_at")

        qs = base_qs.filter(status="approved", is_active=True)
        params = self.request.query_params
        if params.get("subject"):
            qs = qs.filter(subject__icontains=params["subject"])
        if params.get("tag"):
            qs = qs.filter(tags__icontains=params["tag"])
        if params.get("uploader"):
            qs = qs.filter(uploaded_by__id=params["uploader"])
        sort = params.get("sort", "")
        if sort == "highest_rated":
            return qs.order_by("-average_rating", "-rating_count")
        if sort == "most_downloaded":
            return qs.order_by("-download_count")
        if sort == "recent_uploads":
            return qs.order_by("-created_at")
        if sort == "trending":
            # Compute trending score in DB using annotation to avoid loading all rows
            from django.db.models import ExpressionWrapper, FloatField, F
            from django.db.models.functions import Greatest
            qs = qs.annotate(
                trending_score_db=ExpressionWrapper(
                    (F("upvotes") * 3) + F("download_count") + (F("view_count") * 0.25),
                    output_field=FloatField(),
                )
            ).order_by("-trending_score_db")
            return qs
        return qs

    def get_serializer_class(self):
        if self.action in {"create", "upload"}:
            return NoteUploadSerializer
        return NoteSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = NoteSerializer(page, many=True, context={"request": request})
            return self.get_paginated_response(serializer.data)
        serializer = NoteSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        note = self.get_object()
        if note.status != "approved" or not note.is_active:
            return _err("Note not found.", status.HTTP_404_NOT_FOUND)
        Note.objects.filter(pk=note.pk).update(view_count=F("view_count") + 1)
        note.refresh_from_db()
        return _ok(NoteSerializer(note, context={"request": request}).data)

    def create(self, request, *args, **kwargs):
        serializer = NoteUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return _err("Validation failed.", errors=serializer.errors)
        note = serializer.save(uploaded_by=request.user)
        logger.info("Note uploaded: %s by %s", note.title, request.user.student_id)
        return _ok(
            NoteSerializer(note, context={"request": request}).data,
            "Note submitted for review.",
            status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["post"], url_path="upload")
    def upload(self, request):
        return self.create(request)

    @action(detail=False, methods=["get"], url_path="bookmarks")
    def bookmarks(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = NoteSerializer(page if page is not None else queryset, many=True, context={"request": request})
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        serializer = NoteSerializer(page if page is not None else queryset, many=True, context={"request": request})
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="download")
    def download(self, request, pk=None):
        note = self.get_object()
        if note.status != "approved" or not note.is_active:
            return _err("Not found.", status.HTTP_404_NOT_FOUND)
        Note.objects.filter(pk=note.pk).update(download_count=F("download_count") + 1)
        note.refresh_from_db()
        url = request.build_absolute_uri(note.file.url) if note.file else None
        return _ok({"download_url": url, "file_name": note.file_name})

    @action(detail=True, methods=["post"], url_path="vote")
    def vote(self, request, pk=None):
        vote_type = request.data.get("vote")
        if vote_type not in {"up", "down"}:
            return _err("vote must be 'up' or 'down'.")
        note = self.get_object()
        if note.status != "approved" or not note.is_active:
            return _err("Not found.", status.HTTP_404_NOT_FOUND)

        existing = NoteVote.objects.filter(note=note, user=request.user).first()
        user_vote = vote_type
        if existing:
            if existing.vote == vote_type:
                existing.delete()
                user_vote = None
                if vote_type == "up":
                    Note.objects.filter(pk=pk).update(upvotes=F("upvotes") - 1)
                else:
                    Note.objects.filter(pk=pk).update(downvotes=F("downvotes") - 1)
            else:
                existing.vote = vote_type
                existing.save(update_fields=["vote"])
                if vote_type == "up":
                    Note.objects.filter(pk=pk).update(upvotes=F("upvotes") + 1, downvotes=F("downvotes") - 1)
                else:
                    Note.objects.filter(pk=pk).update(downvotes=F("downvotes") + 1, upvotes=F("upvotes") - 1)
        else:
            NoteVote.objects.create(note=note, user=request.user, vote=vote_type)
            if vote_type == "up":
                Note.objects.filter(pk=pk).update(upvotes=F("upvotes") + 1)
            else:
                Note.objects.filter(pk=pk).update(downvotes=F("downvotes") + 1)

        note.refresh_from_db()
        return _ok(
            {
                "upvotes": note.upvotes,
                "downvotes": note.downvotes,
                "user_vote": user_vote,
            },
            "Vote updated.",
        )

    @action(detail=True, methods=["post"], url_path="bookmark")
    def bookmark(self, request, pk=None):
        note = self.get_object()
        if note.status != "approved" or not note.is_active:
            return _err("Not found.", status.HTTP_404_NOT_FOUND)
        bookmark, created = NoteBookmark.objects.get_or_create(note=note, user=request.user)
        if not created:
            bookmark.delete()
            return _ok({"is_bookmarked": False}, "Bookmark removed.")
        return _ok({"is_bookmarked": True}, "Bookmarked.")

    @action(detail=True, methods=["post"], url_path="rate")
    def rate(self, request, pk=None):
        try:
            rating_val = int(request.data.get("rating"))
            if rating_val < 1 or rating_val > 5:
                raise ValueError
        except (TypeError, ValueError):
            return _err("rating must be an integer between 1 and 5.")
        note = self.get_object()
        if note.status != "approved" or not note.is_active:
            return _err("Not found.", status.HTTP_404_NOT_FOUND)
        obj, _ = NoteRating.objects.get_or_create(note=note, user=request.user, defaults={"rating": rating_val})
        if obj.rating != rating_val:
            obj.rating = rating_val
            obj.save()
        note.refresh_from_db()
        return _ok(
            {
                "average_rating": str(note.average_rating),
                "rating_count": note.rating_count,
                "user_rating": rating_val,
            },
            "Rating saved.",
        )

    # ── Comments ──────────────────────────────────────────────────────────────

    @action(detail=True, methods=["get"], url_path="comments")
    def comments(self, request, pk=None):
        note = self.get_object()
        if note.status != "approved" or not note.is_active:
            return _err("Not found.", status.HTTP_404_NOT_FOUND)
        comments = NoteComment.objects.filter(note=note, is_deleted=False).select_related("user")
        data = [
            {
                "id": str(c.id),
                "user_id": str(c.user.id),
                "user_name": c.user.full_name,
                "content": c.content,
                "parent_id": str(c.parent_id) if c.parent_id else None,
                "created_at": c.created_at.isoformat(),
            }
            for c in comments
        ]
        return _ok(data)

    @action(detail=True, methods=["post"], url_path="comments")
    def add_comment(self, request, pk=None):
        note = self.get_object()
        if note.status != "approved" or not note.is_active:
            return _err("Not found.", status.HTTP_404_NOT_FOUND)
        content = request.data.get("content", "").strip()
        if not content:
            return _err("Comment content is required.")
        parent_id = request.data.get("parent_id")
        comment = NoteComment.objects.create(
            note=note, user=request.user, content=content,
            parent_id=parent_id if parent_id else None,
        )
        return _ok({
            "id": str(comment.id),
            "user_id": str(request.user.id),
            "user_name": request.user.full_name,
            "content": comment.content,
            "parent_id": str(comment.parent_id) if comment.parent_id else None,
            "created_at": comment.created_at.isoformat(),
        }, "Comment added.", status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="comments/(?P<comment_id>[^/.]+)")
    def delete_comment(self, request, pk=None, comment_id=None):
        note = self.get_object()
        comment = NoteComment.objects.filter(
            id=comment_id, note=note
        ).first()
        if not comment:
            return _err("Comment not found.", status.HTTP_404_NOT_FOUND)
        # Only comment author or admin can delete
        if comment.user != request.user and request.user.role not in ("admin", "super_admin"):
            return _err("Permission denied.", status.HTTP_403_FORBIDDEN)
        comment.is_deleted = True
        comment.content = "[deleted]"
        comment.save(update_fields=["is_deleted", "content"])
        return _ok(message="Comment deleted.")

    # ── Sharing ───────────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="share")
    def share(self, request, pk=None):
        note = self.get_object()
        if note.status != "approved" or not note.is_active:
            return _err("Not found.", status.HTTP_404_NOT_FOUND)
        share_type = request.data.get("share_type", "public")
        shared_with_id = request.data.get("shared_with_id")
        message = request.data.get("message", "")

        shared_with = None
        if share_type == "private" and shared_with_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            shared_with = User.objects.filter(id=shared_with_id).first()
            if not shared_with:
                return _err("User not found.")

        share_obj = NoteShare.objects.create(
            note=note, shared_by=request.user,
            shared_with=shared_with, share_type=share_type,
            message=message,
        )

        # Send notification to recipient
        if shared_with:
            try:
                from apps.notifications.services import create_user_notification
                create_user_notification(
                    shared_with, "new_resource",
                    f"Note shared: {note.title}",
                    f"{request.user.full_name} shared a note with you",
                    metadata={"note_id": str(note.id), "share_id": str(share_obj.id)},
                )
            except Exception:
                pass

        return _ok({
            "share_link": share_obj.share_link,
            "share_type": share_obj.share_type,
        }, "Note shared.")

    @action(detail=False, methods=["get"], url_path="shared-with-me")
    def shared_with_me(self, request):
        shares = NoteShare.objects.filter(
            shared_with=request.user
        ).select_related("note", "shared_by").order_by("-created_at")[:50]
        data = [
            {
                "id": str(s.id),
                "note_id": str(s.note.id),
                "note_title": s.note.title,
                "note_subject": s.note.subject,
                "shared_by_name": s.shared_by.full_name,
                "message": s.message,
                "share_link": s.share_link,
                "created_at": s.created_at.isoformat(),
            }
            for s in shares
        ]
        return _ok(data)

    # ── Report ────────────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="report")
    def report_note(self, request, pk=None):
        note = self.get_object()
        reason = request.data.get("reason", "other")
        description = request.data.get("description", "")
        if NoteReport.objects.filter(note=note, reporter=request.user).exists():
            return _err("You have already reported this note.")
        NoteReport.objects.create(
            note=note, reporter=request.user,
            reason=reason, description=description,
        )
        return _ok(message="Report submitted. Our team will review it.")

    # ── Delete own note ───────────────────────────────────────────────────────

    @action(detail=True, methods=["delete"])
    def destroy(self, request, pk=None):
        note = self.get_object()
        if note.uploaded_by != request.user and request.user.role not in ("admin", "super_admin"):
            return _err("Permission denied.", status.HTTP_403_FORBIDDEN)
        note.is_active = False
        note.save(update_fields=["is_active"])
        return _ok(message="Note deleted.")


class AdminNoteViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated, IsAdmin]
    serializer_class = NoteSerializer
    queryset = Note.objects.all().select_related("uploaded_by")
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["status", "branch", "semester", "file_type"]
    search_fields = ["title", "subject", "uploaded_by__full_name"]
    ordering = ["-created_at"]

    def list(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = NoteSerializer(page if page is not None else queryset, many=True, context={"request": request})
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="moderate")
    def moderate(self, request, pk=None):
        action = request.data.get("action")
        if action not in {"approve", "reject"}:
            return _err("action must be 'approve' or 'reject'.")
        note = self.get_object()
        note.status = "approved" if action == "approve" else "rejected"
        note.rejection_reason = "" if action == "approve" else (request.data.get("reason", "") or "")
        note.moderated_by = request.user
        note.moderated_at = timezone.now()
        note.save(update_fields=["status", "rejection_reason", "moderated_by", "moderated_at"])
        return _ok(message=f"Note {action}d.")

    def destroy(self, request, pk=None):
        note = self.get_object()
        note.is_active = False
        note.save(update_fields=["is_active"])
        return _ok(message="Note removed.")

