import api from "./api";

export const contestService = {
  // List contests
  getContests: (params) => api.get("/contests/", { params }),
  getContest: (id) => api.get(`/contests/${id}`),

  // Registration
  register: (id) => api.post(`/contests/${id}/register`),

  // Leaderboard
  getLeaderboard: (id) => api.get(`/contests/${id}/leaderboard`),

  // Submit code for contest problem
  submit: (contestId, problemId, data) =>
    api.post(`/contests/${contestId}/submit/${problemId}`, data),

  // Admin
  createContest: (data) => api.post("/contests/admin/create", data),
  updateContest: (id, data) => api.put(`/contests/admin/${id}`, data),
  deleteContest: (id) => api.delete(`/contests/admin/${id}`),
  addProblem: (contestId, data) => api.post(`/contests/admin/${contestId}/problems`, data),
};
