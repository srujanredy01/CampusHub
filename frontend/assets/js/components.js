/* ═══════════════════════════════════════════════════════════════════════════
   CampusHub — Reusable UI Components
   ═══════════════════════════════════════════════════════════════════════════ */

const Components = {
    /**
     * Render sidebar navigation
     */
    renderSidebar(activeItem = '') {
        const user = Auth.getUser();
        const role = user?.role || 'student';

        const studentNav = [
            { id: 'dashboard', icon: '📊', label: 'Dashboard', href: '/pages/student/dashboard.html' },
            { id: 'profile', icon: '👤', label: 'Profile', href: '/pages/student/profile.html' },
            { id: 'resources', icon: '📚', label: 'Resources', href: '/pages/student/resources.html' },
            { id: 'coding', icon: '💻', label: 'Coding Hub', href: '/pages/student/coding.html' },
            { id: 'contests', icon: '🏆', label: 'Contests', href: '/pages/student/contests.html' },
            { id: 'assignments', icon: '📝', label: 'Assignments', href: '/pages/student/assignments.html' },
            { id: 'roadmaps', icon: '🗺️', label: 'Roadmaps', href: '/pages/student/roadmaps.html' },
            { id: 'placement', icon: '💼', label: 'Placement', href: '/pages/student/placement.html' },
            { id: 'resume', icon: '📄', label: 'Resume Builder', href: '/pages/student/resume.html' },
            { id: 'attendance', icon: '📋', label: 'Attendance', href: '/pages/student/attendance.html' },
            { id: 'leaderboard', icon: '🏅', label: 'Leaderboard', href: '/pages/student/leaderboard.html' },
            { id: 'news', icon: '📰', label: 'Campus News', href: '/pages/student/news.html' },
            { id: 'lost-found', icon: '🔍', label: 'Lost & Found', href: '/pages/student/lost-found.html' },
            { id: 'notifications', icon: '🔔', label: 'Notifications', href: '/pages/student/notifications.html' },
            { id: 'settings', icon: '⚙️', label: 'Settings', href: '/pages/student/settings.html' },
        ];

        const adminNav = [
            { id: 'dashboard', icon: '📊', label: 'Dashboard', href: '/pages/admin/dashboard.html' },
            { id: 'users', icon: '👥', label: 'User Management', href: '/pages/admin/users.html' },
            { id: 'faculty', icon: '🎓', label: 'Faculty', href: '/pages/admin/faculty.html' },
            { id: 'resources', icon: '📚', label: 'Resources', href: '/pages/admin/resources.html' },
            { id: 'coding', icon: '💻', label: 'Coding', href: '/pages/admin/coding.html' },
            { id: 'contests', icon: '🏆', label: 'Contests', href: '/pages/admin/contests.html' },
            { id: 'assignments', icon: '📝', label: 'Assignments', href: '/pages/admin/assignments.html' },
            { id: 'notifications', icon: '🔔', label: 'Notifications', href: '/pages/admin/notifications.html' },
            { id: 'analytics', icon: '📈', label: 'Analytics', href: '/pages/admin/analytics.html' },
            { id: 'audit', icon: '🔒', label: 'Audit Logs', href: '/pages/admin/audit.html' },
        ];

        const facultyNav = [
            { id: 'dashboard', icon: '📊', label: 'Dashboard', href: '/pages/faculty/dashboard.html' },
            { id: 'assignments', icon: '📝', label: 'Assignments', href: '/pages/faculty/assignments.html' },
            { id: 'grading', icon: '✅', label: 'Grading', href: '/pages/faculty/grading.html' },
            { id: 'resources', icon: '📚', label: 'Resources', href: '/pages/faculty/resources.html' },
            { id: 'announcements', icon: '📢', label: 'Announcements', href: '/pages/faculty/announcements.html' },
        ];

        let navItems = studentNav;
        if (role === 'admin' || role === 'super_admin') navItems = adminNav;
        else if (role === 'faculty') navItems = facultyNav;

        const navHtml = navItems.map(item => `
            <a href="${item.href}" class="sidebar-item ${activeItem === item.id ? 'active' : ''}">
                <span class="sidebar-icon">${item.icon}</span>
                <span class="sidebar-label">${item.label}</span>
            </a>
        `).join('');

        return `
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-header">
                <a href="/" class="sidebar-logo">
                    <span class="logo-icon">🎓</span>
                    <span class="logo-text">CampusHub</span>
                </a>
                <button class="sidebar-toggle" onclick="Components.toggleSidebar()" aria-label="Toggle sidebar">
                    ☰
                </button>
            </div>
            <nav class="sidebar-nav">
                ${navHtml}
            </nav>
            <div class="sidebar-footer">
                <div class="sidebar-user">
                    <div class="avatar avatar-sm">${Utils.getInitials(user?.full_name)}</div>
                    <div class="sidebar-user-info">
                        <span class="sidebar-user-name">${Utils.escapeHtml(user?.full_name || 'User')}</span>
                        <span class="sidebar-user-role">${Utils.escapeHtml(user?.role || 'student')}</span>
                    </div>
                </div>
            </div>
        </aside>`;
    },

    /**
     * Render top navbar
     */
    renderNavbar(title = '') {
        const user = Auth.getUser();
        return `
        <header class="navbar" id="navbar">
            <div class="navbar-left">
                <button class="btn-icon hide-desktop" onclick="Components.toggleSidebar()" aria-label="Menu">☰</button>
                <h1 class="navbar-title">${Utils.escapeHtml(title)}</h1>
            </div>
            <div class="navbar-right">
                <div class="search-bar hide-mobile">
                    <span class="search-icon">🔍</span>
                    <input type="text" placeholder="Search..." id="globalSearch" 
                           onkeydown="if(event.key==='Enter') Components.handleGlobalSearch(this.value)">
                </div>
                <button class="btn-icon notification-btn" onclick="window.location.href='/pages/student/notifications.html'" aria-label="Notifications">
                    🔔
                    <span class="notification-badge" id="notifBadge" style="display:none"></span>
                </button>
                <div class="dropdown">
                    <button class="navbar-avatar" onclick="Components.toggleDropdown(this)" aria-label="User menu">
                        <div class="avatar avatar-sm">${Utils.getInitials(user?.full_name)}</div>
                    </button>
                    <div class="dropdown-menu" id="userDropdown">
                        <div class="dropdown-item" style="pointer-events:none; opacity:0.7;">
                            <strong>${Utils.escapeHtml(user?.full_name || '')}</strong>
                        </div>
                        <div class="dropdown-divider"></div>
                        <a href="/pages/student/profile.html" class="dropdown-item">👤 Profile</a>
                        <a href="/pages/student/settings.html" class="dropdown-item">⚙️ Settings</a>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item" onclick="Auth.logout()">🚪 Logout</button>
                    </div>
                </div>
            </div>
        </header>`;
    },

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.querySelector('.main-content');
        sidebar.classList.toggle('collapsed');
        sidebar.classList.toggle('mobile-open');
        if (mainContent) mainContent.classList.toggle('sidebar-collapsed');
    },

    /**
     * Toggle dropdown
     */
    toggleDropdown(btn) {
        const menu = btn.closest('.dropdown').querySelector('.dropdown-menu');
        menu.classList.toggle('active');

        // Close on outside click
        const close = (e) => {
            if (!btn.closest('.dropdown').contains(e.target)) {
                menu.classList.remove('active');
                document.removeEventListener('click', close);
            }
        };
        setTimeout(() => document.addEventListener('click', close), 0);
    },

    /**
     * Handle global search
     */
    handleGlobalSearch(query) {
        if (query.trim()) {
            window.location.href = `/pages/student/search.html?q=${encodeURIComponent(query.trim())}`;
        }
    },

    /**
     * Initialize page layout
     */
    initLayout(pageId, pageTitle) {
        Utils.setPageTitle(pageTitle);

        const app = document.getElementById('app');
        if (!app) return;

        const sidebar = this.renderSidebar(pageId);
        const navbar = this.renderNavbar(pageTitle);

        app.innerHTML = `
            ${sidebar}
            <div class="main-content">
                ${navbar}
                <div class="page-container" id="pageContent">
                    <div class="page-loader-inline">
                        <div class="spinner"></div>
                    </div>
                </div>
            </div>
        `;

        // Load notification count
        this.loadNotificationCount();
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
        } catch (e) {
            // Silently fail
        }
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
            <button class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''} 
                    onclick="${onPageChange}(${currentPage - 1})">‹</button>
            ${pages.map(p => `
                <button class="pagination-btn ${p === currentPage ? 'active' : ''}" 
                        onclick="${onPageChange}(${p})">${p}</button>
            `).join('')}
            <button class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''} 
                    onclick="${onPageChange}(${currentPage + 1})">›</button>
        </div>`;
    },

    /**
     * Render loading skeleton
     */
    renderSkeleton(type = 'card', count = 3) {
        const skeletons = {
            card: '<div class="skeleton skeleton-card"></div>',
            text: `<div class="skeleton skeleton-title"></div>
                   <div class="skeleton skeleton-text" style="width:80%"></div>
                   <div class="skeleton skeleton-text" style="width:60%"></div>`,
            table: `<div class="skeleton" style="height:40px;margin-bottom:8px"></div>`.repeat(5),
        };

        return Array(count).fill(skeletons[type] || skeletons.card).join('');
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

    /**
     * Open modal
     */
    openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('active');
    },

    /**
     * Close modal
     */
    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    },

    /**
     * Confirm dialog
     */
    confirm(message, onConfirm) {
        const id = 'confirm-modal-' + Utils.generateId();
        const html = `
        <div class="modal-overlay" id="${id}" onclick="if(event.target===this)Components.closeModal('${id}')">
            <div class="modal">
                <div class="modal-header">
                    <h3 class="modal-title">Confirm</h3>
                    <button class="modal-close" onclick="Components.closeModal('${id}')">✕</button>
                </div>
                <div class="modal-body">
                    <p>${Utils.escapeHtml(message)}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="Components.closeModal('${id}');document.getElementById('${id}').remove()">Cancel</button>
                    <button class="btn btn-danger" id="${id}-confirm">Confirm</button>
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
};
