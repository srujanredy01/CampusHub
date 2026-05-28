"""
URL configuration for the Feedback & Issue Reporting system.
"""
from django.urls import path
from . import views

urlpatterns = [
    # User endpoints
    path("submit", views.FeedbackSubmitView.as_view(), name="feedback-submit"),
    path("upload/<uuid:report_id>", views.FeedbackUploadAttachmentView.as_view(), name="feedback-upload"),
    path("my-reports", views.FeedbackUserListView.as_view(), name="feedback-user-list"),
    path("my-reports/<uuid:report_id>", views.FeedbackUserDetailView.as_view(), name="feedback-user-detail"),

    # Admin/Moderator endpoints
    path("admin/list", views.FeedbackAdminListView.as_view(), name="feedback-admin-list"),
    path("admin/<uuid:report_id>", views.FeedbackAdminDetailView.as_view(), name="feedback-admin-detail"),
    path("admin/<uuid:report_id>/respond", views.FeedbackAdminRespondView.as_view(), name="feedback-admin-respond"),
    path("admin/<uuid:report_id>/archive", views.FeedbackAdminArchiveView.as_view(), name="feedback-admin-archive"),
    path("admin/analytics", views.FeedbackAnalyticsView.as_view(), name="feedback-analytics"),
]
