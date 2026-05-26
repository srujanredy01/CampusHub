from django.urls import path
from .views import (
    RoadmapListView, RoadmapDetailView, RoadmapEnrollView,
    RoadmapCompleteStepView, RoadmapUncompleteStepView, MyRoadmapsView,
)

urlpatterns = [
    path("", RoadmapListView.as_view(), name="roadmap-list"),
    path("my", MyRoadmapsView.as_view(), name="roadmap-my"),
    path("<slug:slug>", RoadmapDetailView.as_view(), name="roadmap-detail"),
    path("<slug:slug>/enroll", RoadmapEnrollView.as_view(), name="roadmap-enroll"),
    path("steps/<uuid:step_id>/complete", RoadmapCompleteStepView.as_view(), name="roadmap-step-complete"),
    path("steps/<uuid:step_id>/uncomplete", RoadmapUncompleteStepView.as_view(), name="roadmap-step-uncomplete"),
]
