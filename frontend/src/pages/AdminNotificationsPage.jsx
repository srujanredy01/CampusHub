import { useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

const NOTIF_TYPES = ["system", "academic", "placement", "event", "reminder", "alert"];
const BRANCHES = ["CSE", "ECE", "EEE", "MECH", "CIVIL", "IT", "MBA", "MCA"];

const STATUS_CONFIG = {
  draft:     { label: "Draft",     cls: "bg-slate-50 text-slate-600 border-slate-200" },
  scheduled: { label: "Scheduled", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  approved:  { label: "Approved",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  sent:      { label: "Sent",      cls: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "Cancelled", cls: "bg-red-50 text-red-700 border-red-200" },
};

const EMPTY_INSTANT = {
  title: "", message: "", notification_type: "system", target_type: "all",
  target_branch: "", target_semester: "", priority: "normal",
};

const EMPTY_SCHEDULED = {
  title: "", message: "", notification_type: "system",
  target_branch: "", target_semester: "", scheduled_for: "", status: "scheduled",
};

function Skeleton() {
  return (
    <tr className="border-b border-slate-100">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${50 + i * 8}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function AdminNotificationsPage() {
  const [tab, setTab] = useState("instant"); // "instant" | "scheduled"
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [instantForm, setInstantForm] = useState({ ...EMPTY_INSTANT });
  const [scheduledForm, setScheduledForm] = useState({ ...EMPTY_SCHEDULED });

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/notifications/scheduled");
      setCampaigns(res.data.results || res.data.data || []);
    } catch {
      toast.error("Failed to load notification campaigns.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleSendInstant = async (e) => {
    e.preventDefault();
    if (!instantForm.title.trim() || !instantForm.message.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    setSending(true);
    try {
      const res = await api.post("/admin/notifications/send", {
        title: instantForm.title,
        message: instantForm.message,
        notification_type: instantForm.notification_type,
        priority: instantForm.priority,
        target_type: instantForm.target_type,
        target_branch: instantForm.target_branch,
        target_semester: instantForm.target_semester ? Number(instantForm.target_semester) : null,
      });
      toast.success(`Notification sent to ${res.data.data?.sent_count ?? "all"} students.`);
      setInstantForm({ ...EMPTY_INSTANT });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Failed to send notification.");
    } finally {
      setSending(false);
    }
  };

  const handleCreateScheduled = async (e) => {
    e.preventDefault();
    if (!scheduledForm.title.trim() || !scheduledForm.message.trim()) {
      toast.error("Title and message are required.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/notifications/scheduled", {
        ...scheduledForm,
        target_semester: scheduledForm.target_semester
          ? Number(scheduledForm.target_semester)
          : null,
      });
      toast.success("Scheduled notification saved.");
      setScheduledForm({ ...EMPTY_SCHEDULED });
      loadCampaigns();
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) Object.values(errors).flat().forEach((m) => toast.error(m));
      else toast.error(err.response?.data?.error?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleCampaignAction = async (id, action) => {
    try {
      if (action === "approve") {
        await api.post(`/admin/notifications/scheduled/${id}/approve`);
        toast.success("Campaign approved.");
      } else if (action === "dispatch") {
        await api.post(`/admin/notifications/scheduled/${id}/dispatch`);
        toast.success("Campaign dispatched.");
      } else if (action === "delete") {
        await api.delete(`/admin/notifications/scheduled/${id}`);
        toast.success("Campaign cancelled.");
      }
      loadCampaigns();
    } catch {
      toast.error("Action failed.");
    }
  };

  const setI = (k, v) => setInstantForm((f) => ({ ...f, [k]: v }));
  const setS = (k, v) => setScheduledForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notifications</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Send instant broadcasts or schedule campaigns for students
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit">
        {[
          { key: "instant", label: "Send Instant" },
          { key: "scheduled", label: "Schedule Campaign" },
          { key: "campaigns", label: "All Campaigns" },
          { key: "alerts", label: "Activity Alerts" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === t.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Instant Notification */}
      {tab === "instant" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Send Instant Notification</h2>
            <p className="text-xs text-slate-500 mt-1">
              Immediately delivered to all active students (or a specific branch)
            </p>
          </div>
          <form onSubmit={handleSendInstant} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                className="input-field"
                placeholder="Notification title..."
                value={instantForm.title}
                onChange={(e) => setI("title", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                className="input-field resize-none"
                rows={4}
                placeholder="Notification message..."
                value={instantForm.message}
                onChange={(e) => setI("message", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  className="input-field"
                  value={instantForm.notification_type}
                  onChange={(e) => setI("notification_type", e.target.value)}
                >
                  {NOTIF_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <select
                  className="input-field"
                  value={instantForm.priority}
                  onChange={(e) => setI("priority", e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target</label>
                <select
                  className="input-field"
                  value={instantForm.target_type}
                  onChange={(e) => setI("target_type", e.target.value)}
                >
                  <option value="all">All Students</option>
                  <option value="branch">By Branch</option>
                  <option value="semester">By Semester</option>
                </select>
              </div>
              {instantForm.target_type === "branch" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                  <select
                    className="input-field"
                    value={instantForm.target_branch}
                    onChange={(e) => setI("target_branch", e.target.value)}
                  >
                    <option value="">Select Branch</option>
                    {BRANCHES.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}
              {instantForm.target_type === "semester" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
                  <select
                    className="input-field"
                    value={instantForm.target_semester}
                    onChange={(e) => setI("target_semester", e.target.value)}
                  >
                    <option value="">Select Semester</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Semester {s}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={sending}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {sending ? "Sending…" : "Send Now"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Scheduled Campaign */}
      {tab === "scheduled" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Schedule a Campaign</h2>
            <p className="text-xs text-slate-500 mt-1">
              Campaigns require approval before dispatch
            </p>
          </div>
          <form onSubmit={handleCreateScheduled} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                className="input-field"
                placeholder="Campaign title..."
                value={scheduledForm.title}
                onChange={(e) => setS("title", e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                className="input-field resize-none"
                rows={4}
                placeholder="Campaign message..."
                value={scheduledForm.message}
                onChange={(e) => setS("message", e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                <select
                  className="input-field"
                  value={scheduledForm.notification_type}
                  onChange={(e) => setS("notification_type", e.target.value)}
                >
                  {NOTIF_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Scheduled For
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={scheduledForm.scheduled_for}
                  onChange={(e) => setS("scheduled_for", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Target Branch
                </label>
                <select
                  className="input-field"
                  value={scheduledForm.target_branch}
                  onChange={(e) => setS("target_branch", e.target.value)}
                >
                  <option value="">All Branches</option>
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Target Semester
                </label>
                <select
                  className="input-field"
                  value={scheduledForm.target_semester}
                  onChange={(e) => setS("target_semester", e.target.value)}
                >
                  <option value="">All Semesters</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm"
              >
                {saving ? "Saving…" : "Save Campaign"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* All Campaigns */}
      {tab === "campaigns" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">All Campaigns</h2>
              <p className="text-xs text-slate-500 mt-1">
                Approve, dispatch, or cancel scheduled notification campaigns
              </p>
            </div>
            <button
              onClick={loadCampaigns}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Campaign", "Type", "Target", "Scheduled For", "Status", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)
                ) : campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <p className="text-3xl mb-3">🔔</p>
                      <p className="text-slate-500 font-medium">No campaigns yet</p>
                      <p className="text-slate-400 text-xs mt-1">
                        Create a scheduled campaign to see it here
                      </p>
                    </td>
                  </tr>
                ) : (
                  campaigns.map((c) => {
                    const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-800 max-w-[200px] truncate">
                            {c.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">
                            {c.message}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs capitalize">
                          {c.notification_type}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">
                          {c.target_branch || "All"}{" "}
                          {c.target_semester ? `· Sem ${c.target_semester}` : ""}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">
                          {c.scheduled_for
                            ? new Date(c.scheduled_for).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${sc.cls}`}
                          >
                            {sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {c.status === "scheduled" && (
                              <button
                                onClick={() => handleCampaignAction(c.id, "approve")}
                                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                              >
                                Approve
                              </button>
                            )}
                            {c.status === "approved" && (
                              <button
                                onClick={() => handleCampaignAction(c.id, "dispatch")}
                                className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                Dispatch
                              </button>
                            )}
                            {!["sent", "cancelled"].includes(c.status) && (
                              <button
                                onClick={() => handleCampaignAction(c.id, "delete")}
                                className="text-xs font-medium text-red-600 hover:text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {!loading && campaigns.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
              {campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {/* Activity Alerts Tab */}
      {tab === "alerts" && <AdminAlertsPanel />}
    </div>
  );
}


// ── Admin Alerts Panel (Activity Alerts Tab) ──────────────────────────────────
function AdminAlertsPanel() {
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? { category: filter } : {};
      const res = await api.get("/admin/alerts", { params: { ...params, page_size: 50 } });
      setAlerts(res.data.data?.alerts || []);
    } catch {
      toast.error("Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get("/admin/alerts/stats");
      setStats(res.data.data);
    } catch {}
  };

  useEffect(() => {
    loadAlerts();
    loadStats();
  }, [filter]);

  const handleMarkAllRead = async () => {
    try {
      await api.post("/admin/alerts/mark-read", {});
      toast.success("All alerts marked as read.");
      loadAlerts();
      loadStats();
    } catch {
      toast.error("Failed to mark alerts as read.");
    }
  };

  const getCategoryStyle = (category) => {
    switch (category) {
      case "critical": return "bg-red-100 text-red-800 border-red-200";
      case "security": return "bg-purple-100 text-purple-800 border-purple-200";
      case "warning": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default: return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getAlertIcon = (alertType) => {
    const icons = {
      new_signup: "👤", user_login: "🔑", failed_login: "🚫",
      multiple_failed_logins: "🚨", password_reset: "🔒",
      code_submission: "💻", note_upload: "📝", attendance_update: "📋",
      cgpa_save: "📊", resource_upload: "📚", placement_update: "💼",
      group_created: "👥", suspicious_activity: "⚠️",
      permission_violation: "🛡️", excessive_requests: "🔥", profile_change: "✏️",
    };
    return icons[alertType] || "🔔";
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-2xl font-bold text-slate-900">{stats.unread}</p>
            <p className="text-xs text-slate-500 mt-1">Unread Alerts</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-2xl font-bold text-blue-600">{stats.last_24h}</p>
            <p className="text-xs text-slate-500 mt-1">Last 24 Hours</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-2xl font-bold text-emerald-600">{stats.last_7d}</p>
            <p className="text-xs text-slate-500 mt-1">Last 7 Days</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-2xl font-bold text-slate-600">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">Total Alerts</p>
          </div>
        </div>
      )}

      {/* Alert List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-900">Activity Alerts</h2>
            <div className="flex gap-1">
              {["all", "info", "warning", "critical", "security"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-2.5 py-1 text-xs rounded-full capitalize transition-colors ${
                    filter === cat
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors"
            >
              Mark All Read
            </button>
            <button
              onClick={loadAlerts}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto divide-y divide-slate-50">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-slate-500 font-medium">No alerts</p>
              <p className="text-slate-400 text-xs mt-1">Activity alerts will appear here in real-time</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 px-6 py-4 transition-colors ${
                  !alert.is_read ? "bg-orange-50/30" : "hover:bg-slate-50/60"
                }`}
              >
                <span className="text-lg flex-shrink-0 mt-0.5">{getAlertIcon(alert.alert_type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${!alert.is_read ? "font-semibold" : ""} text-slate-800 truncate`}>
                      {alert.title}
                    </p>
                    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getCategoryStyle(alert.category)}`}>
                      {alert.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{alert.message}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-slate-400">{formatTime(alert.created_at)}</span>
                    {alert.user_name && (
                      <span className="text-xs text-slate-500 font-medium">👤 {alert.user_name}</span>
                    )}
                    {alert.user_email && (
                      <span className="text-xs text-slate-400">{alert.user_email}</span>
                    )}
                  </div>
                </div>
                {!alert.is_read && (
                  <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 mt-2" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
