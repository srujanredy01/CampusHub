import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../../store/slices/authSlice";
import NotificationBell from "./NotificationBell";
import AdminAlertBell from "../admin/AdminAlertBell";
import { useNotificationWebSocket } from "../../hooks/useNotificationWebSocket";
import GlobalSearch from "./GlobalSearch";

// ── Icon Components (Minimal, Linear-style) ──────────────────────────────────
const Icons = {
  Dashboard: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
    </svg>
  ),
  Profile: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M5.5 21a8.38 8.38 0 0 1 13 0"/>
    </svg>
  ),
  Resources: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  Assignments: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/>
    </svg>
  ),
  Attendance: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M9 16l2 2 4-4"/>
    </svg>
  ),
  Academic: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>
    </svg>
  ),
  News: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>
    </svg>
  ),
  Code: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
    </svg>
  ),
  Trophy: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  ),
  Contest: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Roadmap: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 6-6"/>
    </svg>
  ),
  Resume: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  Placement: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M12 12v4"/>
    </svg>
  ),
  Chat: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Groups: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Events: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="12" cy="16" r="2"/>
    </svg>
  ),
  LostFound: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  Notifications: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  Saved: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Settings: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  Notes: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>
    </svg>
  ),
  Users: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Analytics: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
    </svg>
  ),
  Audit: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Logout: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Collapse: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>
    </svg>
  ),
  Expand: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>
    </svg>
  ),
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
  X: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  Plus: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
};

// ── Navigation Configuration ─────────────────────────────────────────────────
const studentNav = [
  { section: "Main" },
  { to: "/dashboard",      Icon: Icons.Dashboard,     label: "Dashboard" },
  { to: "/profile",        Icon: Icons.Profile,       label: "Profile" },
  { to: "/notifications",  Icon: Icons.Notifications, label: "Notifications" },

  { section: "Academics" },
  { to: "/resources",      Icon: Icons.Resources,     label: "Resources" },
  { to: "/assignments",    Icon: Icons.Assignments,   label: "Assignments" },
  { to: "/attendance",     Icon: Icons.Attendance,    label: "Attendance" },
  { to: "/cgpa",           Icon: Icons.Academic,      label: "Performance" },
  { to: "/notes",          Icon: Icons.Notes,         label: "Notes" },
  { to: "/news",           Icon: Icons.News,          label: "Announcements" },

  { section: "Coding & Career" },
  { to: "/coding",         Icon: Icons.Code,          label: "Coding Hub" },
  { to: "/contests",       Icon: Icons.Contest,       label: "Contests" },
  { to: "/leaderboard",    Icon: Icons.Trophy,        label: "Leaderboard" },
  { to: "/roadmaps",       Icon: Icons.Roadmap,       label: "Roadmaps" },
  { to: "/resume",         Icon: Icons.Resume,        label: "Resume Builder" },
  { to: "/placement",      Icon: Icons.Placement,     label: "Placement" },

  { section: "Community" },
  { to: "/communication",  Icon: Icons.Chat,          label: "Campus Chat" },
  { to: "/groups",         Icon: Icons.Groups,        label: "Study Groups" },
  { to: "/events",         Icon: Icons.Events,        label: "Events" },
  { to: "/lost-found",     Icon: Icons.LostFound,     label: "Lost & Found" },

  { section: "Personal" },
  { to: "/saved",          Icon: Icons.Saved,         label: "Saved" },
  { to: "/settings",       Icon: Icons.Settings,      label: "Settings" },
];

const adminNav = [
  { section: "Overview" },
  { to: "/admin/dashboard",      Icon: Icons.Dashboard,     label: "Dashboard" },
  { to: "/admin/users",          Icon: Icons.Users,         label: "Users" },

  { section: "Academic" },
  { to: "/admin/resources",      Icon: Icons.Resources,     label: "Resources" },
  { to: "/admin/notes",          Icon: Icons.Notes,         label: "Notes" },
  { to: "/admin/news",           Icon: Icons.News,          label: "News" },
  { to: "/admin/cgpa",           Icon: Icons.Academic,      label: "Records" },
  { to: "/admin/attendance",     Icon: Icons.Attendance,    label: "Attendance" },

  { section: "Platform" },
  { to: "/admin/questions",      Icon: Icons.Code,          label: "Coding" },
  { to: "/admin/communication",  Icon: Icons.Chat,          label: "Chat" },
  { to: "/admin/events",         Icon: Icons.Events,        label: "Events" },
  { to: "/admin/notifications",  Icon: Icons.Notifications, label: "Notifications" },

  { section: "System" },
  { to: "/admin/audit",          Icon: Icons.Audit,         label: "Audit Logs" },
];

// ── Sidebar Component ────────────────────────────────────────────────────────
function Sidebar({ collapsed, setCollapsed, navItems, user, onLogout, mobileOpen, setMobileOpen }) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-surface-900/30 backdrop-blur-sm md:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-full bg-white border-r border-surface-200/60
          flex flex-col transition-all duration-200 ease-smooth
          ${collapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-width)]"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Brand */}
        <div className="h-[var(--header-height)] flex items-center px-4 border-b border-surface-100 flex-shrink-0">
          {!collapsed && (
            <span className="text-lg font-display font-bold text-surface-900 tracking-tight">
              CampusHub
            </span>
          )}
          {collapsed && (
            <span className="text-lg font-display font-bold text-primary-600 mx-auto">C</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2.5 scrollbar-hide">
          {navItems.map((item, idx) => {
            if (item.section) {
              if (collapsed) return <div key={idx} className="my-3 border-t border-surface-100" />;
              return (
                <div key={idx} className="nav-section-label">
                  {item.section}
                </div>
              );
            }

            const isActive = location.pathname === item.to ||
              (item.to !== "/dashboard" && item.to !== "/admin/dashboard" && location.pathname.startsWith(item.to));

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`${isActive ? "nav-item-active" : "nav-item-inactive"} ${collapsed ? "justify-center px-0" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <item.Icon />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-surface-100 p-2.5 flex-shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 mb-1">
              <div className="avatar-sm text-xs">
                {user?.first_name?.[0] || user?.username?.[0] || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-800 truncate">
                  {user?.first_name || user?.username}
                </p>
                <p className="text-xs text-surface-400 truncate">{user?.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className={`nav-item-inactive w-full text-danger-600 hover:bg-danger-50 hover:text-danger-700 ${collapsed ? "justify-center px-0" : ""}`}
          >
            <Icons.Logout />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-surface-200 rounded-full items-center justify-center text-surface-400 hover:text-surface-600 hover:border-surface-300 shadow-sm transition-all z-10"
        >
          {collapsed ? <Icons.Expand /> : <Icons.Collapse />}
        </button>
      </aside>
    </>
  );
}

// ── Header Component ─────────────────────────────────────────────────────────
function Header({ collapsed, setMobileOpen, user, isAdmin }) {
  return (
    <header
      className={`
        fixed top-0 right-0 z-30 h-[var(--header-height)]
        bg-white/80 backdrop-blur-xl border-b border-surface-200/60
        flex items-center justify-between px-4 md:px-6 transition-all duration-200
        ${collapsed ? "left-0 md:left-[var(--sidebar-collapsed)]" : "left-0 md:left-[var(--sidebar-width)]"}
      `}
    >
      {/* Left: Mobile menu + Search */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="btn-icon md:hidden"
          aria-label="Open menu"
        >
          <Icons.Menu />
        </button>
        <div className="hidden sm:block">
          <GlobalSearch />
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Mobile search */}
        <div className="sm:hidden">
          <button className="btn-icon" aria-label="Search">
            <Icons.Search />
          </button>
        </div>

        {isAdmin && <AdminAlertBell />}
        <NotificationBell />

        {/* Profile quick menu */}
        <div className="ml-1 flex items-center gap-2 pl-2 border-l border-surface-100">
          <div className="avatar-sm text-xs cursor-pointer hover:ring-2 hover:ring-primary-100 transition-all">
            {user?.first_name?.[0] || user?.username?.[0] || "U"}
          </div>
        </div>
      </div>
    </header>
  );
}

// ── Main Layout ──────────────────────────────────────────────────────────────
export default function Layout({ isAdmin = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Connect notification WebSocket
  useNotificationWebSocket();

  // Persist sidebar state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", collapsed);
  }, [collapsed]);

  // Close mobile nav on route change
  const location = useLocation();
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const navItems = isAdmin ? adminNav : studentNav;

  return (
    <div className="min-h-screen bg-surface-50">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        navItems={navItems}
        user={user}
        onLogout={handleLogout}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <Header
        collapsed={collapsed}
        setMobileOpen={setMobileOpen}
        user={user}
        isAdmin={isAdmin}
      />

      <main
        className={`
          pt-[var(--header-height)] min-h-screen transition-all duration-200
          ${collapsed ? "md:pl-[var(--sidebar-collapsed)]" : "md:pl-[var(--sidebar-width)]"}
        `}
      >
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
