import api from "./api";

export const eventsService = {
  // Events
  getAll: (params = {}) => api.get("/events/", { params }),
  getBySlug: (slug) => api.get(`/events/${slug}`),
  register: (slug) => api.post(`/events/${slug}/register`),
  cancelRegistration: (slug) => api.post(`/events/${slug}/cancel`),
  getMyRegistrations: (params = {}) => api.get("/events/my-registrations", { params }),

  // Check-in
  checkIn: (slug, data) => api.post(`/events/${slug}/check-in`, data),

  // Feedback
  submitFeedback: (slug, data) => api.post(`/events/${slug}/feedback`, data),
  getFeedback: (slug) => api.get(`/events/${slug}/feedback`),

  // Live features
  getChatMessages: (slug, params = {}) => api.get(`/events/${slug}/chat`, { params }),
  getQuestions: (slug, params = {}) => api.get(`/events/${slug}/questions`, { params }),
  submitQuestion: (slug, data) => api.post(`/events/${slug}/questions`, data),
  upvoteQuestion: (slug, questionId) => api.post(`/events/${slug}/questions/${questionId}/upvote`),

  // Polls
  getPolls: (slug) => api.get(`/events/${slug}/polls`),
  votePoll: (slug, pollId, data) => api.post(`/events/${slug}/polls/${pollId}/vote`, data),

  // Certificates
  getMyCertificates: (params = {}) => api.get("/events/certificates", { params }),
  getCertificate: (certId) => api.get(`/events/certificates/${certId}`),

  // Announcements
  getAnnouncements: (slug) => api.get(`/events/${slug}/announcements`),
};

export default eventsService;
