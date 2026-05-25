from django.urls import path
from .views import (
    CompanyListView, CompanyCreateView,
    ApplicationListView, ApplicationCreateView,
    ApplicationDetailView, RoundCreateView,
    PlacementKanbanView, PlacementStatsView,
    AdminCompanyListView, AdminCompanyDetailView, AdminPlacementAnalyticsView,
)

urlpatterns = [
    # Student endpoints
    path("companies",                    CompanyListView.as_view(),      name="company-list"),
    path("companies/create",             CompanyCreateView.as_view(),    name="company-create"),
    path("applications",                 ApplicationListView.as_view(),  name="application-list"),
    path("applications/create",          ApplicationCreateView.as_view(),name="application-create"),
    path("applications/<uuid:pk>",       ApplicationDetailView.as_view(),name="application-detail"),
    path("applications/<uuid:pk>/rounds",RoundCreateView.as_view(),      name="round-create"),
    path("kanban",                       PlacementKanbanView.as_view(),  name="placement-kanban"),
    path("stats",                        PlacementStatsView.as_view(),   name="placement-stats"),

    # Admin endpoints
    path("admin/companies",              AdminCompanyListView.as_view(),      name="admin-company-list"),
    path("admin/companies/<uuid:pk>",    AdminCompanyDetailView.as_view(),    name="admin-company-detail"),
    path("admin/analytics",              AdminPlacementAnalyticsView.as_view(),name="admin-placement-analytics"),
]
