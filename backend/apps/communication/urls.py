from django.urls import path
from .views import (
    ChannelListView, ChannelDetailView, ChannelCreateView,
    ChannelJoinView, ChannelLeaveView, ChannelMembersView,
    ChannelMessagesView, MessageSendView, MessageEditView,
    MessageDeleteView, MessagePinView, MessageReactionView,
    ThreadMessagesView, PinnedMessagesView, MessageSearchView,
    ConversationListView, ConversationCreateView, ConversationMessagesView,
    PresenceView, UpdatePresenceView, ReportMessageView,
    ModerationMuteView, ModerationBanView,
    BlockUserView, BlockedUsersListView,
)

urlpatterns = [
    # Channels
    path("channels", ChannelListView.as_view(), name="comm-channels"),
    path("channels/create", ChannelCreateView.as_view(), name="comm-channel-create"),
    path("channels/<slug:slug>", ChannelDetailView.as_view(), name="comm-channel-detail"),
    path("channels/<slug:slug>/join", ChannelJoinView.as_view(), name="comm-channel-join"),
    path("channels/<slug:slug>/leave", ChannelLeaveView.as_view(), name="comm-channel-leave"),
    path("channels/<slug:slug>/members", ChannelMembersView.as_view(), name="comm-channel-members"),
    path("channels/<slug:slug>/messages", ChannelMessagesView.as_view(), name="comm-channel-messages"),
    path("channels/<slug:slug>/pinned", PinnedMessagesView.as_view(), name="comm-channel-pinned"),
    # Messages
    path("messages", MessageSendView.as_view(), name="comm-message-send"),
    path("messages/search", MessageSearchView.as_view(), name="comm-message-search"),
    path("messages/<uuid:pk>", MessageEditView.as_view(), name="comm-message-edit"),
    path("messages/<uuid:pk>/delete", MessageDeleteView.as_view(), name="comm-message-delete"),
    path("messages/<uuid:pk>/pin", MessagePinView.as_view(), name="comm-message-pin"),
    path("messages/<uuid:pk>/react", MessageReactionView.as_view(), name="comm-message-react"),
    path("messages/<uuid:pk>/report", ReportMessageView.as_view(), name="comm-message-report"),
    path("messages/<uuid:pk>/thread", ThreadMessagesView.as_view(), name="comm-message-thread"),
    # Direct Messages
    path("conversations", ConversationListView.as_view(), name="comm-conversations"),
    path("conversations/create", ConversationCreateView.as_view(), name="comm-conversation-create"),
    path("conversations/<uuid:pk>/messages", ConversationMessagesView.as_view(), name="comm-conversation-messages"),
    # Presence
    path("presence", PresenceView.as_view(), name="comm-presence"),
    path("presence/update", UpdatePresenceView.as_view(), name="comm-presence-update"),
    # Block
    path("block", BlockUserView.as_view(), name="comm-block"),
    path("blocked", BlockedUsersListView.as_view(), name="comm-blocked-list"),
    # Moderation
    path("channels/<slug:slug>/mute/<uuid:user_id>", ModerationMuteView.as_view(), name="comm-mute"),
    path("channels/<slug:slug>/ban/<uuid:user_id>", ModerationBanView.as_view(), name="comm-ban"),
]
