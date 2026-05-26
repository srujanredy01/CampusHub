import api from "./api";

export const placementService = {
  // Applications
  getApplications: (params) => api.get("/placement/applications", { params }),
  createApplication: (data) => api.post("/placement/applications/create", data),
  getApplication: (id) => api.get(`/placement/applications/${id}`),
  updateApplication: (id, data) => api.put(`/placement/applications/${id}`, data),
  deleteApplication: (id) => api.delete(`/placement/applications/${id}`),

  // Interviews
  getInterviews: (applicationId) => api.get(`/placement/applications/${applicationId}/interviews`),
  addInterview: (applicationId, data) => api.post(`/placement/applications/${applicationId}/interviews`, data),

  // Kanban view
  getKanban: () => api.get("/placement/kanban"),

  // Stats
  getStats: () => api.get("/placement/stats"),

  // Readiness score
  getReadiness: () => api.get("/placement/readiness"),

  // Company notes
  getCompanyNotes: () => api.get("/placement/company-notes"),
  createCompanyNote: (data) => api.post("/placement/company-notes", data),
  getCompanyNote: (id) => api.get(`/placement/company-notes/${id}`),
  updateCompanyNote: (id, data) => api.put(`/placement/company-notes/${id}`, data),
  deleteCompanyNote: (id) => api.delete(`/placement/company-notes/${id}`),
};
