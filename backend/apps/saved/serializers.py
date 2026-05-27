"""
Saved Content serializers with full content resolution for all supported types.
"""
from rest_framework import serializers
from .models import SavedItem


class SavedItemSerializer(serializers.ModelSerializer):
    """Serializer for saved items with resolved content details."""
    content_detail = serializers.SerializerMethodField()

    class Meta:
        model = SavedItem
        fields = ["id", "content_type", "object_id", "saved_at", "metadata", "content_detail"]
        read_only_fields = ["id", "saved_at"]

    def get_content_detail(self, obj):
        """Resolve the actual content object based on content_type."""
        try:
            if obj.content_type == "coding_problem":
                return self._resolve_coding_problem(obj.object_id)
            elif obj.content_type == "news_article":
                return self._resolve_news_article(obj.object_id)
            elif obj.content_type == "resource":
                return self._resolve_resource(obj.object_id)
            elif obj.content_type == "assignment":
                return self._resolve_assignment(obj.object_id)
            elif obj.content_type == "contest":
                return self._resolve_contest(obj.object_id)
            elif obj.content_type == "roadmap":
                return self._resolve_roadmap(obj.object_id)
        except Exception:
            pass
        return None

    def _resolve_coding_problem(self, object_id):
        from apps.coding.models import CodingQuestion
        question = CodingQuestion.objects.filter(pk=object_id, is_active=True).first()
        if question:
            return {
                "id": str(question.id),
                "title": question.title,
                "difficulty": question.difficulty,
                "topic": question.topic,
                "topic_tags": question.topic_tags,
                "slug": question.slug,
                "acceptance_rate": question.acceptance_rate,
            }
        return None

    def _resolve_news_article(self, object_id):
        from apps.news.models import NewsAnnouncement
        article = NewsAnnouncement.objects.filter(pk=object_id, is_active=True).first()
        if article:
            return {
                "id": str(article.id),
                "title": article.title,
                "short_description": article.short_description,
                "category": article.category,
                "priority": article.priority,
                "created_at": article.created_at.isoformat(),
                "slug": article.slug,
            }
        return None

    def _resolve_resource(self, object_id):
        from apps.resources.models import Resource
        resource = Resource.objects.filter(pk=object_id, is_active=True).first()
        if resource:
            return {
                "id": str(resource.id),
                "title": resource.title,
                "file_type": resource.file_type,
                "subject": resource.subject,
                "branch": resource.branch,
                "academic_year": resource.academic_year,
                "semester": resource.semester,
                "file_size": resource.file_size,
                "download_count": resource.download_count,
            }
        return None

    def _resolve_assignment(self, object_id):
        from apps.assignments.models import Assignment
        assignment = Assignment.objects.filter(pk=object_id, is_active=True).first()
        if assignment:
            return {
                "id": str(assignment.id),
                "title": assignment.title,
                "subject": assignment.subject,
                "deadline": assignment.deadline.isoformat(),
                "max_marks": assignment.max_marks,
                "branch": assignment.branch,
                "semester": assignment.semester,
                "created_at": assignment.created_at.isoformat(),
            }
        return None

    def _resolve_contest(self, object_id):
        from apps.coding.models import Contest
        contest = Contest.objects.filter(pk=object_id).first()
        if contest:
            return {
                "id": str(contest.id),
                "title": contest.title,
                "description": contest.description[:200] if contest.description else "",
                "starts_at": contest.starts_at.isoformat(),
                "ends_at": contest.ends_at.isoformat(),
                "status": contest.status,
                "phase": contest.phase,
            }
        return None

    def _resolve_roadmap(self, object_id):
        from apps.roadmaps.models import Roadmap
        roadmap = Roadmap.objects.filter(pk=object_id, is_active=True).first()
        if roadmap:
            return {
                "id": str(roadmap.id),
                "title": roadmap.title,
                "slug": roadmap.slug,
                "category": roadmap.category,
                "difficulty": roadmap.difficulty,
                "estimated_weeks": roadmap.estimated_weeks,
                "icon": roadmap.icon,
                "color": roadmap.color,
                "enrolled_count": roadmap.enrolled_count,
            }
        return None


class SavedItemCreateSerializer(serializers.Serializer):
    """Serializer for creating a saved item."""
    object_id = serializers.UUIDField()
    content_type = serializers.ChoiceField(choices=SavedItem.CONTENT_TYPE_CHOICES)

    def validate(self, attrs):
        content_type = attrs["content_type"]
        object_id = attrs["object_id"]

        # Validate that the referenced object exists
        if content_type == "coding_problem":
            from apps.coding.models import CodingQuestion
            if not CodingQuestion.objects.filter(pk=object_id, is_active=True).exists():
                raise serializers.ValidationError("Coding problem not found.")
        elif content_type == "news_article":
            from apps.news.models import NewsAnnouncement
            if not NewsAnnouncement.objects.filter(pk=object_id, is_active=True).exists():
                raise serializers.ValidationError("News article not found.")
        elif content_type == "resource":
            from apps.resources.models import Resource
            if not Resource.objects.filter(pk=object_id, is_active=True).exists():
                raise serializers.ValidationError("Resource not found.")
        elif content_type == "assignment":
            from apps.assignments.models import Assignment
            if not Assignment.objects.filter(pk=object_id, is_active=True).exists():
                raise serializers.ValidationError("Assignment not found.")
        elif content_type == "contest":
            from apps.coding.models import Contest
            if not Contest.objects.filter(pk=object_id).exists():
                raise serializers.ValidationError("Contest not found.")
        elif content_type == "roadmap":
            from apps.roadmaps.models import Roadmap
            if not Roadmap.objects.filter(pk=object_id, is_active=True).exists():
                raise serializers.ValidationError("Roadmap not found.")

        return attrs
