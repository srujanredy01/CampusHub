import api from "./api";

export const communicationService = {
  // Channels
  getChannels: (params = {}) => api.get("/communication/channels", { params }),
  getChannel: (slug) => api.get(`/communication/channels/${slug}`),
  createChannel: (data) => api.post("/communication/channels/create", data),
  joinChannel: (slug) => api.post(`/communication/channels/${slug}/join`),
  leaveChannel: (slug) => api.post(`/communication/channels/${slug}/leave`),
  getChannelMembers: (slug, params = {}) => api.get(`/communication/channels/${slug}/members`, { params }),

  // Channel Requests (moderated creation)
  requestChannel: (data) => api.post("/communication/channels/request", data),
  getMyRequests: () => api.get("/communication/channels/requests"),

  // Messages
  getMessages: (slug, params = {}) => api.get(`/communication/channels/${slug}/messages`, { params }),
  sendMessage: (data) => api.post("/communication/messages", data),
  editMessage: (msgId, data) => api.put(`/communication/messages/${msgId}`, data),
  deleteMessage: (msgId) => api.delete(`/communication/messages/${msgId}/delete`),
  pinMessage: (msgId) => api.post(`/communication/messages/${msgId}/pin`),
  getPinnedMessages: (slug) => api.get(`/communication/channels/${slug}/pinned`),
  searchMessages: (params) => api.get("/communication/messages/search", { params }),

  // Reactions
  toggleReaction: (msgId, emoji) => api.post(`/communication/messages/${msgId}/react`, { emoji }),

  // Threads
  getThread: (msgId) => api.get(`/communication/messages/${msgId}/thread`),

  // Direct Messages
  getConversations: (params = {}) => api.get("/communication/conversations", { params }),
  createConversation: (data) => api.post("/communication/conversations/create", data),
  getConversationMessages: (id, params = {}) => api.get(`/communication/conversations/${id}/messages`, { params }),

  // Presence
  getOnlineUsers: (params = {}) => api.get("/communication/presence", { params }),
  updatePresence: (data) => api.post("/communication/presence/update", data),

  // Reports
  reportMessage: (msgId, data) => api.post(`/communication/messages/${msgId}/report`, data),

  // Block
  blockUser: (data) => api.post("/communication/block", data),
  unblockUser: (data) => api.delete("/communication/block", { data }),
  getBlockedUsers: () => api.get("/communication/blocked"),

  // Admin
  getChannelRequests: (params = {}) => api.get("/admin/communication/channel-requests", { params }),
  reviewChannelRequest: (id, data) => api.post(`/admin/communication/channel-requests/${id}/review`, data),
};

export default communicationService;
