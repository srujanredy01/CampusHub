"""
Serializers for the Feedback & Issue Reporting system.
"""
from rest_framework import serializers
from .models import FeedbackReport, FeedbackAttachment, FeedbackResponse, FeedbackStatusHistory


class FeedbackAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = FeedbackAttachment
        fields = ("id", "file_name", "file_size", "content_type", "url", "uploaded_at")
        read_only_fields = ("id", "uploaded_at")

    def get_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class FeedbackResponseSerializer(serializers.ModelSerializer):
    responder_name = serializers.CharField(source="responder.full_name", read_only=True)
    responder_role = serializers.CharField(source="responder.role", read_only=True)

    class Meta:
        model = FeedbackResponse
        fields = ("id", "message", "is_internal", "responder_name", "responder_role", "created_at")
        read_only_fields = ("id", "responder_name", "responder_role", "created_at")


class FeedbackStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.full_name", read_only=True)

    class Meta:
        model = FeedbackStatusHistory
        fields = ("id", "old_status", "new_status", "note", "changed_by_name", "created_at")
        read_only_fields = fields


class FeedbackReportListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_role = serializers.CharField(source="user.role", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.full_name", read_only=True, default=None)
    attachment_count = serializers.SerializerMethodField()

    class Meta:
        model = FeedbackReport
        fields = (
            "id", "tracking_id", "feedback_type", "severity", "title",
            "status", "priority", "page_url", "route_path",
            "user_name", "user_email", "user_role",
            "assigned_to_name", "attachment_count",
            "created_at", "updated_at",
        )
        read_only_fields = fields

    def get_attachment_count(self, obj):
        return obj.attachments.count()


class FeedbackReportDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer with attachments, responses, and history."""
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    user_email = serializers.CharField(source="user.email", read_only=True)
    user_role = serializers.CharField(source="user.role", read_only=True)
    user_section = serializers.CharField(source="user.section", read_only=True)
    user_branch = serializers.CharField(source="user.branch", read_only=True)
    assigned_to_name = serializers.CharField(source="assigned_to.full_name", read_only=True, default=None)
    resolved_by_name = serializers.CharField(source="resolved_by.full_name", read_only=True, default=None)
    attachments = FeedbackAttachmentSerializer(many=True, read_only=True)
    responses = serializers.SerializerMethodField()
    status_history = FeedbackStatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = FeedbackReport
        fields = (
            "id", "tracking_id", "feedback_type", "severity", "title", "description",
            "tags", "page_url", "route_path", "browser_info", "device_type",
            "screen_resolution", "user_agent",
            "status", "priority", "assigned_to", "assigned_to_name",
            "resolved_by", "resolved_by_name", "resolution_note", "resolved_at",
            "is_archived",
            "user_name", "user_email", "user_role", "user_section", "user_branch",
            "attachments", "responses", "status_history",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "tracking_id", "user_name", "user_email", "user_role",
            "user_section", "user_branch", "attachments", "responses",
            "status_history", "created_at", "updated_at",
        )

    def get_responses(self, obj):
        """Filter internal responses for non-admin users."""
        request = self.context.get("request")
        qs = obj.responses.all()
        if request and request.user.role not in ("admin", "super_admin", "moderator"):
            qs = qs.filter(is_internal=False)
        return FeedbackResponseSerializer(qs, many=True, context=self.context).data


class FeedbackSubmitSerializer(serializers.Serializer):
    """Serializer for submitting new feedback."""
    feedback_type = serializers.ChoiceField(choices=FeedbackReport.FEEDBACK_TYPE_CHOICES)
    severity = serializers.ChoiceField(choices=FeedbackReport.SEVERITY_CHOICES, default="medium")
    title = serializers.CharField(max_length=255, required=False, default="")
    description = serializers.CharField(min_length=10)
    tags = serializers.ListField(child=serializers.CharField(max_length=50), required=False, default=list)

    # Page context
    page_url = serializers.CharField(max_length=500, required=False, default="")
    route_path = serializers.CharField(max_length=255, required=False, default="")
    browser_info = serializers.CharField(max_length=500, required=False, default="")
    device_type = serializers.CharField(max_length=50, required=False, default="")
    screen_resolution = serializers.CharField(max_length=50, required=False, default="")


class FeedbackAdminUpdateSerializer(serializers.Serializer):
    """Serializer for admin updates to feedback reports."""
    status = serializers.ChoiceField(choices=FeedbackReport.STATUS_CHOICES, required=False)
    priority = serializers.ChoiceField(choices=FeedbackReport.PRIORITY_CHOICES, required=False)
    assigned_to = serializers.UUIDField(required=False, allow_null=True)
    resolution_note = serializers.CharField(required=False, default="")
    note = serializers.CharField(required=False, default="", help_text="Note for status change")


class FeedbackResponseCreateSerializer(serializers.Serializer):
    """Serializer for creating admin responses."""
    message = serializers.CharField(min_length=1)
    is_internal = serializers.BooleanField(default=False)
