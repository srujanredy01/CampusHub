import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import api from "../services/api";
import { fetchUnreadCount } from "../store/slices/notificationSlice";

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sublabel, color = "primary", to }) {
  const colorMap = {
    primary: "bg-primary-50 text-primary-600",
    success: "bg-success-50 text-success-600",
    warning: "bg-warning-50 text-warning-600",
    info: "bg-info-50 text-info-600",
    danger: "bg-danger-50 text-danger-600",
  };
  const Wrapper = to ? Link : "div";
  return (
    <Wrapper to={to} className="card-padded group hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 block">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        {sublabel && (
          <span className="text-xs font-medium text-surface-400">{sublabel}</span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-xl font-bold text-surface-900">{value}</p>
        <p className="text-xs text-surface-500 mt-0.5">{label}</p>
      </div>
    </Wrapper>
  );
}

// ── Quick Action ─────────────────────────────────────────────────────────────
function QuickAction({ to, icon, label, desc }) {
  return (
    <Link to={to} className="flex items-center gap-3 p-3.5 rounded-xl border border-surface-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all duration-150 group">
      <div className="w-10 h-10 rounded-xl bg-surface-100 group-hover:bg-primary-100 flex items-center justify-center text-surface-600 group-hover:text-primary-600 flex-shrink-0 transition-colors">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-surface-800">{label}</p>
        <p className="text-xs text-surface-400 truncate">{desc}</p>
      </div>
    </Link>
  );
}

// ── Activity Item ────────────────────────────────────────────────────────────
function ActivityItem({ title, desc, time, icon }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-surface-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-sm">
        {icon || "📌"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-surface-800 truncate">{title}</p>
        <p className="text-xs text-surface-400 mt-0.5">{desc}</p>
      </div>
      <span className="text-xs text-surface-400 flex-shrink-0">{time}</span>
    </div>
  );
}

// ── Upcoming Item ────────────────────────────────────────────────────────────
function UpcomingItem({ title, date, type }) {
  const d = new Date(date);
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-10 h-10 rounded-lg bg-surface-100 flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-2xs font-bold text-surface-500 uppercase">{month}</span>
        <span className="text-sm font-bold text-surface-800 -mt-0.5">{day}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-surface-700 truncate">{title}</p>
        <p className="text-xs text-surface-400">{type}</p>
      </div>
    </div>
  );
}

// ── Helper: format relative time ─────────────────────────────────────────────
function formatRelative(dateStr) {
  if (!dateStr) return "";
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useSelector((s) => s.auth);
  const { unreadCount } = useSelector((s) => s.notifications);
  const dispatch = useDispatch();
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingItems, setUpcomingItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        api.get("/attendance/"),
        api.get("/assignments/", { params: { page_size: 5 } }),
        api.get("/notifications/", { params: { page_size: 5 } }),
        api.get("/placement/applications", { params: { page_size: 5 } }),
        api.get("/cgpa/profile"),
      ]);

      // Attendance stats
      let attendancePercent = 0;
      let totalSubjects = 0;
      if (results[0].status === "fulfilled" && results[0].value.data?.data) {
        const attData = results[0].value.data.data;
        const subjects = attData.subjects || attData || [];
        if (Array.isArray(subjects) && subjects.length > 0) {
          totalSubjects = subjects.length;
          const totalAttended = subjects.reduce((sum, s) => sum + (s.attended_classes || 0), 0);
          const totalClasses = subjects.reduce((sum, s) => sum + (s.total_classes || 0), 0);
          attendancePercent = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
        }
      }

      // Assignment stats
      let pendingAssignments = 0;
      let totalAssignments = 0;
      if (results[1].status === "fulfilled") {
        const assData = results[1].value.data?.data || results[1].value.data?.results || [];
        const assignments = Array.isArray(assData) ? assData : assData.assignments || [];
        totalAssignments = assignments.length;
        pendingAssignments = assignments.filter((a) => {
          const deadline = new Date(a.deadline);
          return deadline > new Date();
        }).length;

        // Build upcoming from assignments
        const upcoming = assignments
          .filter((a) => new Date(a.deadline) > new Date())
          .slice(0, 3)
          .map((a) => ({ title: a.title, date: a.deadline, type: "Assignment" }));
        setUpcomingItems(upcoming);
      }

      // Notifications for recent activity
      if (results[2].status === "fulfilled") {
        const notifs = results[2].value.data?.data?.notifications || [];
        setRecentActivity(notifs.slice(0, 5).map((n) => ({
          title: n.title,
          desc: n.message,
          time: formatRelative(n.created_at),
          icon: n.notification_type === "coding_reminder" ? "💻" :
                n.notification_type === "campus_news" ? "📰" :
                n.notification_type === "event" ? "🎉" :
                n.notification_type === "new_resource" ? "📚" : "🔔",
        })));
      }

      // Placement stats
      let placementApps = 0;
      if (results[3].status === "fulfilled") {
        const plData = results[3].value.data?.data || results[3].value.data?.results || [];
        const apps = Array.isArray(plData) ? plData : plData.applications || [];
        placementApps = apps.length;
      }

      // CGPA
      let cgpa = "—";
      if (results[4].status === "fulfilled") {
        const cgpaData = results[4].value.data?.data;
        if (cgpaData?.current_cgpa) {
          cgpa = parseFloat(cgpaData.current_cgpa).toFixed(2);
        }
      }

      setStats({
        attendance: attendancePercent,
        totalSubjects,
        pendingAssignments,
        totalAssignments,
        placementApps,
        cgpa,
        unreadNotifications: unreadCount,
      });
    } catch (err) {
      // Set defaults on error
      setStats({
        attendance: 0,
        totalSubjects: 0,
        pendingAssignments: 0,
        totalAssignments: 0,
        placementApps: 0,
        cgpa: "—",
        unreadNotifications: unreadCount,
      });
    } finally {
      setLoading(false);
    }
  }, [unreadCount]);

  useEffect(() => {
    fetchDashboardData();
    dispatch(fetchUnreadCount());
  }, [fetchDashboardData, dispatch]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const displayName = user?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Student";

  if (loading) {
    return (
      <div className="page-container space-y-6">
        <div className="skeleton h-32 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="skeleton h-64 rounded-xl lg:col-span-2" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      {/* Hero Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-6 md:p-8 text-white">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)", backgroundSize: "24px 24px" }}
        />
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-display font-bold">
            {greeting()}, {displayName} 👋
          </h1>
          <p className="mt-2 text-white/70 text-sm md:text-base max-w-lg">
            {stats.pendingAssignments > 0
              ? `You have ${stats.pendingAssignments} assignment${stats.pendingAssignments > 1 ? "s" : ""} due soon.`
              : "You're all caught up on assignments."
            }
            {stats.attendance > 0 && ` Your attendance is at ${stats.attendance}%.`}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link to="/coding" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              Solve a problem
            </Link>
            <Link to="/assignments" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              View assignments
            </Link>
            <Link to="/attendance" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              Check attendance
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>}
          label="Assignments Due"
          value={stats.pendingAssignments}
          sublabel={`of ${stats.totalAssignments}`}
          color="primary"
          to="/assignments"
        />
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>}
          label="Attendance"
          value={`${stats.attendance}%`}
          sublabel={`${stats.totalSubjects} subjects`}
          color={stats.attendance >= 75 ? "success" : stats.attendance >= 60 ? "warning" : "danger"}
          to="/attendance"
        />
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>}
          label="CGPA"
          value={stats.cgpa}
          color="info"
          to="/cgpa"
        />
        <StatCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>}
          label="Applications"
          value={stats.placementApps}
          color="warning"
          to="/placement"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions + Activity */}
        <div className="lg:col-span-2 space-y-4">
          <div className="section-header">
            <h3 className="text-base font-semibold text-surface-900">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuickAction to="/coding" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>} label="Solve a Problem" desc="Practice coding questions" />
            <QuickAction to="/groups" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>} label="Study Groups" desc="Collaborate with peers" />
            <QuickAction to="/notes" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>} label="Browse Notes" desc="Find shared study notes" />
            <QuickAction to="/communication" icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>} label="Campus Chat" desc="Connect with classmates" />
          </div>

          {/* Recent Activity */}
          <div className="card-padded mt-4">
            <div className="section-header mb-3">
              <h3 className="text-base font-semibold text-surface-900">Recent Activity</h3>
              <Link to="/notifications" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
            </div>
            {recentActivity.length > 0 ? (
              <div>
                {recentActivity.map((item, idx) => (
                  <ActivityItem key={idx} title={item.title} desc={item.desc} time={item.time} icon={item.icon} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-400 py-4 text-center">No recent activity</p>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Progress Overview */}
          <div className="card-padded">
            <h3 className="text-base font-semibold text-surface-900 mb-4">Progress</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-surface-600">Attendance</span>
                  <span className="text-sm font-semibold text-surface-800">{stats.attendance}%</span>
                </div>
                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${stats.attendance >= 75 ? "bg-success-500" : stats.attendance >= 60 ? "bg-warning-500" : "bg-danger-500"}`} style={{ width: `${Math.min(stats.attendance, 100)}%` }} />
                </div>
              </div>
              {stats.cgpa !== "—" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-surface-600">CGPA</span>
                    <span className="text-sm font-semibold text-surface-800">{stats.cgpa}/10</span>
                  </div>
                  <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all duration-700" style={{ width: `${(parseFloat(stats.cgpa) / 10) * 100}%` }} />
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-surface-600">Assignments</span>
                  <span className="text-sm font-semibold text-surface-800">
                    {stats.totalAssignments - stats.pendingAssignments}/{stats.totalAssignments}
                  </span>
                </div>
                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div className="h-full bg-info-500 rounded-full transition-all duration-700" style={{ width: `${stats.totalAssignments > 0 ? ((stats.totalAssignments - stats.pendingAssignments) / stats.totalAssignments) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming */}
          <div className="card-padded">
            <div className="section-header mb-3">
              <h3 className="text-base font-semibold text-surface-900">Upcoming</h3>
              <Link to="/assignments" className="text-xs text-primary-600 hover:text-primary-700 font-medium">See all</Link>
            </div>
            {upcomingItems.length > 0 ? (
              <div className="space-y-1">
                {upcomingItems.map((item, idx) => (
                  <UpcomingItem key={idx} title={item.title} date={item.date} type={item.type} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-surface-400 py-4 text-center">Nothing upcoming</p>
            )}
          </div>

          {/* Notifications Summary */}
          {unreadCount > 0 && (
            <Link to="/notifications" className="card-padded block hover:shadow-card-hover transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-surface-800">{unreadCount} unread notification{unreadCount > 1 ? "s" : ""}</p>
                  <p className="text-xs text-surface-400">Tap to view</p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
