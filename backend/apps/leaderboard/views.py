"""
Leaderboard & Gamification views.
"""
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import StudentXP, XPTransaction, Badge, StudentBadge
from .serializers import StudentXPSerializer, XPTransactionSerializer, BadgeSerializer, StudentBadgeSerializer


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    r = {"success": True, "message": message}
    if data is not None:
        r["data"] = data
    return Response(r, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": {"message": message}}, status=code)


class LeaderboardView(APIView):
    """GET /api/leaderboard/ — global leaderboard."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = int(request.query_params.get("limit", 50))
        branch = request.query_params.get("branch", "")
        qs = StudentXP.objects.select_related("student").order_by("-total_xp")
        if branch:
            qs = qs.filter(student__branch=branch)
        data = StudentXPSerializer(qs[:limit], many=True).data
        return ok(data)


class MyXPView(APIView):
    """GET /api/leaderboard/me — current user's XP profile."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        xp_profile, _ = StudentXP.objects.get_or_create(student=request.user)
        badges = StudentBadge.objects.filter(student=request.user).select_related("badge")
        recent_xp = XPTransaction.objects.filter(student=request.user)[:20]
        return ok({
            "xp": StudentXPSerializer(xp_profile).data,
            "badges": StudentBadgeSerializer(badges, many=True).data,
            "recent_transactions": XPTransactionSerializer(recent_xp, many=True).data,
        })


class BadgeListView(APIView):
    """GET /api/leaderboard/badges — all available badges."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        badges = Badge.objects.filter(is_active=True)
        earned_ids = set(
            StudentBadge.objects.filter(student=request.user).values_list("badge_id", flat=True)
        )
        data = []
        for badge in badges:
            b = BadgeSerializer(badge).data
            b["earned"] = badge.id in earned_ids
            data.append(b)
        return ok(data)


class XPHistoryView(APIView):
    """GET /api/leaderboard/history — XP transaction history."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        transactions = XPTransaction.objects.filter(student=request.user)[:50]
        data = XPTransactionSerializer(transactions, many=True).data
        return ok(data)
