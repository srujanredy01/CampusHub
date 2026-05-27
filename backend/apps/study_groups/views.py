from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import (
    GroupInvitation, GroupMeeting, GroupMembership, GroupPost, StudyGroup,
    ChatMessage, GroupTask, SharedResource, GroupPoll, PollOption, PollVote, StudyTimer,
)
from .serializers import (
    GroupInvitationSerializer,
    GroupMeetingSerializer,
    GroupMemberSerializer,
    GroupPostSerializer,
    StudyGroupCreateSerializer,
    StudyGroupSerializer,
    ChatMessageSerializer,
    GroupTaskSerializer,
    SharedResourceSerializer,
    GroupPollSerializer,
    PollOptionSerializer,
    StudyTimerSerializer,
)


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    payload = {"success": True, "message": message}
    if data is not None:
        payload["data"] = data
    return Response(payload, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST, errors=None):
    payload = {"success": False, "error": {"message": message}}
    if errors:
        payload["errors"] = errors
    return Response(payload, status=code)


def get_user_membership(group, user):
    return GroupMembership.objects.filter(group=group, user=user, is_active=True).first()


class StudyGroupViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = StudyGroupSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["branch", "semester", "visibility"]
    search_fields = ["name", "description", "subject"]
    ordering = ["-last_activity_at", "-created_at"]

    def get_queryset(self):
        qs = StudyGroup.objects.filter(is_active=True)
        if self.action == "list":
            return qs.filter(Q(visibility="public") | Q(memberships__user=self.request.user, memberships__is_active=True)).distinct()
        if self.action == "mine":
            group_ids = GroupMembership.objects.filter(user=self.request.user, is_active=True).values_list("group_id", flat=True)
            return qs.filter(pk__in=group_ids)
        return qs

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return StudyGroupCreateSerializer
        return StudyGroupSerializer

    def create(self, request, *args, **kwargs):
        serializer = StudyGroupCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        group = serializer.save(created_by=request.user)
        GroupMembership.objects.create(group=group, user=request.user, role="admin")
        return ok(StudyGroupSerializer(group, context={"request": request}).data, "Group created.", status.HTTP_201_CREATED)

    def retrieve(self, request, *args, **kwargs):
        group = self.get_object()
        if group.visibility == "private" and not get_user_membership(group, request.user):
            return err("Private group.", status.HTTP_403_FORBIDDEN)
        return ok(StudyGroupSerializer(group, context={"request": request}).data)

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request):
        groups = self.get_queryset()
        page = self.paginate_queryset(groups)
        serializer = StudyGroupSerializer(page if page is not None else groups, many=True, context={"request": request})
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """Dashboard metrics for the current user."""
        user = request.user
        my_groups = GroupMembership.objects.filter(user=user, is_active=True).count()
        sessions_attended = GroupMeeting.objects.filter(
            group__memberships__user=user,
            group__memberships__is_active=True,
            status="completed"
        ).distinct().count()
        tasks_completed = GroupTask.objects.filter(
            assigned_to=user, status="completed"
        ).count()
        # Approximate study hours from completed meetings
        from django.db.models import Sum, F, ExpressionWrapper, DurationField
        study_hours = 0
        meetings = GroupMeeting.objects.filter(
            group__memberships__user=user,
            group__memberships__is_active=True,
            status="completed"
        ).distinct()
        for m in meetings:
            study_hours += (m.ends_at - m.starts_at).total_seconds() / 3600

        pending_invites = GroupInvitation.objects.filter(
            invited_user=user, status="pending"
        ).count()

        return ok({
            "groups_joined": my_groups,
            "sessions_attended": sessions_attended,
            "study_hours": round(study_hours, 1),
            "tasks_completed": tasks_completed,
            "pending_invites": pending_invites,
        })

    @action(detail=False, methods=["get"], url_path="my-invites")
    def my_invites(self, request):
        """Get pending invitations for the current user."""
        invites = GroupInvitation.objects.filter(
            invited_user=request.user, status="pending", expires_at__gt=timezone.now()
        ).select_related("group", "invited_by")
        serializer = GroupInvitationSerializer(invites, many=True)
        return ok(serializer.data)

    @action(detail=False, methods=["post"], url_path="accept-invite")
    def accept_invite(self, request):
        """Accept a group invitation."""
        token = request.data.get("token", "").strip()
        if not token:
            return err("Token required.")
        invite = GroupInvitation.objects.filter(
            token=token, invited_user=request.user, status="pending"
        ).first()
        if not invite:
            return err("Invalid or expired invitation.", status.HTTP_404_NOT_FOUND)
        if invite.expires_at < timezone.now():
            invite.status = "expired"
            invite.save(update_fields=["status"])
            return err("Invitation expired.")
        # Join the group
        membership, created = GroupMembership.objects.get_or_create(
            group=invite.group, user=request.user,
            defaults={"role": "member", "is_active": True}
        )
        if not created and not membership.is_active:
            membership.is_active = True
            membership.role = "member"
            membership.save(update_fields=["is_active", "role"])
        invite.status = "accepted"
        invite.save(update_fields=["status"])
        return ok(message="Invitation accepted. You joined the group.")

    @action(detail=False, methods=["post"], url_path="decline-invite")
    def decline_invite(self, request):
        """Decline a group invitation."""
        token = request.data.get("token", "").strip()
        if not token:
            return err("Token required.")
        invite = GroupInvitation.objects.filter(
            token=token, invited_user=request.user, status="pending"
        ).first()
        if not invite:
            return err("Invalid invitation.", status.HTTP_404_NOT_FOUND)
        invite.status = "declined"
        invite.save(update_fields=["status"])
        return ok(message="Invitation declined.")

    @action(detail=True, methods=["post"], url_path="join")
    def join(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if membership:
            return err("Already a member.", status.HTTP_409_CONFLICT)
        if group.visibility == "private":
            invite_code = (request.data.get("invite_code") or "").strip()
            if invite_code != group.invite_code:
                return err("Invalid invite code.", status.HTTP_403_FORBIDDEN)
        if group.member_count >= group.max_members:
            return err("Group is full.")
        membership, created = GroupMembership.objects.get_or_create(group=group, user=request.user, defaults={"role": "member", "is_active": True})
        if not created and not membership.is_active:
            membership.is_active = True
            membership.role = "member"
            membership.save(update_fields=["is_active", "role"])
        group.last_activity_at = timezone.now()
        group.save(update_fields=["last_activity_at"])
        return ok(message="Joined group.")

    @action(detail=True, methods=["post"], url_path="leave")
    def leave(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_404_NOT_FOUND)
        if membership.role == "admin":
            other_admins = GroupMembership.objects.filter(group=group, role="admin", is_active=True).exclude(user=request.user).exists()
            if not other_admins:
                return err("Transfer admin role before leaving.")
        membership.is_active = False
        membership.save(update_fields=["is_active"])
        return ok(message="Left group.")

    @action(detail=True, methods=["get"], url_path="members")
    def members(self, request, pk=None):
        group = self.get_object()
        if not get_user_membership(group, request.user) and group.visibility == "private":
            return err("Private group.", status.HTTP_403_FORBIDDEN)
        members = GroupMembership.objects.filter(group=group, is_active=True).select_related("user")
        page = self.paginate_queryset(members)
        serializer = GroupMemberSerializer(page if page is not None else members, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="members/(?P<user_id>[^/.]+)/role")
    def update_role(self, request, pk=None, user_id=None):
        group = self.get_object()
        actor = get_user_membership(group, request.user)
        if not actor or actor.role not in {"admin", "moderator"}:
            return err("Insufficient permission.", status.HTTP_403_FORBIDDEN)
        target = GroupMembership.objects.filter(group=group, user_id=user_id, is_active=True).first()
        if not target:
            return err("Member not found.", status.HTTP_404_NOT_FOUND)
        new_role = request.data.get("role")
        if new_role not in {"admin", "moderator", "member"}:
            return err("Invalid role.")
        if actor.role == "moderator" and new_role == "admin":
            return err("Only admins can promote to admin.", status.HTTP_403_FORBIDDEN)
        target.role = new_role
        target.save(update_fields=["role"])
        return ok(GroupMemberSerializer(target).data, "Role updated.")

    # ── Posts ─────────────────────────────────────────────────────────────────

    @action(detail=True, methods=["get"], url_path="posts")
    def posts(self, request, pk=None):
        group = self.get_object()
        if group.visibility == "private" and not get_user_membership(group, request.user):
            return err("Private group.", status.HTTP_403_FORBIDDEN)
        posts = GroupPost.objects.filter(group=group, is_deleted=False).select_related("author")
        page = self.paginate_queryset(posts)
        serializer = GroupPostSerializer(page if page is not None else posts, many=True, context={"request": request})
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="posts/create")
    def create_post(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        data = request.data.copy()
        data["group"] = str(group.id)
        serializer = GroupPostSerializer(data=data, context={"request": request})
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        post = serializer.save(author=request.user)
        group.last_activity_at = timezone.now()
        group.save(update_fields=["last_activity_at"])
        return ok(GroupPostSerializer(post, context={"request": request}).data, "Post created.", status.HTTP_201_CREATED)

    # ── Invitations ───────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="invitations")
    def create_invitation(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership or membership.role not in {"admin", "moderator"}:
            return err("Insufficient permission.", status.HTTP_403_FORBIDDEN)
        data = request.data.copy()
        data["group"] = str(group.id)
        serializer = GroupInvitationSerializer(data=data)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        invitation = serializer.save(invited_by=request.user)
        return ok(GroupInvitationSerializer(invitation).data, "Invitation created.", status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="invitations")
    def invitations(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership or membership.role not in {"admin", "moderator"}:
            return err("Insufficient permission.", status.HTTP_403_FORBIDDEN)
        invitations = GroupInvitation.objects.filter(group=group).select_related("invited_user", "invited_by")
        page = self.paginate_queryset(invitations)
        serializer = GroupInvitationSerializer(page if page is not None else invitations, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    # ── Meetings / Sessions ───────────────────────────────────────────────────

    @action(detail=True, methods=["get"], url_path="meetings")
    def meetings(self, request, pk=None):
        group = self.get_object()
        if group.visibility == "private" and not get_user_membership(group, request.user):
            return err("Private group.", status.HTTP_403_FORBIDDEN)
        meetings = GroupMeeting.objects.filter(group=group).select_related("scheduled_by")
        page = self.paginate_queryset(meetings)
        serializer = GroupMeetingSerializer(page if page is not None else meetings, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="meetings/create")
    def create_meeting(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        data = request.data.copy()
        data["group"] = str(group.id)
        serializer = GroupMeetingSerializer(data=data)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        meeting = serializer.save(scheduled_by=request.user)
        return ok(GroupMeetingSerializer(meeting).data, "Meeting scheduled.", status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="meetings/(?P<meeting_id>[^/.]+)/cancel")
    def cancel_meeting(self, request, pk=None, meeting_id=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        meeting = GroupMeeting.objects.filter(id=meeting_id, group=group).first()
        if not meeting:
            return err("Meeting not found.", status.HTTP_404_NOT_FOUND)
        if meeting.scheduled_by != request.user and membership.role not in ("admin", "moderator"):
            return err("Insufficient permission.", status.HTTP_403_FORBIDDEN)
        meeting.status = "cancelled"
        meeting.save(update_fields=["status"])
        return ok(message="Meeting cancelled.")

    # ── Chat Messages (REST fallback for history) ─────────────────────────────

    @action(detail=True, methods=["get"], url_path="messages")
    def messages(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        messages = ChatMessage.objects.filter(group=group, is_deleted=False).select_related("sender")
        # Support search
        search_q = request.query_params.get("search")
        if search_q:
            messages = messages.filter(content__icontains=search_q)
        # Support pinned filter
        pinned = request.query_params.get("pinned")
        if pinned == "true":
            messages = messages.filter(is_pinned=True)
        page = self.paginate_queryset(messages)
        serializer = ChatMessageSerializer(page if page is not None else messages, many=True, context={"request": request})
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    # ── Tasks (Kanban) ────────────────────────────────────────────────────────

    @action(detail=True, methods=["get"], url_path="tasks")
    def tasks(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        tasks = GroupTask.objects.filter(group=group).select_related("assigned_to", "created_by")
        serializer = GroupTaskSerializer(tasks, many=True)
        return ok(serializer.data)

    @action(detail=True, methods=["post"], url_path="tasks/create")
    def create_task(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        data = request.data.copy()
        data["group"] = str(group.id)
        serializer = GroupTaskSerializer(data=data)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        task = serializer.save(created_by=request.user)
        return ok(GroupTaskSerializer(task).data, "Task created.", status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"], url_path="tasks/(?P<task_id>[^/.]+)")
    def update_task(self, request, pk=None, task_id=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        task = GroupTask.objects.filter(id=task_id, group=group).first()
        if not task:
            return err("Task not found.", status.HTTP_404_NOT_FOUND)
        serializer = GroupTaskSerializer(task, data=request.data, partial=True)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        serializer.save()
        return ok(serializer.data, "Task updated.")

    @action(detail=True, methods=["delete"], url_path="tasks/(?P<task_id>[^/.]+)/delete")
    def delete_task(self, request, pk=None, task_id=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        task = GroupTask.objects.filter(id=task_id, group=group).first()
        if not task:
            return err("Task not found.", status.HTTP_404_NOT_FOUND)
        if task.created_by != request.user and membership.role not in ("admin", "moderator"):
            return err("Insufficient permission.", status.HTTP_403_FORBIDDEN)
        task.delete()
        return ok(message="Task deleted.")

    # ── Shared Resources ──────────────────────────────────────────────────────

    @action(detail=True, methods=["get"], url_path="resources")
    def resources(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        resources = SharedResource.objects.filter(group=group).select_related("uploaded_by")
        serializer = SharedResourceSerializer(resources, many=True, context={"request": request})
        return ok(serializer.data)

    @action(detail=True, methods=["post"], url_path="resources/upload")
    def upload_resource(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        data = request.data.copy()
        data["group"] = str(group.id)
        # Determine resource type from file extension
        file = request.FILES.get("file")
        if file:
            ext = file.name.rsplit(".", 1)[-1].lower() if "." in file.name else ""
            type_map = {"pdf": "pdf", "ppt": "ppt", "pptx": "ppt", "doc": "doc", "docx": "doc",
                        "jpg": "image", "jpeg": "image", "png": "image", "gif": "image"}
            data["resource_type"] = type_map.get(ext, "other")
            data["file_size"] = file.size
        serializer = SharedResourceSerializer(data=data, context={"request": request})
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        resource = serializer.save(uploaded_by=request.user)
        return ok(SharedResourceSerializer(resource, context={"request": request}).data, "Resource uploaded.", status.HTTP_201_CREATED)

    @action(detail=True, methods=["delete"], url_path="resources/(?P<resource_id>[^/.]+)/delete")
    def delete_resource(self, request, pk=None, resource_id=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        resource = SharedResource.objects.filter(id=resource_id, group=group).first()
        if not resource:
            return err("Resource not found.", status.HTTP_404_NOT_FOUND)
        if resource.uploaded_by != request.user and membership.role not in ("admin", "moderator"):
            return err("Insufficient permission.", status.HTTP_403_FORBIDDEN)
        resource.delete()
        return ok(message="Resource deleted.")

    # ── Polls ─────────────────────────────────────────────────────────────────

    @action(detail=True, methods=["get"], url_path="polls")
    def polls(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        polls = GroupPoll.objects.filter(group=group).prefetch_related("options__votes")
        serializer = GroupPollSerializer(polls, many=True, context={"request": request})
        return ok(serializer.data)

    @action(detail=True, methods=["post"], url_path="polls/create")
    def create_poll(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        question = request.data.get("question", "").strip()
        options = request.data.get("options", [])
        if not question or len(options) < 2:
            return err("Question and at least 2 options required.")
        poll = GroupPoll.objects.create(
            group=group,
            question=question,
            created_by=request.user,
            allow_multiple=request.data.get("allow_multiple", False),
            expires_at=request.data.get("expires_at"),
        )
        for opt_text in options:
            PollOption.objects.create(poll=poll, text=opt_text.strip())
        serializer = GroupPollSerializer(poll, context={"request": request})
        return ok(serializer.data, "Poll created.", status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="polls/(?P<poll_id>[^/.]+)/vote")
    def vote_poll(self, request, pk=None, poll_id=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        poll = GroupPoll.objects.filter(id=poll_id, group=group, is_active=True).first()
        if not poll:
            return err("Poll not found or closed.", status.HTTP_404_NOT_FOUND)
        option_id = request.data.get("option_id")
        option = PollOption.objects.filter(id=option_id, poll=poll).first()
        if not option:
            return err("Invalid option.")
        if not poll.allow_multiple:
            # Remove previous vote
            PollVote.objects.filter(option__poll=poll, user=request.user).delete()
        PollVote.objects.get_or_create(option=option, user=request.user)
        serializer = GroupPollSerializer(poll, context={"request": request})
        return ok(serializer.data, "Vote recorded.")

    # ── Study Timer ───────────────────────────────────────────────────────────

    @action(detail=True, methods=["get"], url_path="timer")
    def get_timer(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        timer = StudyTimer.objects.filter(group=group, status="active").first()
        if not timer:
            return ok(None, "No active timer.")
        return ok(StudyTimerSerializer(timer).data)

    @action(detail=True, methods=["post"], url_path="timer/start")
    def start_timer(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        # Cancel any existing active timer
        StudyTimer.objects.filter(group=group, status="active").update(status="cancelled")
        mode = request.data.get("mode", "pomodoro_25")
        duration = request.data.get("duration_minutes", 25)
        break_mins = request.data.get("break_minutes", 5)
        if mode == "pomodoro_25":
            duration = 25
            break_mins = 5
        elif mode == "pomodoro_50":
            duration = 50
            break_mins = 10
        timer = StudyTimer.objects.create(
            group=group,
            started_by=request.user,
            mode=mode,
            duration_minutes=duration,
            break_minutes=break_mins,
        )
        return ok(StudyTimerSerializer(timer).data, "Timer started.", status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="timer/stop")
    def stop_timer(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership:
            return err("Not a member.", status.HTTP_403_FORBIDDEN)
        timer = StudyTimer.objects.filter(group=group, status="active").first()
        if not timer:
            return err("No active timer.", status.HTTP_404_NOT_FOUND)
        timer.status = "completed"
        timer.save(update_fields=["status"])
        return ok(message="Timer stopped.")
