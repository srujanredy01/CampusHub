/**
 * Faculty Dashboard API service.
 * Complete academic management ecosystem.
 */
import api from "./api";

const BASE = "/faculty";

const facultyService = {
  // ── Dashboard ──────────────────────────────────────────────────────────────
  getDashboard: () => api.get(`${BASE}/dashboard`),

  // ── Profile ────────────────────────────────────────────────────────────────
  getProfile: () => api.get(`${BASE}/profile`),
  updateProfile: (data) => api.put(`${BASE}/profile`, data),

  // ── Students ───────────────────────────────────────────────────────────────
  getStudents: (params) => api.get(`${BASE}/students`, { params }),
  getStudentDetail: (id) => api.get(`${BASE}/students/${id}`),

  // ── Announcements ──────────────────────────────────────────────────────────
  getAnnouncements: (params) => api.get(`${BASE}/announcements`, { params }),
  createAnnouncement: (data) => api.post(`${BASE}/announcements`, data),
  updateAnnouncement: (id, data) => api.put(`${BASE}/announcements/${id}`, data),
  deleteAnnouncement: (id) => api.delete(`${BASE}/announcements/${id}`),

  // ── Resources ──────────────────────────────────────────────────────────────
  getResources: (params) => api.get(`${BASE}/resources`, { params }),
  uploadResource: (data) => api.post(`${BASE}/resources`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  updateResource: (id, data) => api.put(`${BASE}/resources/${id}`, data),
  deleteResource: (id) => api.delete(`${BASE}/resources/${id}`),

  // ── Attendance ─────────────────────────────────────────────────────────────
  getAttendanceSessions: (params) => api.get(`${BASE}/attendance/sessions`, { params }),
  getSessionRecords: (id) => api.get(`${BASE}/attendance/sessions/${id}/records`),
  bulkMarkAttendance: (data) => api.post(`${BASE}/attendance/bulk-mark`, data),
  getAttendanceAnalytics: (params) => api.get(`${BASE}/attendance/analytics`, { params }),
  exportAttendance: (params) => api.get(`${BASE}/attendance/export`, { params, responseType: "blob" }),
  getAttendanceAlerts: (params) => api.get(`${BASE}/attendance/alerts`, { params }),
  acknowledgeAlert: (alertId) => api.post(`${BASE}/attendance/alerts`, { alert_id: alertId }),

  // ── Grades ─────────────────────────────────────────────────────────────────
  getGrades: (params) => api.get(`${BASE}/grades`, { params }),
  createGrade: (data) => api.post(`${BASE}/grades`, data),
  updateGrade: (id, data) => api.put(`${BASE}/grades/${id}`, data),
  deleteGrade: (id) => api.delete(`${BASE}/grades/${id}`),
  bulkUploadGrades: (data) => api.post(`${BASE}/grades/bulk-upload`, data),
  getGradeAnalytics: (params) => api.get(`${BASE}/grades/analytics`, { params }),

  // ── Assignments ────────────────────────────────────────────────────────────
  getAssignments: () => api.get(`${BASE}/assignments`),
  createAssignment: (data) => api.post(`${BASE}/assignments/create`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  getAssignmentDetail: (id) => api.get(`${BASE}/assignments/${id}`),
  updateAssignment: (id, data) => api.put(`${BASE}/assignments/${id}`, data),
  deleteAssignment: (id) => api.delete(`${BASE}/assignments/${id}`),
  getSubmissions: (id) => api.get(`${BASE}/assignments/${id}/submissions`),
  gradeSubmission: (subId, data) => api.post(`${BASE}/assignments/submissions/${subId}/grade`, data),

  // ── Analytics ──────────────────────────────────────────────────────────────
  getAcademicAnalytics: () => api.get(`${BASE}/analytics`),

  // ── Notes verification ─────────────────────────────────────────────────────
  getPendingNotes: () => api.get(`${BASE}/notes/verify`),
  verifyNote: (id, action) => api.post(`${BASE}/notes/verify/${id}`, { action }),

  // ── Placement ──────────────────────────────────────────────────────────────
  getPlacementData: () => api.get(`${BASE}/placement`),

  // ── Faculty Chat ───────────────────────────────────────────────────────────
  getChats: (params) => api.get(`${BASE}/chats`, { params }),
  createChat: (data) => api.post(`${BASE}/chats/create`, data),
  getChatDetail: (id) => api.get(`${BASE}/chats/${id}`),
  updateChat: (id, data) => api.put(`${BASE}/chats/${id}`, data),
  deleteChat: (id) => api.delete(`${BASE}/chats/${id}`),
  getChatMessages: (id) => api.get(`${BASE}/chats/${id}/messages`),
  sendMessage: (id, data) => api.post(`${BASE}/chats/${id}/send`, data),
  sendMessageWithFile: (id, data) => api.post(`${BASE}/chats/${id}/send`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),

  // ── Faculty Events ─────────────────────────────────────────────────────────
  getEvents: (params) => api.get(`${BASE}/events`, { params }),
  createEvent: (data) => api.post(`${BASE}/events`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  getEventDetail: (id) => api.get(`${BASE}/events/${id}`),
  updateEvent: (id, data) => api.put(`${BASE}/events/${id}`, data),
  deleteEvent: (id) => api.delete(`${BASE}/events/${id}`),
  getEventRegistrations: (id) => api.get(`${BASE}/events/${id}/registrations`),
  registerForEvent: (id, data) => api.post(`${BASE}/events/${id}/registrations`, data),
  markEventAttendance: (id, data) => api.post(`${BASE}/events/${id}/attendance`, data),

  // ── Study Groups ───────────────────────────────────────────────────────────
  getStudyGroups: () => api.get(`${BASE}/study-groups`),

  // ── Admin Announcements (received by faculty) ──────────────────────────────
  getAdminAnnouncements: (params) => api.get(`${BASE}/admin-announcements`, { params }),
  acknowledgeAdminAnnouncement: (id) => api.post(`${BASE}/admin-announcements/${id}/acknowledge`),
  createAdminAnnouncement: (data) => api.post(`${BASE}/admin-announcements`, data),

  // ── Admin Visibility ───────────────────────────────────────────────────────
  getAdminFacultyOverview: () => api.get(`${BASE}/admin/overview`),
  getAdminFacultyChats: (params) => api.get(`${BASE}/admin/chats`, { params }),

  // ── Section Performance ────────────────────────────────────────────────────
  getSectionPerformance: () => api.get(`${BASE}/section-performance`),
};

export default facultyService;
