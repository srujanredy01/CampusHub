import api from "./api";

export const groupsService = {
  getAll:       (params = {}) => api.get("/groups/", { params }),
  getMine:      ()            => api.get("/groups/mine"),
  create:       (data)        => api.post("/groups/create", data),
  getById:      (id)          => api.get(`/groups/${id}`),
  join:         (id, data)    => api.post(`/groups/${id}/join`, data),
  leave:        (id)          => api.post(`/groups/${id}/leave`),
  getMembers:   (id)          => api.get(`/groups/${id}/members`),
  getPosts:     (id)          => api.get(`/groups/${id}/posts`),
  createPost:   (id, data)    => api.post(`/groups/${id}/posts/create`, data),
  updateRole:   (groupId, userId, role) => api.post(`/groups/${groupId}/members/${userId}/role`, { role }),
  getInvites:   (id)          => api.get(`/groups/${id}/invitations`),
  createInvite: (id, data)    => api.post(`/groups/${id}/invitations`, data),
  getMeetings:  (id)          => api.get(`/groups/${id}/meetings`),
  createMeeting:(id, data)    => api.post(`/groups/${id}/meetings`, data),
};

export default groupsService;
