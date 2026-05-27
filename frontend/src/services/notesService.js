import api from "./api";

export const notesService = {
  // Notes CRUD
  getAll:      (params = {}) => api.get("/notes/", { params }),
  getById:     (id)          => api.get(`/notes/${id}`),
  upload:      (formData)    => api.post("/notes/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  download:    (id)          => api.get(`/notes/${id}/download`, { responseType: "blob" }),
  delete:      (id)          => api.delete(`/notes/${id}`),

  // Interactions
  vote:        (id, vote)    => api.post(`/notes/${id}/vote`, { vote }),
  bookmark:    (id)          => api.post(`/notes/${id}/bookmark`),
  rate:        (id, rating)  => api.post(`/notes/${id}/rate`, { rating }),

  // Comments
  getComments: (id, params = {}) => api.get(`/notes/${id}/comments`, { params }),
  addComment:  (id, data)    => api.post(`/notes/${id}/comments`, data),
  deleteComment: (id, commentId) => api.delete(`/notes/${id}/comments/${commentId}`),

  // Sharing
  share:       (id, data)    => api.post(`/notes/${id}/share`, data),
  getSharedWithMe: (params = {}) => api.get("/notes/shared-with-me", { params }),

  // Reports
  report:      (id, data)    => api.post(`/notes/${id}/report`, data),

  // User's notes
  getBookmarks:()            => api.get("/notes/bookmarks"),
  getMine:     ()            => api.get("/notes/mine"),
};

export default notesService;
