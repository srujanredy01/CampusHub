import api from "./api";

export const placementService = {
  getCompanies:      (params = {}) => api.get("/placement/companies", { params }),
  createCompany:     (data)        => api.post("/placement/companies/create", data),
  getApplications:   (params = {}) => api.get("/placement/applications", { params }),
  createApplication: (data)        => api.post("/placement/applications/create", data),
  getApplication:    (id)          => api.get(`/placement/applications/${id}`),
  updateApplication: (id, data)    => api.put(`/placement/applications/${id}`, data),
  deleteApplication: (id)          => api.delete(`/placement/applications/${id}`),
  addRound:          (id, data)    => api.post(`/placement/applications/${id}/rounds`, data),
  getKanban:         ()            => api.get("/placement/kanban"),
  getStats:          ()            => api.get("/placement/stats"),
  getAdminAnalytics: ()            => api.get("/placement/admin/analytics"),
  getAdminCompanies: (params = {}) => api.get("/placement/admin/companies", { params }),
  updateAdminCompany:(id, data)    => api.put(`/placement/admin/companies/${id}`, data),
  deleteAdminCompany:(id)          => api.delete(`/placement/admin/companies/${id}`),
};

export default placementService;
