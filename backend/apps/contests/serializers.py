from rest_framework import serializers
from apps.coding.models import Contest, ContestProblem, ContestRegistration


class ContestListSerializer(serializers.ModelSerializer):
    phase = serializers.SerializerMethodField()
    registered_count = serializers.SerializerMethodField()
    problems_count = serializers.SerializerMethodField()

    class Meta:
        model = Contest
        fields = [
            "id", "title", "description", "starts_at", "ends_at",
            "status", "is_public", "phase", "registered_count",
            "problems_count", "created_at",
        ]

    def get_phase(self, obj):
        return obj.phase

    def get_registered_count(self, obj):
        return obj.registrations.count()

    def get_problems_count(self, obj):
        return obj.contest_problems.count()


class ContestDetailSerializer(serializers.ModelSerializer):
    phase = serializers.SerializerMethodField()
    registered_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True, default="")

    class Meta:
        model = Contest
        fields = [
            "id", "title", "description", "starts_at", "ends_at",
            "status", "is_public", "phase", "registered_count",
            "created_by_name", "created_at", "updated_at",
        ]

    def get_phase(self, obj):
        return obj.phase

    def get_registered_count(self, obj):
        return obj.registrations.count()


class ContestCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contest
        fields = ["title", "description", "starts_at", "ends_at", "status", "is_public"]

    def validate(self, attrs):
        starts_at = attrs.get("starts_at")
        ends_at = attrs.get("ends_at")
        if starts_at and ends_at and ends_at <= starts_at:
            raise serializers.ValidationError("End time must be after start time.")
        return attrs


class ContestProblemSerializer(serializers.ModelSerializer):
    question_title = serializers.CharField(source="question.title", read_only=True)
    question_difficulty = serializers.CharField(source="question.difficulty", read_only=True)
    question_id = serializers.UUIDField(source="question.id", read_only=True)

    class Meta:
        model = ContestProblem
        fields = [
            "id", "question_id", "question_title", "question_difficulty",
            "points", "order",
        ]


class ContestRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContestRegistration
        fields = ["id", "contest", "user", "registered_at"]
        read_only_fields = ["id", "registered_at"]


class ContestLeaderboardSerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    user_id = serializers.UUIDField()
    full_name = serializers.CharField()
    student_id = serializers.CharField()
    total_score = serializers.IntegerField()
    total_penalty = serializers.IntegerField()
    problems_solved = serializers.IntegerField()
