/**
 * AdminFeedbackPage — Feedback management dashboard for admins/moderators.
 * View, filter, assign, respond to, and resolve feedback reports.
 */
import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import feedbackService from "../services/feedbackService";

// ── Constants ────────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "open", label: "Open" },
  { value: "investigating", label: "Investigating" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "rejected", label: "Rejected" },
  { value: "needs_more_info", label: "Needs More Info" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "general", label: "General" },
  { value: "ui_ux", label: "UI/UX" },
  { value: "performance", label: "Performance" },
  { value: "security", label: "Security" },
  { value: "academic", label: "Academic" },
  { value: "placement", label: "Placement" },
  { value: "chat", label: "Chat/Groups" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const STATUS_COLORS = {
  open: "bg-blue-100 text-blue-700",
  investigating: "bg-amber-100 text-amber-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-surface-200 text-surface-600",
  rejected: "bg-red-100 text-red-700",
  needs_more_info: "bg-purple-100 text-purple-700",
};

const SEVERITY_COLORS = {
  low: "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const TYPE_ICONS = {
  bug: "🐛", feature: "💡", general: "💬", ui_ux: "🎨",
  performance: "⚡", security: "🔒", academic: "📚",
  placement: "💼", chat: "👥",
};

// ── Main Component ───────────────────────────────────────────────────────────
export default function AdminFeedbackPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    status: "", type: "", priority: "", search: "",
  });

  // Response form
  const [responseText, setResponseText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [responding, setResponding] = useState(false);

  // Fetch reports
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      if (filters.priority) params.priority = filters.priority;
      if (filters.search) params.search = filters.search;

      const res = await feedbackService.adminList(params);
      setReports(res.data?.data || []);
    } catch (err) {
      toast.error("Failed to load feedback reports.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Fetch detail
  const openDetail = async (report) => {
    setDetailLoading(true);
    setSelectedReport(report);
    try {
      const res = await feedbackService.adminDetail(report.id);
      setSelectedReport(res.data?.data || report);
    } catch (err) {
      toast.error("Failed to load report details.");
    } finally {
      setDetailLoading(false);
    }
  };

  // Update status
  const updateStatus = async (reportId, newStatus) => {
    try {
      await feedbackService.adminUpdate(reportId, { status: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      fetchReports();
      if (selectedReport?.id === reportId) {
        openDetail({ id: reportId });
      }
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  // Submit response
  const submitResponse = async () => {
    if (!responseText.trim() || !selectedReport) return;
    setResponding(true);
    try {
      await feedbackService.adminRespond(selectedReport.id, {
        message: responseText.trim(),
        is_internal: isInternal,
      });
      toast.success("Response added.");
      setResponseText("");
      setIsInternal(false);
      openDetail({ id: selectedReport.id });
    } catch (err) {
      toast.error("Failed to add response.");
    } finally {
      setResponding(false);
    }
  };

  // Fetch analytics
  const fetchAnalytics = async () => {
    try {
      const res = await feedbackService.adminAnalytics(30);
      setAnalytics(res.data?.data || null);
      setShowAnalytics(true);
    } catch (err) {
      toast.error("Failed to load analytics.");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Feedback Dashboard</h1>
          <p className="text-sm text-surface-500 mt-0.5">Manage user reports, bugs, and feature requests</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
          </svg>
          Analytics
        </button>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && analytics && (
        <div className="mb-6 p-5 bg-white border border-surface-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-surface-800">Last 30 Days Overview</h3>
            <button onClick={() => setShowAnalytics(false)} className="text-surface-400 hover:text-surface-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-surface-50 rounded-lg">
              <p className="text-2xl font-bold text-surface-900">{analytics.total}</p>
              <p className="text-xs text-surface-500">Total Reports</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{analytics.by_status?.open || 0}</p>
              <p className="text-xs text-blue-600">Open</p>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg">
              <p className="text-2xl font-bold text-emerald-700">{analytics.by_status?.resolved || 0}</p>
              <p className="text-xs text-emerald-600">Resolved</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-700">{analytics.avg_resolution_hours || "—"}</p>
              <p className="text-xs text-amber-600">Avg Hours to Resolve</p>
            </div>
          </div>
          {/* Top reported pages */}
          {analytics.top_pages?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-surface-500 mb-2">Most Reported Pages</p>
              <div className="flex flex-wrap gap-2">
                {analytics.top_pages.map((p, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-surface-100 rounded text-xs text-surface-700">
                    <span className="font-mono">{p.route_path}</span>
                    <span className="text-surface-400">({p.count})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input
          type="text"
          placeholder="Search reports..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="px-3 py-2 border border-surface-200 rounded-lg text-sm w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-primary-200"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filters.type}
          onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
          className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
          className="px-3 py-2 border border-surface-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-200"
        >
          {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Content */}
      <div className="flex gap-6">
        {/* Report List */}
        <div className={`flex-1 ${selectedReport ? "hidden lg:block lg:max-w-[55%]" : ""}`}>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-20 text-surface-500">
              <p className="text-lg font-medium">No reports found</p>
              <p className="text-sm mt-1">Adjust your filters or wait for new submissions.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => openDetail(report)}
                  className={`
                    w-full text-left p-4 rounded-xl border transition-all duration-150
                    ${selectedReport?.id === report.id
                      ? "border-primary-300 bg-primary-50/50 shadow-sm"
                      : "border-surface-200 bg-white hover:border-surface-300 hover:shadow-sm"
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{TYPE_ICONS[report.feedback_type] || "📝"}</span>
                        <span className="text-xs font-mono text-surface-400">{report.tracking_id}</span>
                      </div>
                      <p className="text-sm font-medium text-surface-800 truncate">
                        {report.title || report.feedback_type.replace("_", " ")}
                      </p>
                      <p className="text-xs text-surface-500 mt-0.5">
                        {report.user_name} · {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[report.status] || ""}`}>
                        {report.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[report.severity] || ""}`}>
                        {report.severity}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedReport && (
          <div className="flex-1 lg:max-w-[45%] bg-white border border-surface-200 rounded-xl p-5 shadow-sm max-h-[calc(100vh-200px)] overflow-y-auto">
            {/* Back button (mobile) */}
            <button
              onClick={() => setSelectedReport(null)}
              className="lg:hidden flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 mb-3"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              Back to list
            </button>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="space-y-5">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{TYPE_ICONS[selectedReport.feedback_type]}</span>
                    <span className="text-xs font-mono text-surface-400">{selectedReport.tracking_id}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-surface-900">
                    {selectedReport.title || selectedReport.feedback_type.replace("_", " ")}
                  </h3>
                </div>

                {/* Meta */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-surface-500">Reporter:</span>
                    <p className="font-medium text-surface-800">{selectedReport.user_name}</p>
                    <p className="text-surface-500">{selectedReport.user_email}</p>
                  </div>
                  <div>
                    <span className="text-surface-500">Role / Section:</span>
                    <p className="font-medium text-surface-800 capitalize">{selectedReport.user_role}</p>
                    <p className="text-surface-500">{selectedReport.user_section} · {selectedReport.user_branch}</p>
                  </div>
                  <div>
                    <span className="text-surface-500">Page:</span>
                    <p className="font-mono text-surface-800">{selectedReport.route_path || "—"}</p>
                  </div>
                  <div>
                    <span className="text-surface-500">Device:</span>
                    <p className="text-surface-800">{selectedReport.device_type || "—"}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-xs font-medium text-surface-500 mb-1">Description</p>
                  <p className="text-sm text-surface-800 whitespace-pre-wrap bg-surface-50 p-3 rounded-lg">
                    {selectedReport.description}
                  </p>
                </div>

                {/* Tags */}
                {selectedReport.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedReport.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-surface-100 text-surface-600 rounded text-xs">{tag}</span>
                    ))}
                  </div>
                )}

                {/* Attachments */}
                {selectedReport.attachments?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-surface-500 mb-2">Attachments</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedReport.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 bg-surface-50 rounded-lg hover:bg-surface-100 transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-surface-400">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                          </svg>
                          <span className="text-xs text-surface-600 truncate">{att.file_name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Actions */}
                <div>
                  <p className="text-xs font-medium text-surface-500 mb-2">Update Status</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.filter((s) => s.value && s.value !== selectedReport.status).map((s) => (
                      <button
                        key={s.value}
                        onClick={() => updateStatus(selectedReport.id, s.value)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${STATUS_COLORS[s.value]} hover:opacity-80`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Responses */}
                {selectedReport.responses?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-surface-500 mb-2">Responses</p>
                    <div className="space-y-2">
                      {selectedReport.responses.map((resp) => (
                        <div key={resp.id} className={`p-3 rounded-lg text-sm ${resp.is_internal ? "bg-amber-50 border border-amber-100" : "bg-surface-50"}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-surface-700">{resp.responder_name}</span>
                            <span className="text-xs text-surface-400">{new Date(resp.created_at).toLocaleString()}</span>
                            {resp.is_internal && <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">Internal</span>}
                          </div>
                          <p className="text-surface-700">{resp.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Response */}
                <div className="border-t border-surface-100 pt-4">
                  <p className="text-xs font-medium text-surface-500 mb-2">Add Response</p>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    placeholder="Write a response..."
                    rows={3}
                    className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <label className="flex items-center gap-2 text-xs text-surface-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded border-surface-300"
                      />
                      Internal note (not visible to user)
                    </label>
                    <button
                      onClick={submitResponse}
                      disabled={!responseText.trim() || responding}
                      className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {responding ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>

                {/* Status History */}
                {selectedReport.status_history?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-surface-500 mb-2">Status History</p>
                    <div className="space-y-1.5">
                      {selectedReport.status_history.map((h) => (
                        <div key={h.id} className="flex items-center gap-2 text-xs text-surface-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-surface-300" />
                          <span>{h.changed_by_name}</span>
                          <span className="text-surface-400">changed</span>
                          <span className={`px-1.5 py-0.5 rounded ${STATUS_COLORS[h.old_status]}`}>{h.old_status}</span>
                          <span className="text-surface-400">→</span>
                          <span className={`px-1.5 py-0.5 rounded ${STATUS_COLORS[h.new_status]}`}>{h.new_status}</span>
                          <span className="text-surface-400 ml-auto">{new Date(h.created_at).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
