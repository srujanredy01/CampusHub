from django.urls import path
from .views import StudyGroupViewSet

urlpatterns = [
    path("", StudyGroupViewSet.as_view({"get": "list"}), name="group-list"),
    path("create", StudyGroupViewSet.as_view({"post": "create"}), name="group-create"),
    path("mine", StudyGroupViewSet.as_view({"get": "mine"}), name="group-mine"),
    path("<uuid:pk>", StudyGroupViewSet.as_view({"get": "retrieve"}), name="group-detail"),
    path("<uuid:pk>/join", StudyGroupViewSet.as_view({"post": "join"}), name="group-join"),
    path("<uuid:pk>/leave", StudyGroupViewSet.as_view({"post": "leave"}), name="group-leave"),
    path("<uuid:pk>/members", StudyGroupViewSet.as_view({"get": "members"}), name="group-members"),
    path("<uuid:pk>/members/<uuid:user_id>/role", StudyGroupViewSet.as_view({"post": "update_role"}), name="group-member-role"),
    path("<uuid:pk>/posts", StudyGroupViewSet.as_view({"get": "posts"}), name="group-posts"),
    path("<uuid:pk>/posts/create", StudyGroupViewSet.as_view({"post": "create_post"}), name="group-post-create"),
    path("<uuid:pk>/invitations", StudyGroupViewSet.as_view({"get": "invitations", "post": "create_invitation"}), name="group-invitations"),
    path("<uuid:pk>/meetings", StudyGroupViewSet.as_view({"get": "meetings", "post": "create_meeting"}), name="group-meetings"),
]
