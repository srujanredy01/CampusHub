import api from "./api";

export const roadmapService = {
  // Public library
  getAll: (params = {}) => api.get("/roadmaps/", { params }),
  getBySlug: (slug) => api.get(`/roadmaps/${slug}`),

  // Student CRUD
  create: (data) => api.post("/roadmaps/create", data),
  update: (slug, data) => api.put(`/roadmaps/${slug}/edit`, data),
  submit: (slug) => api.post(`/roadmaps/${slug}/submit`),
  delete: (slug) => api.delete(`/roadmaps/${slug}/delete`),

  // Enrollment & Progress
  enroll: (slug) => api.post(`/roadmaps/${slug}/enroll`),
  completeStep: (stepId) => api.post(`/roadmaps/steps/${stepId}/complete`),
  uncompleteStep: (stepId) => api.delete(`/roadmaps/steps/${stepId}/uncomplete`),
  getMyRoadmaps: () => api.get("/roadmaps/my"),
  getMyCreated: () => api.get("/roadmaps/my-created"),

  // Community
  like: (slug) => api.post(`/roadmaps/${slug}/like`),
  bookmark: (slug) => api.post(`/roadmaps/${slug}/bookmark`),
  rate: (slug, rating) => api.post(`/roadmaps/${slug}/rate`, { rating }),
  getComments: (slug) => api.get(`/roadmaps/${slug}/comments`),
  addComment: (slug, data) => api.post(`/roadmaps/${slug}/comments`, data),
  report: (slug, data) => api.post(`/roadmaps/${slug}/report`, data),
  getBookmarked: () => api.get("/roadmaps/bookmarked"),

  // Moderation
  getQueue: (params = {}) => api.get("/roadmaps/moderation/queue", { params }),
  review: (slug, data) => api.post(`/roadmaps/moderation/${slug}/review`, data),
};

export default roadmapService;
