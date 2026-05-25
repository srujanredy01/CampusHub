from django.urls import path
from .executor_views import CodeRunView, CodeSubmitView

urlpatterns = [
    path("run", CodeRunView.as_view(), name="code-run"),
    path("submit", CodeSubmitView.as_view(), name="code-submit"),
]
