from django.urls import path
from .views import (
    SavedItemListView,
    SavedCodingListView,
    SavedNewsListView,
    SavedResourcesListView,
    SavedAssignmentsListView,
    SavedContestsListView,
    SavedRoadmapsListView,
    SavedItemCreateView,
    SavedItemDeleteView,
    SavedItemUnsaveByObjectView,
    SavedItemCheckView,
    SavedCountsView,
)

urlpatterns = [
    path("", SavedItemCreateView.as_view(), name="saved-create"),
    path("list", SavedItemListView.as_view(), name="saved-list"),
    path("coding", SavedCodingListView.as_view(), name="saved-coding"),
    path("news", SavedNewsListView.as_view(), name="saved-news"),
    path("resources", SavedResourcesListView.as_view(), name="saved-resources"),
    path("assignments", SavedAssignmentsListView.as_view(), name="saved-assignments"),
    path("contests", SavedContestsListView.as_view(), name="saved-contests"),
    path("roadmaps", SavedRoadmapsListView.as_view(), name="saved-roadmaps"),
    path("check", SavedItemCheckView.as_view(), name="saved-check"),
    path("counts", SavedCountsView.as_view(), name="saved-counts"),
    path("unsave", SavedItemUnsaveByObjectView.as_view(), name="saved-unsave"),
    path("<uuid:pk>", SavedItemDeleteView.as_view(), name="saved-delete"),
]
