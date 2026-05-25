import api from "./api";

export const newsService = {
  getAll:      (params = {}) => api.get("/news/", { params }),
  getById:     (id)          => api.get(`/news/${id}/`),
  getSaved:    (saveType)    => api.get("/news/saved/", { params: saveType ? { save_type: saveType } : {} }),
  save:        (articleId, saveType) => api.post("/news/save/", { article_id: articleId, save_type: saveType }),
  unsave:      (id)          => api.delete(`/news/${id}/unsave/`),
  // Admin
  create:      (data)        => api.post("/news/create/", data),
  update:      (id, data)    => api.put(`/news/${id}/manage/`, data),
  delete:      (id)          => api.delete(`/news/${id}/manage/`),
  pin:         (id)          => api.post(`/news/${id}/pin/`),
};

export default newsService;
