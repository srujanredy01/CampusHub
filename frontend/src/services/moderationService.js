/**
 * Moderation Dashboard API service.
 */
import api from "./api";

const BASE = "/moderation";

const moderationService = {
  // Dashboard
  getDashboard: () => api.get(`${BASE}/dashboard`),

  // Profile
  getProfile: () => api.get(`${BASE}/profile`),
  updateProfile: (data) => api.put(`${BASE}/profile`, data),

  // Reports
  getReports: (params) => api.get(`${BASE}/reports`, { params }),
  getReportDetail: (id) => api.get(`${BASE}/reports/${id}`),
  resolveReport: (id, data) => api.post(`${BASE}/reports/${id}`, data),

  // Channel moderation
  getChannelModeration: () => api.get(`${BASE}/channels`),
  channelAction: (data) => api.post(`${BASE}/channels`, data),

  // Approvals
  getApprovals: (params) => api.get(`${BASE}/approvals`, { params }),
  reviewApproval: (id, data) => api.post(`${BASE}/approvals/${id}`, data),

  // Chat moderation
  chatAction: (data) => api.post(`${BASE}/chat`, data),

  // Warnings
  getWarnings: () => api.get(`${BASE}/warnings`),
  issueWarning: (data) => api.post(`${BASE}/warnings`, data),

  // Bans
  getBans: () => api.get(`${BASE}/bans`),
  issueBan: (data) => api.post(`${BASE}/bans`, data),
  liftBan: (id, reason) => api.post(`${BASE}/bans/${id}/lift`, { reason }),

  // Audit logs
  getLogs: (params) => api.get(`${BASE}/logs`, { params }),

  // Analytics
  getAnalytics: () => api.get(`${BASE}/analytics`),

  // Study groups
  getStudyGroups: () => api.get(`${BASE}/study-groups`),
  moderateGroup: (data) => api.post(`${BASE}/study-groups`, data),

  // Notes
  getPendingNotes: () => api.get(`${BASE}/notes`),
  moderateNote: (id, data) => api.post(`${BASE}/notes/${id}`, data),
};

export default moderationService;
