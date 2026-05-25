import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import NotificationBell from "./NotificationBell";
import AdminAlertBell from "../admin/AdminAlertBell";
import { useNotificationWebSocket } from "../../hooks/useNotificationWebSocket";

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icons = {
  Dashboard:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  Profile:       () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  Resources:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  News:          () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>,
  Coding:        () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  Notifications: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Notes:         () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  CGPA:          () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  Groups:        () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Placement:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
  Attendance:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  Students:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Questions:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  Audit:         () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  Logout:        () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-[18px] h-[18px]"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  ChevronLeft:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>,
  Bell:          () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Menu:          () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  X:             () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
};

const studentNav = [
  { to: "/dashboard",    Icon: Icons.Dashboard,     label: "Dashboard" },
  { to: "/profile",      Icon: Icons.Profile,       label: "Profile" },
  { to: "/resources",    Icon: Icons.Resources,     label: "Resources" },
  { to: "/notes",        Icon: Icons.Notes,         label: "Notes" },
  { to: "/news",         Icon: Icons.News,          label: "News & Updates" },
  { to: "/coding",       Icon: Icons.Coding,        label: "Coding Hub" },
  { to: "/cgpa",         Icon: Icons.CGPA,          label: "Academic Performance" },
  { to: "/groups",       Icon: Icons.Groups,        label: "Study Groups" },
  { to: "/placement",    Icon: Icons.Placement,     label: "Placement" },
  { to: "/attendance",   Icon: Icons.Attendance,    label: "Attendance" },
  { to: "/notifications",Icon: Icons.Notifications, label: "Notifications" },
];

const adminNav = [
  { to: "/admin/dashboard",     Icon: Icons.Dashboard,     label: "Overview" },
  { to: "/admin/users",         Icon: Icons.Students,      label: "Students" },
  { to: "/admin/resources",     Icon: Icons.Resources,     label: "Resources" },
  { to: "/admin/notes",         Icon: Icons.Notes,         label: "Notes" },
  { to: "/admin/news",          Icon: Icons.News,          label: "News" },
  { to: "/admin/questions",     Icon: Icons.Questions,     label: "Coding" },
  { to: "/admin/cgpa",          Icon: Icons.CGPA,          label: "Academic Records" },
  { to: "/admin/attendance",    Icon: Icons.Attendance,    label: "Attendance" },
  { to: "/admin/notifications", Icon: Icons.Notifications, label: "Notifications" },
  { to: "/admin/audit",         Icon: Icons.Audit,         label: "Audit" },
];

const routeTitle = {
  "/dashboard":             "Dashboard",
  "/profile":               "My Profile",
  "/resources":             "Academic Resources",
  "/notes":                 "Notes Sharing",
  "/news":                  "News & Updates",
  "/coding":                "Coding Hub",
  "/cgpa":                  "Academic Performance",
  "/groups":                "Study Groups",
  "/placement":             "Placement Tracker",
  "/attendance":            "Attendance Tracker",
  "/notifications":         "Notifications",
  "/admin/dashboard":       "Admin Overview",
  "/admin/users":           "Student Management",
  "/admin/resources":       "Resource Management",
  "/admin/notes":           "Notes Moderation",
  "/admin/news":            "News Management",
  "/admin/questions":       "Coding Management",
  "/admin/cgpa":            "Academic Records",
  "/admin/attendance":      "Attendance Management",
  "/admin/notifications":   "Notifications",
  "/admin/audit":           "Audit & Approvals",
};

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({ to, Icon, label, badge, collapsed, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        isActive ? "nav-link-active group" : "nav-link-inactive group"
      }
      title={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          <span className={`flex-shrink-0 transition-transform duration-150 ${isActive ? "" : "group-hover:scale-110"}`}>
            <Icon />
          </span>
          {!collapsed && (
            <span className="flex-1 truncate text-sm">{label}</span>
          )}
          {!collapsed && badge > 0 && (
            <span className="ml-auto min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-2xs font-bold rounded-full px-1.5">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

// ── Sidebar content (shared between desktop and mobile) ───────────────────────
function SidebarContent({ isAdmin, collapsed, nav, user, unreadCount, onLogout, onNavClick }) {
  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  return (
    <>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-surface-100 flex-shrink-0 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-accent-violet flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 text-base leading-none">CampusHub</p>
            <p className="text-2xs text-slate-400 mt-0.5 font-medium">
              {isAdmin ? "Admin Console" : "Student Portal"}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto scrollbar-hide space-y-0.5 px-2">
        {!collapsed && (
          <p className="section-label px-2 pt-2">
            {isAdmin ? "Management" : "Navigation"}
          </p>
        )}
        {nav.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            Icon={item.Icon}
            label={item.label}
            badge={item.label === "Notifications" ? unreadCount : 0}
            collapsed={collapsed}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-surface-100 p-3 flex-shrink-0">
        {!collapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-surface-50 transition-colors group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate leading-none">{user?.full_name}</p>
              <p className="text-2xs text-slate-400 mt-0.5 truncate">
                {isAdmin ? "Administrator" : `${user?.branch || "Student"} · ID ${user?.student_id}`}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
              title="Sign out"
              aria-label="Sign out"
            >
              <Icons.Logout />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-150"
            title="Sign out"
            aria-label="Sign out"
          >
            <Icons.Logout />
          </button>
        )}
      </div>
    </>
  );
}

// ── Main Layout ───────────────────────────────────────────────────────────────
export default function Layout({ isAdmin = false }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((s) => s.auth);
  const { unreadCount } = useSelector((s) => s.notifications);
  const nav = isAdmin ? adminNav : studentNav;
  const overlayRef = useRef(null);

  // Initialize WebSocket connection for real-time notifications
  useNotificationWebSocket();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const handleLogout = async () => {
    await dispatch(logout());
    navigate("/login");
  };

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const currentTitle = Object.entries(routeTitle).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1] || "CampusHub";

  return (
    <div className="flex h-screen bg-surface-50 overflow-hidden">

      {/* ── Mobile overlay ────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Sidebar ────────────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-72 flex flex-col bg-white border-r border-surface-100
          shadow-sidebar transition-transform duration-300 ease-spring
          lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        aria-label="Mobile navigation"
      >
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-surface-100 transition-all"
          aria-label="Close navigation"
        >
          <Icons.X />
        </button>

        <SidebarContent
          isAdmin={isAdmin}
          collapsed={false}
          nav={nav}
          user={user}
          unreadCount={unreadCount}
          onLogout={handleLogout}
          onNavClick={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── Desktop Sidebar ───────────────────────────────────────────────── */}
      <aside
        className={`
          hidden lg:flex flex-col flex-shrink-0 bg-white border-r border-surface-100
          shadow-sidebar transition-all duration-300 ease-spring relative z-20
          ${collapsed ? "w-16" : "w-64"}
        `}
        aria-label="Desktop navigation"
      >
        <SidebarContent
          isAdmin={isAdmin}
          collapsed={collapsed}
          nav={nav}
          user={user}
          unreadCount={unreadCount}
          onLogout={handleLogout}
          onNavClick={undefined}
        />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border border-surface-200 rounded-full shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-600 hover:shadow-md transition-all duration-150 z-10"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <span className={`transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}>
            <Icons.ChevronLeft />
          </span>
        </button>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="bg-white border-b border-surface-100 px-4 sm:px-6 py-3.5 flex items-center gap-3 flex-shrink-0 z-10">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden btn-icon flex-shrink-0"
            aria-label="Open navigation menu"
          >
            <Icons.Menu />
          </button>

          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-slate-900 truncate">{currentTitle}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Real-time notification bells */}
            {isAdmin && <AdminAlertBell />}
            <NotificationBell />

            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center cursor-pointer"
              title={user?.full_name}
              aria-label={`Logged in as ${user?.full_name}`}
            >
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" id="main-content">
          <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
