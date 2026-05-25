from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import GroupInvitation, GroupMeeting, GroupMembership, GroupPost, StudyGroup
from .serializers import (
    GroupInvitationSerializer,
    GroupMeetingSerializer,
    GroupMemberSerializer,
    GroupPostSerializer,
    StudyGroupCreateSerializer,
    StudyGroupSerializer,
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

    @action(detail=True, methods=["post"], url_path="meetings")
    def create_meeting(self, request, pk=None):
        group = self.get_object()
        membership = get_user_membership(group, request.user)
        if not membership or membership.role not in {"admin", "moderator"}:
            return err("Insufficient permission.", status.HTTP_403_FORBIDDEN)
        data = request.data.copy()
        data["group"] = str(group.id)
        serializer = GroupMeetingSerializer(data=data)
        if not serializer.is_valid():
            return err("Validation failed.", errors=serializer.errors)
        meeting = serializer.save(scheduled_by=request.user)
        return ok(GroupMeetingSerializer(meeting).data, "Meeting scheduled.", status.HTTP_201_CREATED)
