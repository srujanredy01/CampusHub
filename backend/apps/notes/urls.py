from django.urls import path
from .views import NoteViewSet

urlpatterns = [
    # Backward-compatible existing endpoints
    path("", NoteViewSet.as_view({"get": "list", "post": "create"}), name="note-list"),
    path("upload", NoteViewSet.as_view({"post": "upload"}), name="note-upload"),
    path("bookmarks", NoteViewSet.as_view({"get": "bookmarks"}), name="note-bookmarks"),
    path("mine", NoteViewSet.as_view({"get": "mine"}), name="note-mine"),
    path("<uuid:pk>", NoteViewSet.as_view({"get": "retrieve"}), name="note-detail"),
    path("<uuid:pk>/download", NoteViewSet.as_view({"get": "download"}), name="note-download"),
    path("<uuid:pk>/vote", NoteViewSet.as_view({"post": "vote"}), name="note-vote"),
    path("<uuid:pk>/bookmark", NoteViewSet.as_view({"post": "bookmark"}), name="note-bookmark"),
    path("<uuid:pk>/rate", NoteViewSet.as_view({"post": "rate"}), name="note-rate"),
]

