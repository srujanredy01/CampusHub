import api from "./api";

export const communicationService = {
  // Channels
  getChannels: (params = {}) => api.get("/communication/channels", { params }),
  getChannel: (slug) => api.get(`/communication/channels/${slug}`),
  createChannel: (data) => api.post("/communication/channels", data),
  updateChannel: (slug, data) => api.put(`/communication/channels/${slug}`, data),
  deleteChannel: (slug) => api.delete(`/communication/channels/${slug}`),
  joinChannel: (slug) => api.post(`/communication/channels/${slug}/join`),
  leaveChannel: (slug) => api.post(`/communication/channels/${slug}/leave`),
  getChannelMembers: (slug, params = {}) => api.get(`/communication/channels/${slug}/members`, { params }),

  // Messages
  getMessages: (slug, params = {}) => api.get(`/communication/channels/${slug}/messages`, { params }),
  sendMessage: (slug, data) => api.post(`/communication/channels/${slug}/messages`, data),
  editMessage: (msgId, data) => api.put(`/communication/messages/${msgId}`, data),
  deleteMessage: (msgId) => api.delete(`/communication/messages/${msgId}`),
  pinMessage: (msgId) => api.post(`/communication/messages/${msgId}/pin`),
  unpinMessage: (msgId) => api.post(`/communication/messages/${msgId}/unpin`),
  getPinnedMessages: (slug) => api.get(`/communication/channels/${slug}/pinned`),

  // Reactions
  addReaction: (msgId, emoji) => api.post(`/communication/messages/${msgId}/react`, { emoji }),
  removeReaction: (msgId, emoji) => api.delete(`/communication/messages/${msgId}/react`, { data: { emoji } }),

  // Threads
  getThread: (msgId, params = {}) => api.get(`/communication/messages/${msgId}/thread`, { params }),

  // Direct Messages
  getConversations: (params = {}) => api.get("/communication/conversations", { params }),
  getConversation: (id) => api.get(`/communication/conversations/${id}`),
  createConversation: (data) => api.post("/communication/conversations", data),
  getConversationMessages: (id, params = {}) => api.get(`/communication/conversations/${id}/messages`, { params }),
  sendDM: (id, data) => api.post(`/communication/conversations/${id}/messages`, data),

  // Presence
  getOnlineUsers: () => api.get("/communication/online"),
  updatePresence: (status) => api.post("/communication/presence", { status }),

  // Search
  searchMessages: (params) => api.get("/communication/search", { params }),

  // Reports
  reportMessage: (msgId, data) => api.post(`/communication/messages/${msgId}/report`, data),

  // Block
  blockUser: (userId) => api.post(`/communication/block/${userId}`),
  unblockUser: (userId) => api.delete(`/communication/block/${userId}`),
  getBlockedUsers: () => api.get("/communication/blocked"),
};

export default communicationService;
