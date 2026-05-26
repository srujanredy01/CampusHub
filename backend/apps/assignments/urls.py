from django.urls import path
from .views import (
    AssignmentListView, AssignmentDetailView, AssignmentSubmitView,
    AssignmentCommentView, MyAssignmentsView,
)

urlpatterns = [
    path("", AssignmentListView.as_view(), name="assignment-list"),
    path("my", MyAssignmentsView.as_view(), name="assignment-my"),
    path("<uuid:pk>", AssignmentDetailView.as_view(), name="assignment-detail"),
    path("<uuid:pk>/submit", AssignmentSubmitView.as_view(), name="assignment-submit"),
    path("submissions/<uuid:sub_id>/comments", AssignmentCommentView.as_view(), name="assignment-comment"),
]
