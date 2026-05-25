import { useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

const ACTION_LABELS = {
  login: "Login", login_failed: "Login Failed", logout: "Logout",
  signup: "Signup", password_change: "Password Changed",
  password_reset_request: "Password Reset Req.", password_reset_done: "Password Reset Done",
  page_visit: "Page Visit", profile_view: "Profile View", profile_update: "Profile Update",
  resource_view: "Resource View", resource_download: "Resource Download",
  news_view: "News View", news_save: "News Saved",
  question_view: "Question View", question_save: "Question Saved",
  code_run: "Code Run", code_submit: "Code Submit",
  notification_view: "Notification View", notification_mark_read: "Notif. Read",
  admin_action: "Admin Action", api_request: "API Request",
};

const STATUS_CLS = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed:  "bg-red-50 text-red-700 border-red-200",
  error:   "bg-amber-50 text-amber-700 border-amber-200",
};

function Skeleton({ cols = 7 }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${50 + i * 6}%` }} />
        </td>
      ))}
    </tr>
  );
}

function StatCard({ label, value, tone = "slate" }) {
  const tones = {
    slate:   "bg-slate-50 border-slate-200 text-slate-700",
    blue:    "bg-blue-50 border-blue-200 text-blue-700",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    red:     "bg-red-50 border-red-200 text-red-700",
    amber:   "bg-amber-50 border-amber-200 text-amber-700",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-2xl font-bold">{value ?? "—"}</p>
      <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

export default function AdminAuditPage() {
  const [tab, setTab] = useState("activity"); // "activity" | "admin" | "logins" | "stats"

  // Activity logs
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityFilters, setActivityFilters] = useState({
    search: "", action: "", status: "", date_from: "", date_to: "",
  });

  // Admin audit logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Login logs
  const [loginLogs, setLoginLogs] = useState([]);
  const [loginLoading, setLoginLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const loadActivity = async () => {
    setActivityLoading(true);
    try {
      const params = {};
      if (activityFilters.search)    params.search    = activityFilters.search;
      if (activityFilters.action)    params.action    = activityFilters.action;
      if (activityFilters.status)    params.status    = activityFilters.status;
      if (activityFilters.date_from) params.date_from = activityFilters.date_from;
      if (activityFilters.date_to)   params.date_to   = activityFilters.date_to;
      const res = await api.get("/admin/activity-logs", { params });
      setActivityLogs(res.data.results || res.data.data || []);
    } catch {
      toast.error("Failed to load activity logs.");
    } finally {
      setActivityLoading(false);
    }
  };

  const loadAudit = async () => {
    setAuditLoading(true);
    try {
      const res = await api.get("/admin/logs");
      setAuditLogs(res.data.results || res.data.data || []);
    } catch {
      toast.error("Failed to load admin audit logs.");
    } finally {
      setAuditLoading(false);
    }
  };

  const loadLogins = async () => {
    setLoginLoading(true);
    try {
      const res = await api.get("/admin/login-logs");
      setLoginLogs(res.data.results || res.data.data || []);
    } catch {
      toast.error("Failed to load login logs.");
    } finally {
      setLoginLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await api.get("/admin/activity-stats");
      setStats(res.data.data || null);
    } catch {
      toast.error("Failed to load activity stats.");
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "activity") loadActivity();
    if (tab === "admin")    loadAudit();
    if (tab === "logins")   loadLogins();
    if (tab === "stats")    loadStats();
  }, [tab]);

  useEffect(() => {
    if (tab === "activity") loadActivity();
  }, [activityFilters.search, activityFilters.action, activityFilters.status, activityFilters.date_from, activityFilters.date_to]);

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleString("en-IN", {
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        })
      : "—";

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Audit & Activity</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Full audit trail of user activity, admin actions, and login events
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl w-fit flex-wrap">
        {[
          { key: "activity", label: "User Activity" },
          { key: "admin",    label: "Admin Actions" },
          { key: "logins",   label: "Login Logs" },
          { key: "stats",    label: "Analytics" },
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

      {/* ── User Activity Tab ─────────────────────────────────────────────── */}
      {tab === "activity" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">User Activity Log</h2>
            <p className="text-xs text-slate-500 mt-1">Every tracked user action across the platform</p>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative md:col-span-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                className="input-field pl-9"
                placeholder="Search by user, IP, endpoint..."
                value={activityFilters.search}
                onChange={(e) => setActivityFilters((f) => ({ ...f, search: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && loadActivity()}
              />
            </div>
            <select
              className="input-field"
              value={activityFilters.action}
              onChange={(e) => setActivityFilters((f) => ({ ...f, action: e.target.value }))}
            >
              <option value="">All Actions</option>
              {Object.entries(ACTION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              className="input-field"
              value={activityFilters.status}
              onChange={(e) => setActivityFilters((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="error">Error</option>
            </select>
            <input
              type="date"
              className="input-field"
              value={activityFilters.date_from}
              onChange={(e) => setActivityFilters((f) => ({ ...f, date_from: e.target.value }))}
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["User", "Action", "Endpoint", "Status", "IP", "Device", "Time"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activityLoading
                  ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
                  : activityLogs.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16">
                        <p className="text-3xl mb-3">📋</p>
                        <p className="text-slate-500 font-medium">No activity logs found</p>
                      </td>
                    </tr>
                  )
                  : activityLogs.map((log) => {
                    const sc = STATUS_CLS[log.status] || STATUS_CLS.success;
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-800 text-xs">{log.username || "Anonymous"}</p>
                          <p className="text-2xs text-slate-400">{log.role}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs font-mono max-w-[180px] truncate">
                          {log.endpoint}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sc}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs font-mono">{log.ip_address || "—"}</td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">
                          {log.device} · {log.browser}
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">
                          {fmtDate(log.created_at)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          {!activityLoading && activityLogs.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
              Showing {activityLogs.length} records
            </div>
          )}
        </div>
      )}

      {/* ── Admin Actions Tab ─────────────────────────────────────────────── */}
      {tab === "admin" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Admin Audit Trail</h2>
            <p className="text-xs text-slate-500 mt-1">All admin actions: student management, content moderation, notifications</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Admin", "Action", "Target", "Description", "IP", "Time"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {auditLoading
                  ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} cols={6} />)
                  : auditLogs.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16">
                        <p className="text-3xl mb-3">🔍</p>
                        <p className="text-slate-500 font-medium">No admin actions recorded</p>
                      </td>
                    </tr>
                  )
                  : auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-800 text-xs">{log.admin_name || "—"}</p>
                        <p className="text-2xs text-slate-400">{log.admin_email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full capitalize">
                          {log.action?.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">{log.target_model || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs max-w-[240px] truncate">{log.description}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs font-mono">{log.ip_address || "—"}</td>
                      <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">{fmtDate(log.created_at)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Login Logs Tab ────────────────────────────────────────────────── */}
      {tab === "logins" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Login Activity</h2>
            <p className="text-xs text-slate-500 mt-1">Login, logout, and failed login attempts</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["User", "Action", "IP Address", "Browser", "Device", "Status", "Time"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loginLoading
                  ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
                  : loginLogs.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16">
                        <p className="text-3xl mb-3">🔐</p>
                        <p className="text-slate-500 font-medium">No login records found</p>
                      </td>
                    </tr>
                  )
                  : loginLogs.map((log) => {
                    const sc = STATUS_CLS[log.status] || STATUS_CLS.success;
                    const isFailure = log.action === "login_failed";
                    return (
                      <tr key={log.id} className={`hover:bg-slate-50/60 transition-colors ${isFailure ? "bg-red-50/30" : ""}`}>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-800 text-xs">{log.username || "Unknown"}</p>
                          <p className="text-2xs text-slate-400">{log.student_id}</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            isFailure ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {ACTION_LABELS[log.action] || log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs font-mono">{log.ip_address || "—"}</td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">{log.browser || "—"}</td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">{log.device || "—"}</td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sc}`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs whitespace-nowrap">{fmtDate(log.created_at)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Analytics Tab ─────────────────────────────────────────────────── */}
      {tab === "stats" && (
        <div className="space-y-5">
          {statsLoading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : stats ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Total Events"       value={stats.summary?.total_events}        tone="slate" />
                <StatCard label="Events Today"       value={stats.summary?.events_today}        tone="blue" />
                <StatCard label="Events This Week"   value={stats.summary?.events_week}         tone="slate" />
                <StatCard label="Failed Logins (7d)" value={stats.summary?.failed_logins_week}  tone="red" />
                <StatCard label="Active Users Today" value={stats.summary?.active_users_today}  tone="emerald" />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* Top Actions */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-900">Top Actions (7 days)</h2>
                  </div>
                  <div className="p-4 space-y-2">
                    {(stats.by_action || []).slice(0, 10).map((item) => (
                      <div key={item.action} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-600 capitalize">
                          {ACTION_LABELS[item.action] || item.action?.replace(/_/g, " ")}
                        </span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded-full"
                              style={{
                                width: `${Math.min(100, (item.count / (stats.by_action[0]?.count || 1)) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 w-10 text-right">
                            {item.count}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Users */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-900">Most Active Users (7 days)</h2>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {(stats.top_users || []).map((u, i) => (
                      <div key={i} className="px-6 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{u.username || "—"}</p>
                          <p className="text-xs text-slate-400">{u.student_id} · {u.role}</p>
                        </div>
                        <span className="text-sm font-bold text-slate-700">{u.count} events</span>
                      </div>
                    ))}
                    {!stats.top_users?.length && (
                      <p className="px-6 py-8 text-sm text-slate-400 text-center">No data available</p>
                    )}
                  </div>
                </div>

                {/* Suspicious IPs */}
                {stats.suspicious_ips?.length > 0 && (
                  <div className="bg-red-50 rounded-3xl border border-red-200 shadow-sm overflow-hidden xl:col-span-2">
                    <div className="px-6 py-5 border-b border-red-200">
                      <h2 className="text-sm font-semibold text-red-800">
                        ⚠️ Suspicious IPs — Multiple Failed Logins (24h)
                      </h2>
                    </div>
                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                      {stats.suspicious_ips.map((item) => (
                        <div key={item.ip_address} className="bg-white rounded-xl border border-red-200 p-3">
                          <p className="text-sm font-mono font-semibold text-red-800">{item.ip_address}</p>
                          <p className="text-xs text-red-600 mt-0.5">{item.count} failed attempts</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Device breakdown */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-900">Device Breakdown (30 days)</h2>
                  </div>
                  <div className="p-4 space-y-2">
                    {(stats.by_device || []).map((item) => (
                      <div key={item.device} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-600">{item.device || "Unknown"}</span>
                        <span className="text-xs font-semibold text-slate-700">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Browser breakdown */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-5 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-900">Browser Breakdown (30 days)</h2>
                  </div>
                  <div className="p-4 space-y-2">
                    {(stats.by_browser || []).map((item) => (
                      <div key={item.browser} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-600">{item.browser || "Unknown"}</span>
                        <span className="text-xs font-semibold text-slate-700">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
              <p className="text-3xl mb-3">📊</p>
              <p className="text-slate-500 font-medium">No analytics data available</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
