"""
Roadmap serializers for CampusHub.
Supports community creation, moderation workflow, and progress tracking.
"""
from rest_framework import serializers
from .models import (
    Roadmap, RoadmapMilestone, RoadmapStep, StudentRoadmapProgress,
    StepCompletion, RoadmapLike, RoadmapComment, RoadmapRating,
    RoadmapBookmark, RoadmapReport,
)


# ── Step & Milestone Serializers ──────────────────────────────────────────────

class RoadmapStepSerializer(serializers.ModelSerializer):
    is_completed = serializers.SerializerMethodField()

    class Meta:
        model = RoadmapStep
        fields = [
            "id", "title", "description", "step_type", "order",
            "resource_url", "resource_title", "estimated_minutes",
            "is_optional", "notes", "is_completed",
        ]

    def get_is_completed(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return StepCompletion.objects.filter(student=request.user, step=obj).exists()


class RoadmapStepCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoadmapStep
        fields = [
            "title", "description", "step_type", "order",
            "resource_url", "resource_title", "estimated_minutes",
            "is_optional", "notes",
        ]
        extra_kwargs = {"title": {"required": True}}


class RoadmapMilestoneSerializer(serializers.ModelSerializer):
    steps = RoadmapStepSerializer(many=True, read_only=True)

    class Meta:
        model = RoadmapMilestone
        fields = ["id", "title", "description", "order", "estimated_days", "steps"]


class MilestoneCreateSerializer(serializers.ModelSerializer):
    steps = RoadmapStepCreateSerializer(many=True, required=False)

    class Meta:
        model = RoadmapMilestone
        fields = ["title", "description", "order", "estimated_days", "steps"]
        extra_kwargs = {"title": {"required": True}}


# ── Roadmap List Serializer ───────────────────────────────────────────────────

class RoadmapListSerializer(serializers.ModelSerializer):
    creator_name = serializers.CharField(source="created_by.full_name", read_only=True, default="")
    creator_role = serializers.CharField(source="created_by.role", read_only=True, default="")
    progress = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()

    class Meta:
        model = Roadmap
        fields = [
            "id", "title", "slug", "category", "description", "icon", "color",
            "estimated_weeks", "difficulty", "total_steps", "enrolled_count",
            "like_count", "average_rating", "rating_count", "view_count",
            "comment_count", "is_featured", "is_faculty_verified",
            "status", "tags", "target_role", "skills_covered",
            "creator_name", "creator_role", "created_at",
            "progress", "is_liked", "is_bookmarked",
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

    def get_is_liked(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return RoadmapLike.objects.filter(roadmap=obj, user=request.user).exists()

    def get_is_bookmarked(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return RoadmapBookmark.objects.filter(roadmap=obj, user=request.user).exists()


# ── Roadmap Detail Serializer ─────────────────────────────────────────────────

class RoadmapDetailSerializer(RoadmapListSerializer):
    milestones = RoadmapMilestoneSerializer(many=True, read_only=True)
    prerequisites = serializers.CharField()

    class Meta(RoadmapListSerializer.Meta):
        fields = RoadmapListSerializer.Meta.fields + [
            "prerequisites", "milestones", "reviewed_at",
            "review_notes", "rejection_reason", "submitted_at",
        ]


# ── Roadmap Create/Edit Serializer (Student) ─────────────────────────────────

class RoadmapCreateSerializer(serializers.ModelSerializer):
    milestones = MilestoneCreateSerializer(many=True, required=False)

    class Meta:
        model = Roadmap
        fields = [
            "title", "category", "description", "icon", "color",
            "estimated_weeks", "difficulty", "prerequisites",
            "skills_covered", "target_role", "tags", "milestones",
        ]
        extra_kwargs = {
            "title": {"required": True},
            "category": {"required": True},
            "description": {"required": True},
        }

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 5:
            raise serializers.ValidationError("Title must be at least 5 characters.")
        if len(value) > 200:
            raise serializers.ValidationError("Title must be under 200 characters.")
        return value

    def validate_description(self, value):
        if len(value.strip()) < 20:
            raise serializers.ValidationError("Description must be at least 20 characters.")
        return value.strip()

    def create(self, validated_data):
        milestones_data = validated_data.pop("milestones", [])
        roadmap = Roadmap.objects.create(**validated_data)

        total_steps = 0
        for m_idx, milestone_data in enumerate(milestones_data):
            steps_data = milestone_data.pop("steps", [])
            milestone_data["order"] = milestone_data.get("order", m_idx)
            milestone = RoadmapMilestone.objects.create(roadmap=roadmap, **milestone_data)
            for s_idx, step_data in enumerate(steps_data):
                step_data["order"] = step_data.get("order", s_idx)
                RoadmapStep.objects.create(milestone=milestone, **step_data)
                total_steps += 1

        roadmap.total_steps = total_steps
        roadmap.save(update_fields=["total_steps"])
        return roadmap

    def update(self, instance, validated_data):
        milestones_data = validated_data.pop("milestones", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # If milestones provided, rebuild them
        if milestones_data is not None:
            instance.milestones.all().delete()
            total_steps = 0
            for m_idx, milestone_data in enumerate(milestones_data):
                steps_data = milestone_data.pop("steps", [])
                milestone_data["order"] = milestone_data.get("order", m_idx)
                milestone = RoadmapMilestone.objects.create(roadmap=instance, **milestone_data)
                for s_idx, step_data in enumerate(steps_data):
                    step_data["order"] = step_data.get("order", s_idx)
                    RoadmapStep.objects.create(milestone=milestone, **step_data)
                    total_steps += 1
            instance.total_steps = total_steps
            instance.save(update_fields=["total_steps"])

        return instance


# ── Comment Serializer ────────────────────────────────────────────────────────

class RoadmapCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    user_role = serializers.CharField(source="user.role", read_only=True)
    replies_count = serializers.SerializerMethodField()

    class Meta:
        model = RoadmapComment
        fields = [
            "id", "user", "user_name", "user_role", "content",
            "parent", "is_deleted", "replies_count", "created_at",
        ]
        read_only_fields = ["id", "user", "user_name", "user_role", "is_deleted", "created_at"]

    def get_replies_count(self, obj):
        return obj.replies.filter(is_deleted=False).count()


# ── Admin Serializers ─────────────────────────────────────────────────────────

class RoadmapAdminSerializer(serializers.ModelSerializer):
    creator_name = serializers.CharField(source="created_by.full_name", read_only=True, default="")
    reviewer_name = serializers.CharField(source="reviewed_by.full_name", read_only=True, default="")

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
