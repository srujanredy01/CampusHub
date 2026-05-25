from django.core.cache import cache
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import StudentProfile, ActivityLog
from .serializers import StudentProfileSerializer, ProfileUpdateSerializer, ActivityLogSerializer


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        key = f"profile:{request.user.id}"
        cached = cache.get(key)
        if cached:
            return Response({"success": True, "data": cached})
        profile, _ = StudentProfile.objects.get_or_create(user=request.user)
        data = StudentProfileSerializer(profile, context={"request": request}).data
        cache.set(key, data, 300)
        return Response({"success": True, "data": data})

    def put(self, request):
        profile, _ = StudentProfile.objects.get_or_create(user=request.user)

        # Validate profile image upload if provided
        if "profile_image" in request.FILES:
            try:
                from campushub.file_security import validate_upload
                validate_upload(request.FILES["profile_image"], category="avatar")
            except Exception as e:
                return Response({"success": False, "errors": {"profile_image": [str(e)]}}, status=400)

        s = ProfileUpdateSerializer(profile, data=request.data, partial=True)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        s.save()
        cache.delete(f"profile:{request.user.id}")
        ActivityLog.objects.create(user=request.user, activity_type="profile_update", description="Profile updated")
        try:
            from apps.audit.utils import log_profile_update
            log_profile_update(request, request.user)
        except Exception:
            pass
        return Response({"success": True, "data": StudentProfileSerializer(profile, context={"request": request}).data, "message": "Profile updated."})


class ActivityHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logs = ActivityLog.objects.filter(user=request.user)[:50]
        return Response({"success": True, "data": ActivityLogSerializer(logs, many=True).data})
