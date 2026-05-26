import api from "./api";

export const resumeService = {
  getResumes: () => api.get("/resume/"),
  getResume: (id) => api.get(`/resume/${id}`),
  createResume: (data) => api.post("/resume/", data),
  updateResume: (id, data) => api.put(`/resume/${id}`, data),
  deleteResume: (id) => api.delete(`/resume/${id}`),
  exportResume: (id) => api.post(`/resume/${id}/export`),
  getTemplates: () => api.get("/resume/templates"),
};
