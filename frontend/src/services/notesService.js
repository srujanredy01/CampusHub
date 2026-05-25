import api from "./api";

export const notesService = {
  getAll:      (params = {}) => api.get("/notes/", { params }),
  getById:     (id)          => api.get(`/notes/${id}`),
  upload:      (formData)    => api.post("/notes/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }),
  download:    (id)          => api.get(`/notes/${id}/download`),
  vote:        (id, vote)    => api.post(`/notes/${id}/vote`, { vote }),
  bookmark:    (id)          => api.post(`/notes/${id}/bookmark`),
  rate:        (id, rating)  => api.post(`/notes/${id}/rate`, { rating }),
  getBookmarks:()            => api.get("/notes/bookmarks"),
  getMine:     ()            => api.get("/notes/mine"),
};

export default notesService;
