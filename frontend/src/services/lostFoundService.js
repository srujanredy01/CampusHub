import api from "./api";

export const lostFoundService = {
  getItems: (params) => api.get("/lost-found/", { params }),
  getItem: (id) => api.get(`/lost-found/${id}`),
  createItem: (data) => api.post("/lost-found/create", data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  updateItem: (id, data) => api.put(`/lost-found/${id}`, data),
  deleteItem: (id) => api.delete(`/lost-found/${id}`),
  claimItem: (id) => api.post(`/lost-found/${id}/claim`),
  resolveItem: (id) => api.post(`/lost-found/${id}/resolve`),
  flagItem: (id, reason) => api.post(`/lost-found/${id}/flag`, { reason }),
  getMyItems: () => api.get("/lost-found/my"),
};
