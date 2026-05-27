/* ═══════════════════════════════════════════════════════════════════════════
   CampusHub v3.0 — Premium UI Components
   ═══════════════════════════════════════════════════════════════════════════ */

const Components = {
    /**
     * Render sidebar navigation — Premium design
     */
    renderSidebar(activeItem = '') {
        const user = Auth.getUser();
        const role = user?.role || 'student';

        const studentNav = [
            { section: 'Main' },
            { id: 'dashboard', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`, label: 'Dashboard', href: '/pages/student/dashboard.html' },
            { id: 'resources', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`, label: 'Resources', href: '/pages/student/resources.html' },
            { id: 'assignments', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`, label: 'Assignments', href: '/pages/student/assignments.html' },
            { section: 'Coding' },
            { id: 'coding', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`, label: 'Coding Hub', href: '/pages/student/coding.html' },
            { id: 'contests', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`, label: 'Contests', href: '/pages/student/contests.html' },
            { id: 'leaderboard', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`, label: 'Leaderboard', href: '/pages/student/leaderboard.html' },
            { section: 'Career' },
            { id: 'placement', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`, label: 'Placement', href: '/pages/student/placement.html' },
            { id: 'resume', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`, label: 'Resume', href: '/pages/student/resume.html' },
            { id: 'roadmaps', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`, label: 'Roadmaps', href: '/pages/student/roadmaps.html' },
            { section: 'Campus' },
            { id: 'attendance', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`, label: 'Attendance', href: '/pages/student/attendance.html' },
            { id: 'news', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1m2 13a2 2 0 0 1-2-2V7m2 13a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/></svg>`, label: 'News', href: '/pages/student/news.html' },
            { id: 'lost-found', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`, label: 'Lost & Found', href: '/pages/student/lost-found.html' },
            { section: 'Personal' },
            { id: 'saved', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`, label: 'Saved Content', href: '/pages/student/saved.html' },
            { id: 'settings', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`, label: 'Settings', href: '/pages/student/settings.html' },
        ];

        const adminNav = [
            { section: 'Overview' },
            { id: 'dashboard', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`, label: 'Dashboard', href: '/pages/admin/dashboard.html' },
            { id: 'analytics', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`, label: 'Analytics', href: '/pages/admin/analytics.html' },
            { section: 'Management' },
            { id: 'users', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`, label: 'Users', href: '/pages/admin/users.html' },
            { id: 'faculty', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`, label: 'Faculty', href: '/pages/admin/faculty.html' },
            { id: 'resources', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`, label: 'Resources', href: '/pages/admin/resources.html' },
            { id: 'coding', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`, label: 'Coding', href: '/pages/admin/coding.html' },
            { id: 'contests', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`, label: 'Contests', href: '/pages/admin/contests.html' },
            { id: 'assignments', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`, label: 'Assignments', href: '/pages/admin/assignments.html' },
            { section: 'System' },
            { id: 'notifications', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`, label: 'Notifications', href: '/pages/admin/notifications.html' },
            { id: 'audit', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`, label: 'Audit Logs', href: '/pages/admin/audit.html' },
        ];

        const facultyNav = [
            { section: 'Main' },
            { id: 'dashboard', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`, label: 'Dashboard', href: '/pages/faculty/dashboard.html' },
            { id: 'assignments', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`, label: 'Assignments', href: '/pages/faculty/assignments.html' },
            { id: 'grading', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`, label: 'Grading', href: '/pages/faculty/grading.html' },
            { id: 'resources', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`, label: 'Resources', href: '/pages/faculty/resources.html' },
            { id: 'announcements', icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`, label: 'Announcements', href: '/pages/faculty/announcements.html' },
        ];

        let navItems = studentNav;
        if (role === 'admin' || role === 'super_admin') navItems = adminNav;
        else if (role === 'faculty') navItems = facultyNav;

        const navHtml = navItems.map(item => {
            if (item.section) {
                return `<div class="sidebar-section-title">${item.section}</div>`;
            }
            return `
                <a href="${item.href}" class="sidebar-item ${activeItem === item.id ? 'active' : ''}" aria-label="${item.label}">
                    <span class="sidebar-icon">${item.icon}</span>
                    <span class="sidebar-label">${item.label}</span>
                </a>
            `;
        }).join('');

        return `
        <aside class="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">
            <div class="sidebar-header">
                <a href="/" class="sidebar-logo" aria-label="CampusHub Home">
                    <span class="logo-icon">C</span>
                    <span class="logo-text">CampusHub</span>
                </a>
                <button class="sidebar-toggle" onclick="Components.toggleSidebar()" aria-label="Toggle sidebar">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
            </div>
            <nav class="sidebar-nav">
                ${navHtml}
            </nav>
            <div class="sidebar-footer">
                <div class="sidebar-user" onclick="window.location.href='/pages/student/profile.html'">
                    <div class="avatar avatar-sm">${Utils.getInitials(user?.full_name)}</div>
                    <div class="sidebar-user-info">
                        <span class="sidebar-user-name">${Utils.escapeHtml(user?.full_name || 'User')}</span>
                        <span class="sidebar-user-role">${Utils.escapeHtml(user?.role || 'student')}</span>
                    </div>
                </div>
            </div>
        </aside>
        <div class="mobile-overlay" id="mobileOverlay" onclick="Components.closeMobileSidebar()"></div>`;
    },

    /**
     * Render top navbar — Premium design with command palette trigger
     */
    renderNavbar(title = '') {
        const user = Auth.getUser();
        return `
        <header class="navbar" id="navbar" role="banner">
            <div class="navbar-left">
                <button class="btn-icon hide-desktop" onclick="Sidebar.openMobile()" aria-label="Open menu">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </button>
                <h1 class="navbar-title">${Utils.escapeHtml(title)}</h1>
            </div>
            <div class="navbar-right">
                <button class="navbar-search-trigger hide-mobile" onclick="Components.openCommandPalette()" aria-label="Search">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span>Search...</span>
                    <span class="kbd">⌘K</span>
                </button>
                <button class="theme-toggle" onclick="Components.toggleTheme()" aria-label="Toggle theme" data-tooltip="Toggle theme">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                </button>
                <button class="btn-icon notification-btn" onclick="window.location.href='/pages/student/notifications.html'" aria-label="Notifications">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    <span class="notification-badge" id="notifBadge" style="display:none"></span>
                </button>
                <div class="dropdown">
                    <button class="navbar-avatar" onclick="Components.toggleDropdown(this)" aria-label="User menu">
                        <div class="avatar avatar-sm">${Utils.getInitials(user?.full_name)}</div>
                    </button>
                    <div class="dropdown-menu" id="userDropdown">
                        <div class="dropdown-item" style="pointer-events:none; padding-bottom: var(--space-1);">
                            <div>
                                <div class="font-medium text-sm text-gray-900">${Utils.escapeHtml(user?.full_name || '')}</div>
                                <div class="text-xs text-gray-500">${Utils.escapeHtml(user?.email || user?.student_id || '')}</div>
                            </div>
                        </div>
                        <div class="dropdown-divider"></div>
                        <a href="/pages/student/profile.html" class="dropdown-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            Profile
                        </a>
                        <a href="/pages/student/settings.html" class="dropdown-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                            Settings
                        </a>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item danger" onclick="Auth.logout()">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        </header>`;
    },

    /**
     * Toggle sidebar collapse
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');
        sidebar.classList.toggle('collapsed');
        if (mainContent) mainContent.classList.toggle('sidebar-collapsed');
        localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
    },

    /**
     * Open mobile sidebar
     */
    openMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        sidebar.classList.add('mobile-open');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close mobile sidebar
     */
    closeMobileSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('mobileOverlay');
        sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    },

    /**
     * Toggle dropdown
     */
    toggleDropdown(btn) {
        const menu = btn.closest('.dropdown').querySelector('.dropdown-menu');
        menu.classList.toggle('active');
        const close = (e) => {
            if (!btn.closest('.dropdown').contains(e.target)) {
                menu.classList.remove('active');
                document.removeEventListener('click', close);
            }
        };
        setTimeout(() => document.addEventListener('click', close), 0);
    },

    /**
     * Toggle dark/light theme
     */
    toggleTheme() {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
    },

    /**
     * Initialize theme from localStorage
     */
    initTheme() {
        const saved = localStorage.getItem('theme');
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    },

    /**
     * Open command palette (global search)
     */
    openCommandPalette() {
        let palette = document.getElementById('commandPalette');
        if (!palette) {
            document.body.insertAdjacentHTML('beforeend', `
                <div class="command-palette" id="commandPalette" onclick="if(event.target===this)Components.closeCommandPalette()">
                    <div class="command-palette-box">
                        <input type="text" class="command-palette-input" id="commandInput" 
                               placeholder="Search pages, resources, problems..." 
                               oninput="Components.handleCommandSearch(this.value)"
                               onkeydown="Components.handleCommandKey(event)">
                        <div class="command-palette-results" id="commandResults">
                            <div style="padding: var(--space-4); text-align: center; color: var(--gray-400); font-size: var(--text-sm);">
                                Type to search across CampusHub
                            </div>
                        </div>
                    </div>
                </div>
            `);
            palette = document.getElementById('commandPalette');
        }
        palette.classList.add('active');
        setTimeout(() => document.getElementById('commandInput').focus(), 100);
    },

    closeCommandPalette() {
        const palette = document.getElementById('commandPalette');
        if (palette) palette.classList.remove('active');
    },

    handleCommandSearch(query) {
        const results = document.getElementById('commandResults');
        if (!query.trim()) {
            results.innerHTML = `<div style="padding: var(--space-4); text-align: center; color: var(--gray-400); font-size: var(--text-sm);">Type to search across CampusHub</div>`;
            return;
        }
        // Quick navigation items
        const pages = [
            { label: 'Dashboard', href: '/pages/student/dashboard.html', icon: '📊' },
            { label: 'Resources', href: '/pages/student/resources.html', icon: '📚' },
            { label: 'Coding Hub', href: '/pages/student/coding.html', icon: '💻' },
            { label: 'Contests', href: '/pages/student/contests.html', icon: '🏆' },
            { label: 'Assignments', href: '/pages/student/assignments.html', icon: '📝' },
            { label: 'Placement Tracker', href: '/pages/student/placement.html', icon: '💼' },
            { label: 'Resume Builder', href: '/pages/student/resume.html', icon: '📄' },
            { label: 'Career Roadmaps', href: '/pages/student/roadmaps.html', icon: '🗺️' },
            { label: 'News', href: '/pages/student/news.html', icon: '📰' },
            { label: 'Lost & Found', href: '/pages/student/lost-found.html', icon: '🔍' },
            { label: 'Profile', href: '/pages/student/profile.html', icon: '👤' },
            { label: 'Settings', href: '/pages/student/settings.html', icon: '⚙️' },
            { label: 'Saved Content', href: '/pages/student/saved.html', icon: '🔖' },
            { label: 'Leaderboard', href: '/pages/student/leaderboard.html', icon: '🏅' },
            { label: 'Attendance', href: '/pages/student/attendance.html', icon: '📋' },
        ];
        const filtered = pages.filter(p => p.label.toLowerCase().includes(query.toLowerCase()));
        if (filtered.length === 0) {
            results.innerHTML = `<div style="padding: var(--space-4); text-align: center; color: var(--gray-400); font-size: var(--text-sm);">No results found. Press Enter to search resources.</div>`;
            return;
        }
        results.innerHTML = filtered.map((p, i) => `
            <a href="${p.href}" class="command-palette-item ${i === 0 ? 'selected' : ''}">
                <span>${p.icon}</span>
                <span style="font-size: var(--text-sm); color: var(--gray-700);">${p.label}</span>
            </a>
        `).join('');
    },

    handleCommandKey(e) {
        if (e.key === 'Escape') this.closeCommandPalette();
        if (e.key === 'Enter') {
            const selected = document.querySelector('.command-palette-item.selected');
            if (selected) {
                window.location.href = selected.href;
            } else {
                const query = e.target.value.trim();
                if (query) window.location.href = `/pages/student/search.html?q=${encodeURIComponent(query)}`;
            }
        }
    },

    /**
     * Initialize page layout — Premium version (v5 with new Sidebar)
     */
    initLayout(pageId, pageTitle) {
        Utils.setPageTitle(pageTitle);
        this.initTheme();

        const app = document.getElementById('app');
        if (!app) return;

        const navbar = this.renderNavbar(pageTitle);

        // Build main content shell (sidebar is injected separately by Sidebar module)
        app.innerHTML = `
            <div id="sidebar-root"></div>
            <div class="main-content" id="mainContent">
                ${navbar}
                <div class="page-container" id="pageContent">
                    <div style="display:flex;align-items:center;justify-content:center;padding:var(--space-12);">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        `;

        // Initialize the new premium sidebar
        if (typeof Sidebar !== 'undefined') {
            Sidebar.init(pageId, {});
            // Load notification count and update badge
            this._loadBadgesForSidebar();
        } else {
            // Fallback: use legacy sidebar if sidebar.js not loaded
            const legacySidebar = this.renderSidebar(pageId);
            document.getElementById('sidebar-root').innerHTML = legacySidebar;
            if (localStorage.getItem('sidebar_collapsed') === 'true') {
                const sb = document.getElementById('sidebar');
                if (sb) sb.classList.add('collapsed');
                const mc = document.getElementById('mainContent');
                if (mc) mc.classList.add('sidebar-collapsed');
            }
        }

        // Keyboard shortcut for command palette
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.openCommandPalette();
            }
            if (e.key === 'Escape') {
                this.closeCommandPalette();
            }
        });

        // Load notification count (for navbar badge)
        this.loadNotificationCount();
    },

    /**
     * Load badge counts for the new sidebar
     */
    async _loadBadgesForSidebar() {
        try {
            const data = await API.get('/notifications/unread-count');
            if (data?.data?.count > 0) {
                Sidebar.setBadge('notifications', data.data.count);
            }
        } catch (e) { /* silent */ }
    },

    /**
     * Load unread notification count
     */
    async loadNotificationCount() {
        try {
            const data = await API.get('/notifications/unread-count');
            const badge = document.getElementById('notifBadge');
            if (badge && data?.data?.count > 0) {
                badge.textContent = data.data.count > 99 ? '99+' : data.data.count;
                badge.style.display = 'flex';
            }
        } catch (e) { /* silent */ }
    },

    /**
     * Render pagination
     */
    renderPagination(currentPage, totalPages, onPageChange) {
        if (totalPages <= 1) return '';
        let pages = [];
        const maxVisible = 5;
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
        for (let i = start; i <= end; i++) pages.push(i);

        return `
        <div class="pagination">
            <button class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} onclick="${onPageChange}(${currentPage - 1})" aria-label="Previous page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            ${pages.map(p => `
                <button class="pagination-btn ${p === currentPage ? 'active' : ''}" onclick="${onPageChange}(${p})">${p}</button>
            `).join('')}
            <button class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''} onclick="${onPageChange}(${currentPage + 1})" aria-label="Next page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
        </div>`;
    },

    /**
     * Render loading skeleton — Premium shimmer
     */
    renderSkeleton(type = 'card', count = 3) {
        const skeletons = {
            card: '<div class="skeleton skeleton-card" style="animation-delay:calc(var(--i,0) * 100ms)"></div>',
            text: `<div class="skeleton skeleton-title"></div><div class="skeleton skeleton-text" style="width:75%"></div><div class="skeleton skeleton-text" style="width:55%"></div>`,
            row: '<div class="skeleton skeleton-row"></div>',
            table: `<div class="skeleton skeleton-row"></div>`.repeat(5),
            stat: '<div class="skeleton" style="height:80px;border-radius:var(--radius-xl)"></div>',
        };
        return Array(count).fill(0).map((_, i) => 
            (skeletons[type] || skeletons.card).replace('var(--i,0)', i)
        ).join('');
    },

    /**
     * Render empty state
     */
    renderEmptyState(icon, title, message, actionHtml = '') {
        return `
        <div class="empty-state">
            <div class="empty-state-icon">${icon}</div>
            <h3 class="empty-state-title">${Utils.escapeHtml(title)}</h3>
            <p class="empty-state-text">${Utils.escapeHtml(message)}</p>
            ${actionHtml}
        </div>`;
    },

    /** Open modal */
    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    /** Close modal */
    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
    },

    /** Confirm dialog */
    confirm(message, onConfirm) {
        const id = 'confirm-' + Utils.generateId();
        const html = `
        <div class="modal-overlay" id="${id}" onclick="if(event.target===this)Components.closeModal('${id}')">
            <div class="modal" style="max-width:400px">
                <div class="modal-header">
                    <h3 class="modal-title">Confirm action</h3>
                    <button class="modal-close" onclick="Components.closeModal('${id}')">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                <div class="modal-body">
                    <p class="text-sm text-gray-600">${Utils.escapeHtml(message)}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary btn-sm" onclick="Components.closeModal('${id}');document.getElementById('${id}').remove()">Cancel</button>
                    <button class="btn btn-danger btn-sm" id="${id}-confirm">Confirm</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
        Components.openModal(id);
        document.getElementById(`${id}-confirm`).onclick = () => {
            Components.closeModal(id);
            document.getElementById(id).remove();
            onConfirm();
        };
    },

    /**
     * Handle global search (legacy support)
     */
    handleGlobalSearch(query) {
        if (query.trim()) {
            window.location.href = `/pages/student/search.html?q=${encodeURIComponent(query.trim())}`;
        }
    },
};
