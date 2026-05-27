import api from "./api";

export const dashboardService = {
  // Student dashboard
  getStudentDashboard: () => api.get("/admin/dashboard"),

  // Admin dashboard
  getAdminDashboard: () => api.get("/admin/dashboard"),
  getSystemHealth: () => api.get("/admin/system/health"),
  getAnalytics: (params = {}) => api.get("/admin/analytics", { params }),
  getActivityLogs: (params = {}) => api.get("/admin/activity-logs", { params }),
  getActivityStats: () => api.get("/admin/activity-stats"),
  getAuditLogs: (params = {}) => api.get("/admin/logs", { params }),
  getLoginLogs: (params = {}) => api.get("/admin/login-logs", { params }),
};

export default dashboardService;
