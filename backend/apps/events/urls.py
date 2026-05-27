from django.urls import path
from .views import (
    EventListView, EventDetailView, EventRegisterView,
    EventCancelRegistrationView, MyRegistrationsView, MyCertificatesView,
    EventFeedbackView, EventPollsView, EventPollVoteView,
    EventQuestionsView, EventQuestionUpvoteView,
    EventAnnouncementsView, EventChatMessagesView,
    FacultyEventCreateView, FacultyEventEditView,
    FacultyEventRegistrationsView, FacultyEventCheckinView,
    FacultyCreateAnnouncementView, FacultyCreatePollView,
    FacultyAnswerQuestionView, FacultyIssueCertificateView,
)

urlpatterns = [
    # Student
    path("", EventListView.as_view(), name="event-list"),
    path("my-registrations", MyRegistrationsView.as_view(), name="event-my-registrations"),
    path("my-certificates", MyCertificatesView.as_view(), name="event-my-certificates"),
    path("create", FacultyEventCreateView.as_view(), name="event-create"),
    path("checkin", FacultyEventCheckinView.as_view(), name="event-checkin"),
    path("polls/<uuid:pk>/vote", EventPollVoteView.as_view(), name="event-poll-vote"),
    path("questions/<uuid:pk>/upvote", EventQuestionUpvoteView.as_view(), name="event-question-upvote"),
    path("questions/<uuid:pk>/answer", FacultyAnswerQuestionView.as_view(), name="event-question-answer"),
    path("<slug:slug>", EventDetailView.as_view(), name="event-detail"),
    path("<slug:slug>/register", EventRegisterView.as_view(), name="event-register"),
    path("<slug:slug>/cancel-registration", EventCancelRegistrationView.as_view(), name="event-cancel-reg"),
    path("<slug:slug>/feedback", EventFeedbackView.as_view(), name="event-feedback"),
    path("<slug:slug>/polls", EventPollsView.as_view(), name="event-polls"),
    path("<slug:slug>/questions", EventQuestionsView.as_view(), name="event-questions"),
    path("<slug:slug>/announcements", EventAnnouncementsView.as_view(), name="event-announcements"),
    path("<slug:slug>/chat", EventChatMessagesView.as_view(), name="event-chat"),
    path("<slug:slug>/edit", FacultyEventEditView.as_view(), name="event-edit"),
    path("<slug:slug>/registrations", FacultyEventRegistrationsView.as_view(), name="event-registrations"),
    path("<slug:slug>/certificates/issue", FacultyIssueCertificateView.as_view(), name="event-issue-certs"),
    path("<slug:slug>/polls/create", FacultyCreatePollView.as_view(), name="event-poll-create"),
    path("<slug:slug>/announcements/create", FacultyCreateAnnouncementView.as_view(), name="event-announcement-create"),
]
