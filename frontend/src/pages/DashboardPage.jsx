import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile } from "../store/slices/profileSlice";
import { fetchNotifications } from "../store/slices/notificationSlice";
import { SkeletonStatCard, SkeletonCard } from "../components/common/Skeleton";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Code:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Send:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Bell:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Trophy:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><polyline points="8 21 12 17 16 21"/><path d="M5 3H19"/><path d="M5 3v5a7 7 0 0 0 14 0V3"/><line x1="12" y1="17" x2="12" y2="12"/></svg>,
  Book:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  News:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>,
  User:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  Notes:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Attendance: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  CGPA:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  Groups:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Placement:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  ArrowRight: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>,
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, colorClass, icon, trend }) {
  return (
    <div className="card group hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${colorClass}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
            trend >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          }`}>
            {trend >= 0 ? "+" : ""}{trend}%
          </span>
        )}
      </div>
      <p className="stat-value">{value ?? "—"}</p>
      <p className="stat-label">{label}</p>
      {sub && <p className="text-2xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Quick Access Card ─────────────────────────────────────────────────────────
function QuickCard({ to, label, desc, colorClass, icon }) {
  return (
    <Link
      to={to}
      className="card group hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 block focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-2xl"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorClass} group-hover:scale-110 transition-transform duration-200`}>
        {icon}
      </div>
      <p className="text-sm font-semibold text-slate-800 group-hover:text-primary-600 transition-colors">{label}</p>
      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{desc}</p>
      <div className="flex items-center gap-1 mt-2 text-primary-500 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <span className="text-2xs font-medium">Open</span>
        {Icons.ArrowRight}
      </div>
    </Link>
  );
}

// ── Progress Row ──────────────────────────────────────────────────────────────
function ProgressRow({ label, value, total, color }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-14 flex-shrink-0">{label}</span>
      <div className="flex-1 progress-bar">
        <div
          className={`progress-fill ${color}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemax={total}
          aria-label={`${label}: ${value} of ${total}`}
        />
      </div>
      <span className="text-xs text-slate-400 w-6 text-right flex-shrink-0">{value}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { data: profile, loading: profileLoading } = useSelector((s) => s.profile);
  const { unreadCount } = useSelector((s) => s.notifications);

  useEffect(() => {
    dispatch(fetchProfile());
    dispatch(fetchNotifications());
  }, [dispatch]);

  const firstName = user?.full_name?.split(" ")[0] || "Student";
  const total  = profile?.total_questions_solved || 0;
  const easy   = profile?.easy_solved || 0;
  const medium = profile?.medium_solved || 0;
  const hard   = profile?.hard_solved || 0;

  const quickLinks = [
    { to: "/resources",   label: "Resources",     desc: "Notes & study materials",  colorClass: "bg-blue-50 text-blue-600",      icon: Icons.Book },
    { to: "/notes",       label: "Notes",         desc: "Share & browse notes",      colorClass: "bg-violet-50 text-violet-600",  icon: Icons.Notes },
    { to: "/news",        label: "News",          desc: "Campus announcements",       colorClass: "bg-purple-50 text-purple-600",  icon: Icons.News },
    { to: "/coding",      label: "Coding Hub",    desc: "Practice problems",          colorClass: "bg-primary-50 text-primary-600",icon: Icons.Code },
    { to: "/attendance",  label: "Attendance",    desc: "Track your attendance",      colorClass: "bg-emerald-50 text-emerald-600",icon: Icons.Attendance },
    { to: "/cgpa",        label: "CGPA",          desc: "Calculate your GPA",         colorClass: "bg-amber-50 text-amber-600",    icon: Icons.CGPA },
    { to: "/groups",      label: "Study Groups",  desc: "Collaborate with peers",     colorClass: "bg-rose-50 text-rose-600",      icon: Icons.Groups },
    { to: "/placement",   label: "Placement",     desc: "Job & internship tracker",   colorClass: "bg-teal-50 text-teal-600",      icon: Icons.Placement },
    { to: "/notifications",label: "Notifications",desc: `${unreadCount} unread`,      colorClass: "bg-amber-50 text-amber-600",    icon: Icons.Bell },
    { to: "/profile",     label: "Profile",       desc: "View & edit your details",   colorClass: "bg-slate-100 text-slate-600",   icon: Icons.User },
  ];

  return (
    <div className="space-y-6 animate-fade-up">

      {/* ── Hero banner ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-hero-gradient p-6 sm:p-8 text-white">
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/5 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-white/5 rounded-full" />
          <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white/5 rounded-full" />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-primary-200 text-sm font-medium mb-1">Good day,</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">{firstName}</h1>
            <p className="text-primary-200 text-sm">
              {user?.branch && user.branch}
              {user?.semester && ` · Year ${user.semester}`}
              {user?.section && ` · Section ${user.section}`}
            </p>
            {user?.student_id && (
              <p className="text-primary-300 text-xs mt-1">ID: {user.student_id}</p>
            )}
          </div>
          <div className="text-left sm:text-right">
            <p className="text-primary-200 text-xs font-medium uppercase tracking-wide">Problems Solved</p>
            <p className="text-4xl font-bold text-white mt-1">{total}</p>
            <p className="text-primary-300 text-xs mt-0.5">{profile?.total_submissions || 0} submissions</p>
          </div>
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      {profileLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Problems Solved"
            value={total}
            sub={`${profile?.total_submissions || 0} submissions`}
            colorClass="bg-primary-50 text-primary-600"
            icon={Icons.Code}
          />
          <StatCard
            label="Easy Solved"
            value={easy}
            colorClass="bg-emerald-50 text-emerald-600"
            icon={Icons.Trophy}
          />
          <StatCard
            label="Medium Solved"
            value={medium}
            colorClass="bg-amber-50 text-amber-600"
            icon={Icons.Send}
          />
          <StatCard
            label="Notifications"
            value={unreadCount}
            sub="unread messages"
            colorClass="bg-red-50 text-red-600"
            icon={Icons.Bell}
          />
        </div>
      )}

      {/* ── Coding progress ───────────────────────────────────────────────── */}
      {profileLoading ? (
        <SkeletonCard lines={4} hasIcon={false} />
      ) : profile ? (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-slate-900">Coding Progress</h2>
            <Link
              to="/coding"
              className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1"
            >
              View all {Icons.ArrowRight}
            </Link>
          </div>

          {/* Difficulty breakdown */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: "Easy",   value: easy,   color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Medium", value: medium, color: "text-amber-600",   bg: "bg-amber-50" },
              { label: "Hard",   value: hard,   color: "text-red-600",     bg: "bg-red-50" },
            ].map((d) => (
              <div key={d.label} className={`${d.bg} rounded-2xl p-4 text-center`}>
                <p className={`text-2xl font-bold ${d.color}`}>{d.value}</p>
                <p className={`text-xs font-medium ${d.color} mt-0.5 opacity-80`}>{d.label}</p>
              </div>
            ))}
          </div>

          {/* Progress bars */}
          {total > 0 && (
            <div className="space-y-2.5">
              <ProgressRow label="Easy"   value={easy}   total={total} color="bg-emerald-500" />
              <ProgressRow label="Medium" value={medium} total={total} color="bg-amber-500" />
              <ProgressRow label="Hard"   value={hard}   total={total} color="bg-red-500" />
            </div>
          )}

          {total === 0 && (
            <div className="text-center py-6">
              <p className="text-sm text-slate-400">No problems solved yet.</p>
              <Link to="/coding" className="btn-primary btn-sm mt-3 inline-flex">
                Start Practicing
              </Link>
            </div>
          )}
        </div>
      ) : null}

      {/* ── Quick access ──────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-slate-900 mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickLinks.slice(0, 10).map((q) => (
            <QuickCard key={q.to} {...q} />
          ))}
        </div>
      </div>
    </div>
  );
}
