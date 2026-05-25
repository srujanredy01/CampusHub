import api from "./api";

export const attendanceService = {
  // Student endpoints
  getAll:       (params = {}) => api.get("/attendance/", { params }),
  getSummary:   (params = {}) => api.get("/attendance/summary", { params }),
  getOverview:  (params = {}) => api.get("/attendance/overview", { params }),
  getHistory:   (params = {}) => api.get("/attendance/history", { params }),
  create:       (data)        => api.post("/attendance/create", data),
  update:       (id, data)    => api.put(`/attendance/${id}`, data),
  markClass:    (id, attended)=> api.post(`/attendance/${id}/mark`, { attended }),
  predict:      (id, data)    => api.post(`/attendance/${id}/predict`, data),
  delete:       (id)          => api.delete(`/attendance/${id}`),

  // Admin endpoints
  adminGetDashboard:      ()          => api.get("/admin/attendance/dashboard"),
  adminGetStudents:       (params={}) => api.get("/admin/attendance/students", { params }),
  adminGetStudentDetail:  (id, params={}) => api.get(`/admin/attendance/students/${id}`, { params }),
  adminExport:            ()          => api.get("/admin/attendance/export", { responseType: "blob" }),
};

export default attendanceService;
