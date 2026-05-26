"""
Assignment / Homework views.
"""
from django.utils import timezone
from rest_framework import status, generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import Assignment, AssignmentSubmission, AssignmentComment
from .serializers import (
    AssignmentListSerializer, AssignmentDetailSerializer,
    AssignmentCreateSerializer, AssignmentSubmissionSerializer,
    AssignmentCommentSerializer,
)
from campushub.permissions import IsAdmin


def ok(data=None, message="Success", code=status.HTTP_200_OK):
    r = {"success": True, "message": message}
    if data is not None:
        r["data"] = data
    return Response(r, status=code)


def err(message, code=status.HTTP_400_BAD_REQUEST):
    return Response({"success": False, "error": {"message": message}}, status=code)


class AssignmentListView(generics.ListAPIView):
    """GET /api/assignments/ — list assignments for student."""
    permission_classes = [IsAuthenticated]
    serializer_class = AssignmentListSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["subject", "branch", "semester"]
    search_fields = ["title", "description"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Assignment.objects.filter(is_active=True)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx


class AssignmentDetailView(APIView):
    """GET /api/assignments/<uuid:pk>"""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            assignment = Assignment.objects.get(pk=pk, is_active=True)
        except Assignment.DoesNotExist:
            return err("Assignment not found.", 404)
        data = AssignmentDetailSerializer(assignment).data
        # Include student's submission if exists
        try:
            sub = AssignmentSubmission.objects.get(
                assignment=assignment, student=request.user
            )
            data["my_submission"] = AssignmentSubmissionSerializer(sub).data
        except AssignmentSubmission.DoesNotExist:
            data["my_submission"] = None
        return ok(data)


class AssignmentSubmitView(APIView):
    """POST /api/assignments/<uuid:pk>/submit"""
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        try:
            assignment = Assignment.objects.get(pk=pk, is_active=True)
        except Assignment.DoesNotExist:
            return err("Assignment not found.", 404)

        now = timezone.now()
        is_late = now > assignment.deadline

        if is_late and not assignment.late_submission_allowed:
            return err("Deadline has passed. Late submissions not allowed.")
        if is_late and assignment.late_deadline and now > assignment.late_deadline:
            return err("Late submission deadline has also passed.")

        sub, created = AssignmentSubmission.objects.get_or_create(
            assignment=assignment, student=request.user,
            defaults={"status": "late" if is_late else "submitted", "submitted_at": now},
        )
        if not created:
            if sub.status == "graded":
                return err("Already graded. Cannot resubmit.")
            sub.status = "late" if is_late else "submitted"
            sub.submitted_at = now

        if "content" in request.data:
            sub.content = request.data["content"]
        if "file" in request.FILES:
            sub.file = request.FILES["file"]
            sub.file_name = request.FILES["file"].name
        sub.save()

        # Award XP
        try:
            from apps.leaderboard.services import award_xp
            award_xp(request.user, "assignment_complete", 20, f"Submitted: {assignment.title}")
        except Exception:
            pass

        return ok(AssignmentSubmissionSerializer(sub).data, "Submitted successfully.")


class AssignmentCommentView(APIView):
    """POST /api/assignments/submissions/<uuid:sub_id>/comments"""
    permission_classes = [IsAuthenticated]

    def post(self, request, sub_id):
        try:
            sub = AssignmentSubmission.objects.get(pk=sub_id)
        except AssignmentSubmission.DoesNotExist:
            return err("Submission not found.", 404)
        content = request.data.get("content", "").strip()
        if not content:
            return err("Content is required.")
        comment = AssignmentComment.objects.create(
            submission=sub, author=request.user, content=content
        )
        return ok(AssignmentCommentSerializer(comment).data, "Comment added.", 201)


class MyAssignmentsView(APIView):
    """GET /api/assignments/my — student's submissions."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        subs = AssignmentSubmission.objects.filter(
            student=request.user
        ).select_related("assignment")
        data = AssignmentSubmissionSerializer(subs, many=True).data
        return ok(data)


# ── Admin/Teacher Views ────────────────────────────────────────────────────────

class AdminAssignmentCreateView(APIView):
    """POST /api/admin/assignments"""
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        s = AssignmentCreateSerializer(data=request.data)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        assignment = s.save(created_by=request.user)
        return ok(AssignmentDetailSerializer(assignment).data, "Assignment created.", 201)


class AdminAssignmentDetailView(APIView):
    """PUT/DELETE /api/admin/assignments/<uuid:pk>"""
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def put(self, request, pk):
        try:
            assignment = Assignment.objects.get(pk=pk)
        except Assignment.DoesNotExist:
            return err("Assignment not found.", 404)
        s = AssignmentCreateSerializer(assignment, data=request.data, partial=True)
        if not s.is_valid():
            return Response({"success": False, "errors": s.errors}, status=400)
        s.save()
        return ok(AssignmentDetailSerializer(assignment).data, "Assignment updated.")

    def delete(self, request, pk):
        try:
            assignment = Assignment.objects.get(pk=pk)
        except Assignment.DoesNotExist:
            return err("Assignment not found.", 404)
        assignment.is_active = False
        assignment.save(update_fields=["is_active"])
        return ok(message="Assignment deleted.")


class AdminAssignmentSubmissionsView(APIView):
    """GET /api/admin/assignments/<uuid:pk>/submissions"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request, pk):
        try:
            assignment = Assignment.objects.get(pk=pk)
        except Assignment.DoesNotExist:
            return err("Assignment not found.", 404)
        subs = AssignmentSubmission.objects.filter(assignment=assignment).select_related("student")
        data = AssignmentSubmissionSerializer(subs, many=True).data
        return ok(data)


class AdminAssignmentGradeView(APIView):
    """POST /api/admin/assignments/submissions/<uuid:sub_id>/grade"""
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, sub_id):
        try:
            sub = AssignmentSubmission.objects.get(pk=sub_id)
        except AssignmentSubmission.DoesNotExist:
            return err("Submission not found.", 404)
        marks = request.data.get("marks")
        feedback = request.data.get("feedback", "")
        if marks is None:
            return err("Marks are required.")
        sub.marks = marks
        sub.feedback = feedback
        sub.status = "graded"
        sub.graded_by = request.user
        sub.graded_at = timezone.now()
        sub.save()
        return ok(AssignmentSubmissionSerializer(sub).data, "Submission graded.")
