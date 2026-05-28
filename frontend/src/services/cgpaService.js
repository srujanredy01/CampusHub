import api from "./api";

export const cgpaService = {
  // Student endpoints
  getRecord: () => api.get("/cgpa/"),
  getSemesters: () => api.get("/cgpa/semester"),
  saveSemester: (data) => api.post("/cgpa/semester", data),
  updateSemester: (id, data) => api.put(`/cgpa/semester/${id}`, data),
  deleteSemester: (id) => api.delete(`/cgpa/semester/${id}`),
  bulkSave: (data) => api.post("/cgpa/bulk-save", data),
  convertGrade: (payload) => api.post("/cgpa/grade-convert", payload),
  predictTarget: (data) => api.post("/cgpa/predict-target", data),
  predictGrade: (data) => api.post("/cgpa/predict-grade", data),
  getAnalytics: () => api.get("/cgpa/analytics"),
  getHistory: () => api.get("/cgpa/history"),
  getWeakSubjects: () => api.get("/cgpa/weak-subjects"),
  getTargets: () => api.get("/cgpa/targets"),
  createTarget: (data) => api.post("/cgpa/targets", data),
  updateTarget: (id, data) => api.put(`/cgpa/targets/${id}`, data),
  deleteTarget: (id) => api.delete(`/cgpa/targets/${id}`),

  // Faculty endpoints
  facultyUploadMarks: (data) => api.post("/cgpa/faculty/upload-marks", data),
  facultyGetAnalytics: (params) => api.get("/cgpa/faculty/analytics", { params }),

  // Admin endpoints
  adminGetRecords: (params) => api.get("/cgpa/admin/records", { params }),
  adminGetRecord: (userId) => api.get(`/cgpa/admin/records/${userId}`),
  adminDeleteRecord: (userId) => api.delete(`/cgpa/admin/records/${userId}`),
  adminGetAnalytics: () => api.get("/cgpa/admin/analytics"),
  adminExport: () => api.get("/cgpa/admin/export", { responseType: "blob" }),
};

export default cgpaService;
