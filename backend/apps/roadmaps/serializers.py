from rest_framework import serializers
from .models import Roadmap, RoadmapMilestone, RoadmapStep, StudentRoadmapProgress, StepCompletion


class RoadmapStepSerializer(serializers.ModelSerializer):
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = RoadmapStep
        fields = [
            "id", "title", "description", "step_type", "order",
            "resource_url", "resource_title", "estimated_minutes",
            "is_optional", "is_completed",
        ]

    def get_is_completed(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return StepCompletion.objects.filter(student=request.user, step=obj).exists()


class RoadmapMilestoneSerializer(serializers.ModelSerializer):
    steps = RoadmapStepSerializer(many=True, read_only=True)

    class Meta:
        model = RoadmapMilestone
        fields = ["id", "title", "description", "order", "estimated_days", "steps"]


class RoadmapListSerializer(serializers.ModelSerializer):
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Roadmap
        fields = [
            "id", "title", "slug", "category", "description", "icon", "color",
            "estimated_weeks", "difficulty", "total_steps", "enrolled_count",
            "is_active", "progress",
        ]

    def get_progress(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        try:
            p = StudentRoadmapProgress.objects.get(student=request.user, roadmap=obj)
            return {
                "status": p.status,
                "completed_steps": p.completed_steps,
                "total_steps": p.total_steps,
                "percentage": p.progress_percentage,
            }
        except StudentRoadmapProgress.DoesNotExist:
            return None


class RoadmapDetailSerializer(serializers.ModelSerializer):
    milestones = RoadmapMilestoneSerializer(many=True, read_only=True)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Roadmap
        fields = [
            "id", "title", "slug", "category", "description", "icon", "color",
            "estimated_weeks", "difficulty", "prerequisites", "total_steps",
            "enrolled_count", "is_active", "milestones", "progress",
        ]

    def get_progress(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        try:
            p = StudentRoadmapProgress.objects.get(student=request.user, roadmap=obj)
            return {
                "status": p.status,
                "completed_steps": p.completed_steps,
                "total_steps": p.total_steps,
                "percentage": p.progress_percentage,
                "started_at": p.started_at,
            }
        except StudentRoadmapProgress.DoesNotExist:
            return None


class RoadmapAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Roadmap
        fields = "__all__"


class MilestoneAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoadmapMilestone
        fields = "__all__"


class StepAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoadmapStep
        fields = "__all__"
