import api from "./api";

export const resourceService = {
  getAll: (params) => api.get("/resources/", { params }),
  getCounts: (branch = "") =>
    api.get("/resources/counts/", { params: branch ? { branch } : {} }),
  getById: (id) => api.get(`/resources/${id}/`),
  upload: (formData) =>
    api.post("/resources/upload/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id, data) => api.put(`/resources/${id}/manage/`, data),
  delete: (id) => api.delete(`/resources/${id}/manage/`),
  toggleActive: (id) => api.post(`/resources/${id}/toggle-active/`),
  getDownloadUrl: (id) => api.get(`/resources/${id}/download/`),
  getPreviewUrl: (id) => api.get(`/resources/${id}/preview/`),
};

export default resourceService;
