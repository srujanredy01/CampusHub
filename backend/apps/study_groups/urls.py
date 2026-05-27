from django.urls import path
from .views import StudyGroupViewSet

urlpatterns = [
    # ── Core Group CRUD ───────────────────────────────────────────────────────
    path("", StudyGroupViewSet.as_view({"get": "list"}), name="group-list"),
    path("create", StudyGroupViewSet.as_view({"post": "create"}), name="group-create"),
    path("mine", StudyGroupViewSet.as_view({"get": "mine"}), name="group-mine"),
    path("stats", StudyGroupViewSet.as_view({"get": "stats"}), name="group-stats"),
    path("my-invites", StudyGroupViewSet.as_view({"get": "my_invites"}), name="group-my-invites"),
    path("accept-invite", StudyGroupViewSet.as_view({"post": "accept_invite"}), name="group-accept-invite"),
    path("decline-invite", StudyGroupViewSet.as_view({"post": "decline_invite"}), name="group-decline-invite"),

    # ── Group Detail ──────────────────────────────────────────────────────────
    path("<uuid:pk>", StudyGroupViewSet.as_view({"get": "retrieve"}), name="group-detail"),
    path("<uuid:pk>/join", StudyGroupViewSet.as_view({"post": "join"}), name="group-join"),
    path("<uuid:pk>/leave", StudyGroupViewSet.as_view({"post": "leave"}), name="group-leave"),

    # ── Members ───────────────────────────────────────────────────────────────
    path("<uuid:pk>/members", StudyGroupViewSet.as_view({"get": "members"}), name="group-members"),
    path("<uuid:pk>/members/<uuid:user_id>/role", StudyGroupViewSet.as_view({"post": "update_role"}), name="group-member-role"),

    # ── Posts ─────────────────────────────────────────────────────────────────
    path("<uuid:pk>/posts", StudyGroupViewSet.as_view({"get": "posts"}), name="group-posts"),
    path("<uuid:pk>/posts/create", StudyGroupViewSet.as_view({"post": "create_post"}), name="group-post-create"),

    # ── Invitations ───────────────────────────────────────────────────────────
    path("<uuid:pk>/invitations", StudyGroupViewSet.as_view({"get": "invitations", "post": "create_invitation"}), name="group-invitations"),

    # ── Meetings / Sessions ───────────────────────────────────────────────────
    path("<uuid:pk>/meetings", StudyGroupViewSet.as_view({"get": "meetings"}), name="group-meetings"),
    path("<uuid:pk>/meetings/create", StudyGroupViewSet.as_view({"post": "create_meeting"}), name="group-meeting-create"),
    path("<uuid:pk>/meetings/<uuid:meeting_id>/cancel", StudyGroupViewSet.as_view({"post": "cancel_meeting"}), name="group-meeting-cancel"),

    # ── Chat Messages (REST) ──────────────────────────────────────────────────
    path("<uuid:pk>/messages", StudyGroupViewSet.as_view({"get": "messages"}), name="group-messages"),

    # ── Tasks (Kanban) ────────────────────────────────────────────────────────
    path("<uuid:pk>/tasks", StudyGroupViewSet.as_view({"get": "tasks"}), name="group-tasks"),
    path("<uuid:pk>/tasks/create", StudyGroupViewSet.as_view({"post": "create_task"}), name="group-task-create"),
    path("<uuid:pk>/tasks/<uuid:task_id>", StudyGroupViewSet.as_view({"patch": "update_task"}), name="group-task-update"),
    path("<uuid:pk>/tasks/<uuid:task_id>/delete", StudyGroupViewSet.as_view({"delete": "delete_task"}), name="group-task-delete"),

    # ── Shared Resources ──────────────────────────────────────────────────────
    path("<uuid:pk>/resources", StudyGroupViewSet.as_view({"get": "resources"}), name="group-resources"),
    path("<uuid:pk>/resources/upload", StudyGroupViewSet.as_view({"post": "upload_resource"}), name="group-resource-upload"),
    path("<uuid:pk>/resources/<uuid:resource_id>/delete", StudyGroupViewSet.as_view({"delete": "delete_resource"}), name="group-resource-delete"),

    # ── Polls ─────────────────────────────────────────────────────────────────
    path("<uuid:pk>/polls", StudyGroupViewSet.as_view({"get": "polls"}), name="group-polls"),
    path("<uuid:pk>/polls/create", StudyGroupViewSet.as_view({"post": "create_poll"}), name="group-poll-create"),
    path("<uuid:pk>/polls/<uuid:poll_id>/vote", StudyGroupViewSet.as_view({"post": "vote_poll"}), name="group-poll-vote"),

    # ── Study Timer ───────────────────────────────────────────────────────────
    path("<uuid:pk>/timer", StudyGroupViewSet.as_view({"get": "get_timer"}), name="group-timer"),
    path("<uuid:pk>/timer/start", StudyGroupViewSet.as_view({"post": "start_timer"}), name="group-timer-start"),
    path("<uuid:pk>/timer/stop", StudyGroupViewSet.as_view({"post": "stop_timer"}), name="group-timer-stop"),
]
