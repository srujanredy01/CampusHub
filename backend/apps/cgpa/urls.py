from django.urls import path
from .views import (
    CGPAView,
    SemesterListCreateView,
    SemesterDetailView,
    BulkSaveSemestersView,
    GradeConverterView,
    GradePredictorView,
    TargetPredictorView,
    CGPAAnalyticsView,
    CGPAHistoryView,
    WeakSubjectsView,
    AcademicTargetListCreateView,
    AcademicTargetDetailView,
    FacultyUploadMarksView,
    FacultyStudentAnalyticsView,
    AdminCGPAListView,
    AdminCGPADetailView,
    AdminCGPAAnalyticsView,
    AdminCGPAExportView,
)

urlpatterns = [
    # Student endpoints
    path("", CGPAView.as_view(), name="cgpa"),
    path("semester", SemesterListCreateView.as_view(), name="cgpa-semester"),
    path("semester/<uuid:pk>", SemesterDetailView.as_view(), name="cgpa-semester-detail"),
    path("bulk-save", BulkSaveSemestersView.as_view(), name="cgpa-bulk-save"),
    path("grade-convert", GradeConverterView.as_view(), name="cgpa-grade-convert"),
    path("predict-target", TargetPredictorView.as_view(), name="cgpa-predict-target"),
    path("predict-grade", GradePredictorView.as_view(), name="cgpa-predict-grade"),
    path("analytics", CGPAAnalyticsView.as_view(), name="cgpa-analytics"),
    path("history", CGPAHistoryView.as_view(), name="cgpa-history"),
    path("weak-subjects", WeakSubjectsView.as_view(), name="cgpa-weak-subjects"),
    path("targets", AcademicTargetListCreateView.as_view(), name="cgpa-targets"),
    path("targets/<uuid:pk>", AcademicTargetDetailView.as_view(), name="cgpa-target-detail"),

    # Faculty endpoints
    path("faculty/upload-marks", FacultyUploadMarksView.as_view(), name="cgpa-faculty-upload"),
    path("faculty/analytics", FacultyStudentAnalyticsView.as_view(), name="cgpa-faculty-analytics"),

    # Admin endpoints
    path("admin/records", AdminCGPAListView.as_view(), name="cgpa-admin-records"),
    path("admin/records/<uuid:user_id>", AdminCGPADetailView.as_view(), name="cgpa-admin-record-detail"),
    path("admin/analytics", AdminCGPAAnalyticsView.as_view(), name="cgpa-admin-analytics"),
    path("admin/export", AdminCGPAExportView.as_view(), name="cgpa-admin-export"),
]
