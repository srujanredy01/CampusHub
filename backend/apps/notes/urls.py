from django.urls import path
from .views import NoteViewSet

urlpatterns = [
    # Backward-compatible existing endpoints
    path("", NoteViewSet.as_view({"get": "list", "post": "create"}), name="note-list"),
    path("upload", NoteViewSet.as_view({"post": "upload"}), name="note-upload"),
    path("bookmarks", NoteViewSet.as_view({"get": "bookmarks"}), name="note-bookmarks"),
    path("mine", NoteViewSet.as_view({"get": "mine"}), name="note-mine"),
    path("shared-with-me", NoteViewSet.as_view({"get": "shared_with_me"}), name="note-shared-with-me"),
    path("<uuid:pk>", NoteViewSet.as_view({"get": "retrieve", "delete": "destroy"}), name="note-detail"),
    path("<uuid:pk>/download", NoteViewSet.as_view({"get": "download"}), name="note-download"),
    path("<uuid:pk>/vote", NoteViewSet.as_view({"post": "vote"}), name="note-vote"),
    path("<uuid:pk>/bookmark", NoteViewSet.as_view({"post": "bookmark"}), name="note-bookmark"),
    path("<uuid:pk>/rate", NoteViewSet.as_view({"post": "rate"}), name="note-rate"),
    path("<uuid:pk>/comments", NoteViewSet.as_view({"get": "comments", "post": "add_comment"}), name="note-comments"),
    path("<uuid:pk>/comments/<uuid:comment_id>", NoteViewSet.as_view({"delete": "delete_comment"}), name="note-comment-delete"),
    path("<uuid:pk>/share", NoteViewSet.as_view({"post": "share"}), name="note-share"),
    path("<uuid:pk>/report", NoteViewSet.as_view({"post": "report_note"}), name="note-report"),
]
