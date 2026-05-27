import api from "./api";

export const groupsService = {
  // ── Core Group CRUD ────────────────────────────────────────────────────────
  getAll:       (params = {}) => api.get("/groups/", { params }),
  getMine:      ()            => api.get("/groups/mine"),
  create:       (data)        => api.post("/groups/create", data),
  getById:      (id)          => api.get(`/groups/${id}`),
  join:         (id, data)    => api.post(`/groups/${id}/join`, data),
  leave:        (id)          => api.post(`/groups/${id}/leave`),
  getStats:     ()            => api.get("/groups/stats"),

  // ── Members ────────────────────────────────────────────────────────────────
  getMembers:   (id)          => api.get(`/groups/${id}/members`),
  updateRole:   (groupId, userId, role) => api.post(`/groups/${groupId}/members/${userId}/role`, { role }),

  // ── Posts ──────────────────────────────────────────────────────────────────
  getPosts:     (id)          => api.get(`/groups/${id}/posts`),
  createPost:   (id, data)    => api.post(`/groups/${id}/posts/create`, data),

  // ── Invitations ────────────────────────────────────────────────────────────
  getInvites:   (id)          => api.get(`/groups/${id}/invitations`),
  createInvite: (id, data)    => api.post(`/groups/${id}/invitations`, data),
  getMyInvites: ()            => api.get("/groups/my-invites"),
  acceptInvite: (token)       => api.post("/groups/accept-invite", { token }),
  declineInvite:(token)       => api.post("/groups/decline-invite", { token }),

  // ── Meetings / Sessions ────────────────────────────────────────────────────
  getMeetings:  (id)          => api.get(`/groups/${id}/meetings`),
  createMeeting:(id, data)    => api.post(`/groups/${id}/meetings/create`, data),
  cancelMeeting:(id, meetingId) => api.post(`/groups/${id}/meetings/${meetingId}/cancel`),

  // ── Chat Messages (REST for history) ───────────────────────────────────────
  getMessages:  (id, params = {}) => api.get(`/groups/${id}/messages`, { params }),

  // ── Tasks (Kanban) ─────────────────────────────────────────────────────────
  getTasks:     (id)          => api.get(`/groups/${id}/tasks`),
  createTask:   (id, data)    => api.post(`/groups/${id}/tasks/create`, data),
  updateTask:   (id, taskId, data) => api.patch(`/groups/${id}/tasks/${taskId}`, data),
  deleteTask:   (id, taskId)  => api.delete(`/groups/${id}/tasks/${taskId}/delete`),

  // ── Shared Resources ───────────────────────────────────────────────────────
  getResources: (id)          => api.get(`/groups/${id}/resources`),
  uploadResource: (id, data)  => api.post(`/groups/${id}/resources/upload`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  }),
  deleteResource: (id, resourceId) => api.delete(`/groups/${id}/resources/${resourceId}/delete`),

  // ── Polls ──────────────────────────────────────────────────────────────────
  getPolls:     (id)          => api.get(`/groups/${id}/polls`),
  createPoll:   (id, data)    => api.post(`/groups/${id}/polls/create`, data),
  votePoll:     (id, pollId, optionId) => api.post(`/groups/${id}/polls/${pollId}/vote`, { option_id: optionId }),

  // ── Study Timer ────────────────────────────────────────────────────────────
  getTimer:     (id)          => api.get(`/groups/${id}/timer`),
  startTimer:   (id, data)    => api.post(`/groups/${id}/timer/start`, data),
  stopTimer:    (id)          => api.post(`/groups/${id}/timer/stop`),
};

export default groupsService;
