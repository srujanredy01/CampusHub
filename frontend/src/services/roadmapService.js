import api from "./api";

export const roadmapService = {
  getRoadmaps: (params) => api.get("/roadmaps/", { params }),
  getRoadmap: (slug) => api.get(`/roadmaps/${slug}`),
  enrollRoadmap: (slug) => api.post(`/roadmaps/${slug}/enroll`),
  completeStep: (stepId) => api.post(`/roadmaps/steps/${stepId}/complete`),
  uncompleteStep: (stepId) => api.delete(`/roadmaps/steps/${stepId}/uncomplete`),
  getMyRoadmaps: () => api.get("/roadmaps/my"),
};
