/**
 * Feedback & Issue Reporting API service.
 */
import api from "./api";

const feedbackService = {
  /**
   * Submit a new feedback report.
   * @param {FormData|object} data - Feedback data (use FormData for file uploads)
   */
  submit(data) {
    const isFormData = data instanceof FormData;
    return api.post("/feedback/submit", data, {
      headers: isFormData ? { "Content-Type": "multipart/form-data" } : {},
      _skipGlobalErrorToast: true,
    });
  },

  /**
   * Upload additional attachments to an existing report.
   */
  uploadAttachment(reportId, formData) {
    return api.post(`/feedback/upload/${reportId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /**
   * Get current user's feedback reports.
   */
  getMyReports() {
    return api.get("/feedback/my-reports");
  },

  /**
   * Get detail of a specific user report.
   */
  getMyReportDetail(reportId) {
    return api.get(`/feedback/my-reports/${reportId}`);
  },

  // ── Admin endpoints ──────────────────────────────────────────────────────

  /**
   * Get all feedback reports (admin/moderator).
   */
  adminList(params = {}) {
    return api.get("/feedback/admin/list", { params });
  },

  /**
   * Get detail of a specific report (admin).
   */
  adminDetail(reportId) {
    return api.get(`/feedback/admin/${reportId}`);
  },

  /**
   * Update a feedback report (status, priority, assignment).
   */
  adminUpdate(reportId, data) {
    return api.patch(`/feedback/admin/${reportId}`, data);
  },

  /**
   * Add a response to a feedback report.
   */
  adminRespond(reportId, data) {
    return api.post(`/feedback/admin/${reportId}/respond`, data);
  },

  /**
   * Archive/unarchive a feedback report.
   */
  adminArchive(reportId) {
    return api.post(`/feedback/admin/${reportId}/archive`);
  },

  /**
   * Get feedback analytics data.
   */
  adminAnalytics(days = 30) {
    return api.get("/feedback/admin/analytics", { params: { days } });
  },
};

export default feedbackService;
