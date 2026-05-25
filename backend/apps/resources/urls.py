from django.urls import path
from .views import (
    ResourceListView,
    ResourceCountsView,
    ResourceDetailView,
    ResourceUploadView,
    ResourceManageView,
    ResourceDownloadView,
    ResourcePreviewView,
    ResourceToggleActiveView,
)

urlpatterns = [
    path("",                          ResourceListView.as_view(),         name="resource-list"),
    path("counts",                    ResourceCountsView.as_view(),       name="resource-counts"),
    path("upload",                    ResourceUploadView.as_view(),       name="resource-upload"),
    path("<uuid:pk>",                 ResourceDetailView.as_view(),       name="resource-detail"),
    path("<uuid:pk>/manage",          ResourceManageView.as_view(),       name="resource-manage"),
    path("<uuid:pk>/download",        ResourceDownloadView.as_view(),     name="resource-download"),
    path("<uuid:pk>/preview",         ResourcePreviewView.as_view(),      name="resource-preview"),
    path("<uuid:pk>/toggle-active",   ResourceToggleActiveView.as_view(), name="resource-toggle"),
]
