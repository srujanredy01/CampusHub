from django.urls import path
from .views import (
    ResumeTemplateListView, ResumeListCreateView,
    ResumeDetailView, ResumeExportView,
)

urlpatterns = [
    path("", ResumeListCreateView.as_view(), name="resume-list-create"),
    path("templates", ResumeTemplateListView.as_view(), name="resume-templates"),
    path("<uuid:pk>", ResumeDetailView.as_view(), name="resume-detail"),
    path("<uuid:pk>/export", ResumeExportView.as_view(), name="resume-export"),
]
