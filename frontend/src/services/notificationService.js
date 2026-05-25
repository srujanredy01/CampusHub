import api from "./api";

export const notificationService = {
  // User notifications
  getAll: (params = {}) => api.get("/notifications/", { params }),
  markRead: (ids) => api.post("/notifications/mark-read", { ids }),
  markAllRead: () => api.post("/notifications/mark-read", {}),
  delete: (id) => api.delete(`/notifications/${id}`),
  getUnreadCount: () => api.get("/notifications/unread-count"),

  // Admin alerts
  getAlerts: (params = {}) => api.get("/admin/alerts", { params }),
  markAlertsRead: (ids) => api.post("/admin/alerts/mark-read", { ids }),
  markAllAlertsRead: () => api.post("/admin/alerts/mark-read", {}),
  deleteAlert: (id) => api.delete(`/admin/alerts/${id}`),
  getAlertStats: () => api.get("/admin/alerts/stats"),

  // Admin send notifications
  sendNotification: (data) => api.post("/admin/notifications/send", data),
};

export default notificationService;
