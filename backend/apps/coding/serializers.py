"""
Serializers for the coding app.
"""

from rest_framework import serializers
from .models import (
    CodingQuestion,
    Submission,
    SavedQuestion,
    CodingDraft,
    CodingDiscussionMessage,
    Contest,
    ContestProblem,
    ContestRegistration,
    ContestSubmission,
)


SUPPORTED_LANGUAGES = ["python", "java", "cpp", "javascript", "c", "sql", "go"]


class CodingQuestionListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for question lists."""

    acceptance_rate = serializers.ReadOnlyField()
    is_saved = serializers.SerializerMethodField()
    is_solved = serializers.SerializerMethodField()

    class Meta:
        model = CodingQuestion
        fields = [
            "id", "title", "topic", "difficulty",
            "topic_tags", "company_tags",
            "total_submissions", "accepted_submissions", "acceptance_rate",
            "is_saved", "is_solved", "created_at",
        ]

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return SavedQuestion.objects.filter(user=request.user, question=obj).exists()
        return False

    def get_is_solved(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Submission.objects.filter(user=request.user, question=obj, status="accepted").exists()
        return False


class CodingQuestionDetailSerializer(serializers.ModelSerializer):
    """Full question detail serializer (hides hidden test cases from students)."""

    acceptance_rate = serializers.ReadOnlyField()
    is_saved = serializers.SerializerMethodField()
    is_solved = serializers.SerializerMethodField()

    class Meta:
        model = CodingQuestion
        fields = [
            "id", "title", "description", "topic", "difficulty",
            "constraints", "sample_input", "sample_output", "explanation",
            "starter_code", "hints", "topic_tags", "company_tags",
            "supported_languages", "editorial_title", "editorial_content",
            "total_submissions", "accepted_submissions",
            "acceptance_rate", "is_saved", "is_solved", "created_at",
        ]
        # hidden_test_cases intentionally excluded for students

    def get_is_saved(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return SavedQuestion.objects.filter(user=request.user, question=obj).exists()
        return False

    def get_is_solved(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return Submission.objects.filter(user=request.user, question=obj, status="accepted").exists()
        return False


class CodingQuestionAdminSerializer(serializers.ModelSerializer):
    """Full serializer for admin (includes hidden test cases)."""

    class Meta:
        model = CodingQuestion
        fields = "__all__"
        read_only_fields = ["id", "total_submissions", "accepted_submissions", "created_at", "updated_at"]


class SubmissionSerializer(serializers.ModelSerializer):
    """Serializer for code submissions."""

    question_title = serializers.CharField(source="question.title", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = Submission
        fields = [
            "id", "user", "user_name", "question", "question_title",
            "language", "code", "status",
            "stdout", "stderr", "execution_time", "memory_used",
            "test_results", "passed_test_cases", "total_test_cases",
            "created_at",
        ]
        read_only_fields = [
            "id", "user", "user_name", "status",
            "stdout", "stderr", "execution_time", "memory_used",
            "test_results", "passed_test_cases", "total_test_cases",
            "created_at",
        ]


class CodeRunSerializer(serializers.Serializer):
    """Serializer for running code (without test cases)."""

    language = serializers.ChoiceField(choices=SUPPORTED_LANGUAGES)
    code = serializers.CharField(required=True)
    stdin = serializers.CharField(required=False, default="", allow_blank=True)

    def validate_code(self, value):
        if len(value) > 50000:
            raise serializers.ValidationError("Code exceeds maximum size (50KB).")
        return value

    def validate_stdin(self, value):
        if len(value) > 20000:
            raise serializers.ValidationError("Custom input exceeds maximum size (20KB).")
        return value


class CodeSubmitSerializer(serializers.Serializer):
    """Serializer for submitting code against a question."""

    question_id = serializers.UUIDField(required=True)
    language = serializers.ChoiceField(choices=SUPPORTED_LANGUAGES)
    code = serializers.CharField(required=True)

    def validate_code(self, value):
        if len(value) > 50000:
            raise serializers.ValidationError("Code exceeds maximum size (50KB).")
        return value


class SavedQuestionSerializer(serializers.ModelSerializer):
    question = CodingQuestionListSerializer(read_only=True)

    class Meta:
        model = SavedQuestion
        fields = ["id", "question", "created_at"]
        read_only_fields = ["id", "created_at"]


class CodingDraftSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodingDraft
        fields = ["id", "question", "language", "code", "updated_at", "created_at"]
        read_only_fields = ["id", "updated_at", "created_at"]


class CodingDiscussionMessageSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = CodingDiscussionMessage
        fields = ["id", "question", "user", "user_name", "parent", "body", "is_deleted", "created_at", "updated_at", "replies"]
        read_only_fields = ["id", "user", "is_deleted", "created_at", "updated_at", "replies"]

    def get_replies(self, obj):
        if obj.parent_id is not None:
            return []
        qs = obj.replies.filter(is_deleted=False).select_related("user").order_by("created_at")
        return CodingDiscussionMessageSerializer(qs, many=True, context=self.context).data

    def validate_body(self, value):
        value = value.strip()
        if len(value) < 2:
            raise serializers.ValidationError("Message must be at least 2 characters.")
        if len(value) > 4000:
            raise serializers.ValidationError("Message is too long.")
        # Sanitize HTML to prevent XSS
        try:
            from campushub.file_security import sanitize_text
            value = sanitize_text(value, strip=True)
        except Exception:
            pass
        return value


class ContestProblemSerializer(serializers.ModelSerializer):
    question = CodingQuestionListSerializer(read_only=True)
    question_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = ContestProblem
        fields = ["id", "question", "question_id", "points", "order", "created_at"]
        read_only_fields = ["id", "created_at"]


class ContestSerializer(serializers.ModelSerializer):
    phase = serializers.ReadOnlyField()
    problems_count = serializers.SerializerMethodField()
    registered_count = serializers.SerializerMethodField()
    is_registered = serializers.SerializerMethodField()

    class Meta:
        model = Contest
        fields = [
            "id", "title", "description", "starts_at", "ends_at", "status",
            "is_public", "phase", "problems_count", "registered_count",
            "is_registered", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "phase", "created_at", "updated_at"]

    def get_is_registered(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            return ContestRegistration.objects.filter(contest=obj, user=request.user).exists()
        return False

    def get_problems_count(self, obj):
        return getattr(obj, "problems_count", None) or obj.contest_problems.count()

    def get_registered_count(self, obj):
        return getattr(obj, "registered_count", None) or obj.registrations.count()

    def validate(self, attrs):
        starts_at = attrs.get("starts_at", getattr(self.instance, "starts_at", None))
        ends_at = attrs.get("ends_at", getattr(self.instance, "ends_at", None))
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError({"ends_at": "Contest must end after it starts."})
        return attrs


class ContestDetailSerializer(ContestSerializer):
    contest_problems = ContestProblemSerializer(many=True, read_only=True)

    class Meta(ContestSerializer.Meta):
        fields = ContestSerializer.Meta.fields + ["contest_problems"]


class ContestSubmissionSerializer(serializers.ModelSerializer):
    submission = SubmissionSerializer(read_only=True)
    problem_title = serializers.CharField(source="contest_problem.question.title", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = ContestSubmission
        fields = [
            "id", "contest", "contest_problem", "problem_title", "user", "user_name",
            "submission", "score", "penalty_seconds", "created_at",
        ]
        read_only_fields = fields
