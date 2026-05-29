/**
 * Admin Dashboard API service.
 * Handles all admin-specific API calls.
 */
import api from "./api";

const adminService = {
  // Dashboard
  getDashboard: () => api.get("/admin/dashboard"),

  // User Management
  getUsers: (params = {}) => api.get("/admin/students", { params }),
  getUserDetail: (id) => api.get(`/admin/students/${id}`),
  createUser: (data) => api.post("/admin/users/create", data),
  updateUser: (id, data) => api.put(`/admin/students/${id}`, data),
  activateUser: (id) => api.post(`/admin/students/${id}/activate`),
  deactivateUser: (id) => api.post(`/admin/students/${id}/deactivate`),
  resetPassword: (id) => api.post(`/admin/students/${id}/reset-password`),
  updateRole: (id, role) => api.patch(`/admin/students/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/students/${id}`),

  // Faculty
  getFaculty: (params = {}) => api.get("/admin/faculty", { params }),
  getFacultyDetail: (id) => api.get(`/admin/faculty/${id}`),
  updateFaculty: (id, data) => api.put(`/admin/faculty/${id}`, data),

  // Moderators
  getModerators: (params = {}) => api.get("/admin/moderators", { params }),
  getModeratorDetail: (id) => api.get(`/admin/moderators/${id}`),
  updateModerator: (id, data) => api.put(`/admin/moderators/${id}`, data),

  // Departments
  getDepartments: (params = {}) => api.get("/admin/departments", { params }),
  getDepartmentDetail: (id) => api.get(`/admin/departments/${id}`),
  createDepartment: (data) => api.post("/admin/departments", data),
  updateDepartment: (id, data) => api.put(`/admin/departments/${id}`, data),
  archiveDepartment: (id) => api.delete(`/admin/departments/${id}`),

  // Sections
  getSections: (params = {}) => api.get("/admin/sections", { params }),
  getSectionDetail: (id) => api.get(`/admin/sections/${id}`),
  createSection: (data) => api.post("/admin/sections", data),
  updateSection: (id, data) => api.put(`/admin/sections/${id}`, data),
  archiveSection: (id) => api.delete(`/admin/sections/${id}`),
  moveStudent: (sectionId, studentId) =>
    api.post(`/admin/sections/${sectionId}/move-student`, { student_id: studentId }),

  // Announcements
  getAnnouncements: (params = {}) => api.get("/admin/announcements", { params }),
  createAnnouncement: (data) => api.post("/admin/announcements", data),
  updateAnnouncement: (id, data) => api.put(`/admin/announcements/${id}`, data),
  deleteAnnouncement: (id) => api.delete(`/admin/announcements/${id}`),

  // Analytics
  getLiveAnalytics: () => api.get("/admin/live-analytics"),
  getAnalytics: (params = {}) => api.get("/admin/analytics", { params }),

  // Overviews
  getModerationOverview: () => api.get("/admin/moderation-overview"),
  getAcademicOverview: () => api.get("/admin/academic-overview"),
  getStudyGroupsOverview: () => api.get("/admin/study-groups-overview"),
  studyGroupAction: (id, action) =>
    api.post(`/admin/study-groups-overview/${id}/action`, { action }),
  getChannelsOverview: () => api.get("/admin/channels-overview"),
  channelAction: (id, action) =>
    api.post(`/admin/channels-overview/${id}/action`, { action }),
  getPlacementOverview: () => api.get("/admin/placement-overview"),
  getResourceOverview: () => api.get("/admin/resource-overview"),

  // Events
  getEvents: (params = {}) => api.get("/admin/events", { params }),
  getEventDetail: (slug) => api.get(`/admin/events/${slug}`),
  getEventStats: () => api.get("/admin/events/stats"),

  // Audit
  getAuditLogs: (params = {}) => api.get("/admin/logs", { params }),
  getActivityLogs: (params = {}) => api.get("/admin/activity-logs", { params }),

  // Notifications
  sendNotification: (data) => api.post("/admin/notifications", data),
  sendTargetedNotification: (data) => api.post("/admin/notifications/send", data),
};

export default adminService;
