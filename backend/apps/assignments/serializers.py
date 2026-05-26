from rest_framework import serializers
from .models import Assignment, AssignmentSubmission, AssignmentComment


class AssignmentCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.full_name", read_only=True)
    author_role = serializers.CharField(source="author.role", read_only=True)

    class Meta:
        model = AssignmentComment
        fields = ["id", "author", "author_name", "author_role", "content", "created_at"]
        read_only_fields = ["id", "author", "author_name", "author_role", "created_at"]


class AssignmentSubmissionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.full_name", read_only=True)
    student_id_number = serializers.CharField(source="student.student_id", read_only=True)
    comments = AssignmentCommentSerializer(many=True, read_only=True)

    class Meta:
        model = AssignmentSubmission
        fields = [
            "id", "assignment", "student", "student_name", "student_id_number",
            "status", "content", "file", "file_name",
            "marks", "feedback", "graded_by", "graded_at",
            "submitted_at", "created_at", "updated_at", "comments",
        ]
        read_only_fields = [
            "id", "student", "student_name", "student_id_number",
            "marks", "feedback", "graded_by", "graded_at", "created_at", "updated_at",
        ]


class AssignmentListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    submission_count = serializers.IntegerField(read_only=True)
    my_submission = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = [
            "id", "title", "description", "subject", "branch", "semester", "section",
            "max_marks", "deadline", "late_submission_allowed", "late_deadline",
            "created_by", "created_by_name", "submission_count",
            "is_active", "created_at", "my_submission",
        ]

    def get_my_submission(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        try:
            sub = AssignmentSubmission.objects.get(assignment=obj, student=request.user)
            return {
                "id": str(sub.id),
                "status": sub.status,
                "marks": float(sub.marks) if sub.marks else None,
                "submitted_at": sub.submitted_at,
            }
        except AssignmentSubmission.DoesNotExist:
            return None


class AssignmentDetailSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = Assignment
        fields = [
            "id", "title", "description", "subject", "branch", "semester", "section",
            "attachment", "attachment_name", "max_marks", "grading_rubric",
            "deadline", "late_submission_allowed", "late_deadline",
            "created_by", "created_by_name", "is_active", "created_at", "updated_at",
        ]


class AssignmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = [
            "title", "description", "subject", "branch", "semester", "section",
            "attachment", "max_marks", "grading_rubric",
            "deadline", "late_submission_allowed", "late_deadline",
        ]
