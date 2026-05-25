from django.urls import path
from .views import (
    NewsListView,
    NewsDetailView,
    NewsSaveView,
    NewsUnsaveView,
    NewsSavedListView,
    NewsCreateView,
    NewsManageView,
    NewsPinView,
)

urlpatterns = [
    path("",                      NewsListView.as_view(),      name="news-list"),
    path("create",                NewsCreateView.as_view(),    name="news-create"),
    path("save",                  NewsSaveView.as_view(),      name="news-save"),
    path("saved",                 NewsSavedListView.as_view(), name="news-saved"),
    path("<uuid:pk>",             NewsDetailView.as_view(),    name="news-detail"),
    path("<uuid:pk>/manage",      NewsManageView.as_view(),    name="news-manage"),
    path("<uuid:pk>/unsave",      NewsUnsaveView.as_view(),    name="news-unsave"),
    path("<uuid:pk>/pin",         NewsPinView.as_view(),       name="news-pin"),
]
