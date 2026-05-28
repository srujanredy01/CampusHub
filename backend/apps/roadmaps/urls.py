from django.urls import path
from .views import (
    RoadmapListView, RoadmapDetailView, RoadmapCreateView,
    RoadmapUpdateView, RoadmapSubmitView, RoadmapDeleteView,
    RoadmapEnrollView, RoadmapCompleteStepView, RoadmapUncompleteStepView,
    MyRoadmapsView, MyCreatedRoadmapsView,
    RoadmapLikeView, RoadmapBookmarkView, RoadmapRateView,
    RoadmapCommentsView, RoadmapReportView, RoadmapBookmarkedListView,
    ModeratorRoadmapQueueView, ModeratorRoadmapReviewView,
)

urlpatterns = [
    # ── Public Library ────────────────────────────────────────────────────────
    path("", RoadmapListView.as_view(), name="roadmap-list"),

    # ── Student Actions (static paths before slug) ────────────────────────────
    path("create", RoadmapCreateView.as_view(), name="roadmap-create"),
    path("my", MyRoadmapsView.as_view(), name="roadmap-my"),
    path("my-created", MyCreatedRoadmapsView.as_view(), name="roadmap-my-created"),
    path("bookmarked", RoadmapBookmarkedListView.as_view(), name="roadmap-bookmarked"),

    # ── Step Completion ───────────────────────────────────────────────────────
    path("steps/<uuid:step_id>/complete", RoadmapCompleteStepView.as_view(), name="roadmap-step-complete"),
    path("steps/<uuid:step_id>/uncomplete", RoadmapUncompleteStepView.as_view(), name="roadmap-step-uncomplete"),

    # ── Moderation ────────────────────────────────────────────────────────────
    path("moderation/queue", ModeratorRoadmapQueueView.as_view(), name="roadmap-mod-queue"),
    path("moderation/<slug:slug>/review", ModeratorRoadmapReviewView.as_view(), name="roadmap-mod-review"),

    # ── Roadmap Detail (slug-based) ──────────────────────────────────────────
    path("<slug:slug>", RoadmapDetailView.as_view(), name="roadmap-detail"),
    path("<slug:slug>/edit", RoadmapUpdateView.as_view(), name="roadmap-edit"),
    path("<slug:slug>/submit", RoadmapSubmitView.as_view(), name="roadmap-submit"),
    path("<slug:slug>/delete", RoadmapDeleteView.as_view(), name="roadmap-delete"),
    path("<slug:slug>/enroll", RoadmapEnrollView.as_view(), name="roadmap-enroll"),
    path("<slug:slug>/like", RoadmapLikeView.as_view(), name="roadmap-like"),
    path("<slug:slug>/bookmark", RoadmapBookmarkView.as_view(), name="roadmap-bookmark"),
    path("<slug:slug>/rate", RoadmapRateView.as_view(), name="roadmap-rate"),
    path("<slug:slug>/comments", RoadmapCommentsView.as_view(), name="roadmap-comments"),
    path("<slug:slug>/report", RoadmapReportView.as_view(), name="roadmap-report"),
]
