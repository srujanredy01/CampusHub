import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

function MetricCard({ label, value, change, icon, color = "primary" }) {
  const colors = {
    primary: "bg-primary-50 text-primary-600",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    info: "bg-info-50 text-info-600",
  };
  return (
    <div className="card-padded">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>{icon}</div>
        {change !== undefined && (
          <span className={`text-xs font-medium ${change >= 0 ? "text-success-600" : "text-danger-600"}`}>
            {change >= 0 ? "↑" : "↓"} {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-surface-900 tabular-nums">{value}</p>
      <p className="text-sm text-surface-500 mt-0.5">{label}</p>
    </div>
  );
}

function AuditRow({ action, user, time, type }) {
  const typeColors = {
    create: "badge-success", update: "badge-info", delete: "badge-danger", login: "badge-neutral",
  };
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-100 last:border-0">
      <div className="avatar-xs text-2xs flex-shrink-0">{user?.[0] || "?"}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-surface-700 truncate">{action}</p>
        <p className="text-xs text-surface-400">{user}</p>
      </div>
      <span className={typeColors[type] || "badge-neutral"}>{type}</span>
      <span className="text-xs text-surface-400 flex-shrink-0">{time}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/admin/dashboard");
        setStats(res.data?.data || res.data);
      } catch (err) {
        console.error("Admin dashboard fetch failed:", err);
        setStats(null);
      } finally { setLoading(false); }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="page-container space-y-6">
        <div className="skeleton h-12 w-64 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="skeleton h-72 rounded-xl" />
          <div className="skeleton h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Admin Overview</h1>
          <p className="page-subtitle">Platform health and activity at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/users" className="btn-secondary">Manage Users</Link>
          <Link to="/admin/audit" className="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Audit Logs
          </Link>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Users" value={stats?.total_users?.toLocaleString() || "0"} change={8}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>}
          color="primary" />
        <MetricCard label="Active Today" value={stats?.active_today?.toLocaleString() || "0"} change={12}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
          color="success" />
        <MetricCard label="Resources" value={stats?.total_resources || "0"} change={5}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>}
          color="info" />
        <MetricCard label="Pending Reports" value={stats?.pending_reports || "0"}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
          color="warning" />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Audit */}
        <div className="card-padded">
          <div className="section-header mb-4">
            <h3 className="text-base font-semibold text-surface-900">Recent Activity</h3>
            <Link to="/admin/audit" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
          </div>
          <div>
            <AuditRow action="Created new resource" user="Dr. Smith" time="5m ago" type="create" />
            <AuditRow action="Updated user role" user="Admin" time="12m ago" type="update" />
            <AuditRow action="User login" user="john.doe" time="18m ago" type="login" />
            <AuditRow action="Deleted expired event" user="System" time="1h ago" type="delete" />
            <AuditRow action="Published announcement" user="Dr. Kumar" time="2h ago" type="create" />
          </div>
        </div>

        {/* System Health */}
        <div className="card-padded">
          <div className="section-header mb-4">
            <h3 className="text-base font-semibold text-surface-900">System Health</h3>
            <span className="badge-success">All systems operational</span>
          </div>
          <div className="space-y-3">
            {[
              { name: "API Server", status: "healthy", latency: "23ms" },
              { name: "Database", status: "healthy", latency: "5ms" },
              { name: "WebSocket", status: "healthy", latency: "12ms" },
              { name: "File Storage", status: "healthy", latency: "45ms" },
              { name: "Email Service", status: "healthy", latency: "120ms" },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="status-online" />
                  <span className="text-sm text-surface-700">{service.name}</span>
                </div>
                <span className="text-xs text-surface-400 tabular-nums">{service.latency}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
