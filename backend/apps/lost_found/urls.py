from django.urls import path
from .views import (
    LostFoundListView, LostFoundCreateView, LostFoundDetailView,
    LostFoundClaimView, LostFoundResolveView, LostFoundFlagView,
    MyLostFoundView,
)

urlpatterns = [
    path("", LostFoundListView.as_view(), name="lost-found-list"),
    path("create", LostFoundCreateView.as_view(), name="lost-found-create"),
    path("my", MyLostFoundView.as_view(), name="lost-found-my"),
    path("<uuid:pk>", LostFoundDetailView.as_view(), name="lost-found-detail"),
    path("<uuid:pk>/claim", LostFoundClaimView.as_view(), name="lost-found-claim"),
    path("<uuid:pk>/resolve", LostFoundResolveView.as_view(), name="lost-found-resolve"),
    path("<uuid:pk>/flag", LostFoundFlagView.as_view(), name="lost-found-flag"),
]
