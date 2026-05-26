import api from "./api";

export const assignmentService = {
  getAssignments: (params) => api.get("/assignments/", { params }),
  getAssignment: (id) => api.get(`/assignments/${id}`),
  submitAssignment: (id, data) => api.post(`/assignments/${id}/submit`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  addComment: (subId, content) => api.post(`/assignments/submissions/${subId}/comments`, { content }),
  getMyAssignments: () => api.get("/assignments/my"),
};
