import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { useAdminWebSocket } from "../hooks/useAdminWebSocket";

/* ─── Reusable Components ──────────────────────────────────────────────────── */

function LiveIndicator({ connected }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${connected ? "bg-success-500 animate-pulse" : "bg-surface-300"}`} />
      <span className="text-xs text-surface-500">{connected ? "Live" : "Connecting..."}</span>
    </div>
  );
}

function StatCard({ label, value, icon, color = "primary", pulse }) {
  const colors = {
    primary: "bg-primary-50 text-primary-600 border-primary-100",
    success: "bg-success-50 text-success-600 border-success-100",
    warning: "bg-warning-50 text-warning-600 border-warning-100",
    info: "bg-info-50 text-info-600 border-info-100",
    danger: "bg-danger-50 text-danger-600 border-danger-100",
  };
  return (
    <div className={`relative rounded-xl border p-4 transition-all ${colors[color]} ${pulse ? "ring-2 ring-primary-200 ring-opacity-50" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/60">{icon}</div>
        {pulse && <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />}
      </div>
      <p className="text-2xl font-bold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
    </div>
  );
}

function ActivityItem({ item }) {
  const typeIcons = {
    user_created: "👤",
    attendance_update: "📋",
    assignment_update: "📝",
    event_update: "🎉",
    report_update: "⚠️",
    notification: "🔔",
    study_group_update: "👥",
    channel_update: "💬",
  };
  const timeAgo = (ts) => {
    if (!ts) return "";
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-surface-100 last:border-0">
      <span className="text-lg flex-shrink-0">{typeIcons[item.type || item.action] || "📌"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-surface-700 truncate">
          {item.action === "user_created" && `New ${item.role}: ${item.user_name}`}
          {item.type === "attendance_update" && `Attendance updated`}
          {item.type === "assignment_update" && `Assignment activity`}
          {item.type === "event_update" && `Event activity`}
          {item.type === "report_update" && `New report submitted`}
          {item.type === "notification" && (item.title || "Notification")}
          {!item.type && !item.action && JSON.stringify(item).slice(0, 60)}
        </p>
        <p className="text-xs text-surface-400">{item.email || item.user_name || ""}</p>
      </div>
      <span className="text-xs text-surface-400 flex-shrink-0">{timeAgo(item.timestamp)}</span>
    </div>
  );
}

function QuickAction({ to, icon, label }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 p-3 rounded-xl border border-surface-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all group">
      <div className="w-10 h-10 rounded-lg bg-surface-50 group-hover:bg-primary-50 flex items-center justify-center text-surface-600 group-hover:text-primary-600 transition-colors">
        {icon}
      </div>
      <span className="text-xs font-medium text-surface-600 group-hover:text-primary-700">{label}</span>
    </Link>
  );
}

/* ─── Main Dashboard ───────────────────────────────────────────────────────── */

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isConnected, liveStats, activityFeed } = useAdminWebSocket();

  // Fetch initial stats via REST
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/admin/dashboard");
        setStats(res.data?.data || res.data);
      } catch (err) {
        console.error("Admin dashboard fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Merge live WebSocket stats with initial REST stats
  const mergedStats = liveStats || stats;

  if (loading && !liveStats) {
    return (
      <div className="page-container space-y-6">
        <div className="skeleton h-10 w-72 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(14)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Campus operations control center</p>
        </div>
        <div className="flex items-center gap-3">
          <LiveIndicator connected={isConnected} />
          <Link to="/admin/users" className="btn-secondary text-sm">Manage Users</Link>
          <Link to="/admin/analytics" className="btn-primary text-sm">Analytics</Link>
        </div>
      </div>

      {/* ── Live Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3">
        <StatCard label="Total Students" value={mergedStats?.total_students ?? stats?.users?.total ?? 0}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
          color="primary" pulse={isConnected} />
        <StatCard label="Total Faculty" value={mergedStats?.total_faculty ?? 0}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          color="info" pulse={isConnected} />
        <StatCard label="Moderators" value={mergedStats?.total_moderators ?? 0}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
          color="warning" pulse={isConnected} />
        <StatCard label="Departments" value={mergedStats?.departments ?? 0}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/></svg>}
          color="primary" />
        <StatCard label="Sections" value={mergedStats?.sections ?? 0}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>}
          color="info" />
        <StatCard label="Study Groups" value={mergedStats?.active_study_groups ?? 0}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>}
          color="success" />
        <StatCard label="Active Channels" value={mergedStats?.active_channels ?? stats?.communication?.channels ?? 0}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
          color="primary" />
      </div>

      {/* Second row of stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3">
        <StatCard label="Assignments Today" value={mergedStats?.assignments_today ?? 0}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>}
          color="success" pulse={isConnected} />
        <StatCard label="Attendance Today" value={mergedStats?.attendance_today ?? 0}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22,4 12,14.01 9,11.01"/></svg>}
          color="success" pulse={isConnected} />
        <StatCard label="Upcoming Events" value={mergedStats?.upcoming_events ?? stats?.events?.upcoming ?? 0}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
          color="info" />
        <StatCard label="Pending Reports" value={mergedStats?.pending_reports ?? 0}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
          color="danger" pulse={isConnected} />
        <StatCard label="Roadmap Reviews" value={mergedStats?.pending_roadmap_reviews ?? 0}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>}
          color="warning" />
        <StatCard label="Resources Today" value={mergedStats?.resources_today ?? 0}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>}
          color="info" />
        <StatCard label="Active Users Now" value={mergedStats?.active_users_now ?? stats?.users?.dau ?? 0}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
          color="success" pulse={isConnected} />
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      <div className="card-padded">
        <h3 className="text-sm font-semibold text-surface-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
          <QuickAction to="/admin/users" label="Users"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>} />
          <QuickAction to="/admin/departments" label="Departments"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3"/></svg>} />
          <QuickAction to="/admin/sections" label="Sections"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>} />
          <QuickAction to="/admin/analytics" label="Analytics"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>} />
          <QuickAction to="/admin/events" label="Events"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>} />
          <QuickAction to="/admin/moderation" label="Moderation"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>} />
          <QuickAction to="/admin/announcements" label="Announce"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>} />
          <QuickAction to="/admin/academic" label="Academic"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>} />
          <QuickAction to="/admin/audit" label="Audit Logs"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>} />
        </div>
      </div>

      {/* ── Activity Feed & Overview Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Live Activity Feed */}
        <div className="lg:col-span-2 card-padded">
          <div className="section-header mb-4">
            <h3 className="text-base font-semibold text-surface-900 flex items-center gap-2">
              Live Activity
              {isConnected && <span className="w-2 h-2 rounded-full bg-success-500 animate-pulse" />}
            </h3>
            <Link to="/admin/audit" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {activityFeed.length > 0 ? (
              activityFeed.slice(0, 15).map((item, i) => <ActivityItem key={i} item={item} />)
            ) : (
              <div className="text-center py-8 text-surface-400">
                <p className="text-sm">Waiting for live activity...</p>
                <p className="text-xs mt-1">Updates appear here in real-time</p>
              </div>
            )}
          </div>
        </div>

        {/* Moderation Summary */}
        <div className="card-padded">
          <div className="section-header mb-4">
            <h3 className="text-base font-semibold text-surface-900">Moderation</h3>
            <Link to="/admin/moderation" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
          </div>
          <div className="space-y-3">
            <ModerationItem label="Pending Reports" count={mergedStats?.pending_reports ?? 0} color="danger" />
            <ModerationItem label="Channel Requests" count={0} color="warning" />
            <ModerationItem label="Roadmap Reviews" count={mergedStats?.pending_roadmap_reviews ?? 0} color="info" />
            <ModerationItem label="Content Flags" count={0} color="warning" />
          </div>
          <div className="mt-4 pt-3 border-t border-surface-100">
            <Link to="/admin/moderation" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              Review all pending items →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom Grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Users */}
        <div className="card-padded">
          <div className="section-header mb-4">
            <h3 className="text-base font-semibold text-surface-900">Recent Registrations</h3>
            <Link to="/admin/users" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
          </div>
          <div className="space-y-2">
            {(stats?.recent?.registrations || []).slice(0, 5).map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-2 border-b border-surface-50 last:border-0">
                <div className="avatar-sm text-xs bg-primary-50 text-primary-600">{(u.full_name || "U")[0]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 truncate">{u.full_name}</p>
                  <p className="text-xs text-surface-400">{u.email}</p>
                </div>
                <span className="text-xs text-surface-400">{u.branch || "—"}</span>
              </div>
            ))}
            {(!stats?.recent?.registrations || stats.recent.registrations.length === 0) && (
              <p className="text-sm text-surface-400 text-center py-4">No recent registrations</p>
            )}
          </div>
        </div>

        {/* Platform Overview */}
        <div className="card-padded">
          <div className="section-header mb-4">
            <h3 className="text-base font-semibold text-surface-900">Platform Overview</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <OverviewStat label="Resources" value={stats?.resources?.total ?? 0} />
            <OverviewStat label="News/Announcements" value={stats?.news?.total ?? 0} />
            <OverviewStat label="Coding Questions" value={stats?.coding?.total_questions ?? 0} />
            <OverviewStat label="Total Submissions" value={stats?.coding?.total_submissions ?? 0} />
            <OverviewStat label="Notes" value={stats?.notes?.total ?? 0} />
            <OverviewStat label="Placement Apps" value={stats?.placement?.total_applications ?? 0} />
            <OverviewStat label="Events" value={stats?.events?.total ?? 0} />
            <OverviewStat label="Online Users" value={stats?.communication?.online_users ?? 0} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Helper Components ────────────────────────────────────────────────────── */

function ModerationItem({ label, count, color }) {
  const colors = { danger: "text-danger-600 bg-danger-50", warning: "text-warning-600 bg-warning-50", info: "text-info-600 bg-info-50" };
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-surface-600">{label}</span>
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[color]}`}>{count}</span>
    </div>
  );
}

function OverviewStat({ label, value }) {
  return (
    <div className="p-3 rounded-lg bg-surface-50 border border-surface-100">
      <p className="text-lg font-bold text-surface-900 tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p>
      <p className="text-xs text-surface-500">{label}</p>
    </div>
  );
}
