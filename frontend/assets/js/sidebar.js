/* ═══════════════════════════════════════════════════════════════════════════
   CampusHub v5.0 — Premium Sidebar Navigation Component
   Pure JavaScript — No dependencies
   ═══════════════════════════════════════════════════════════════════════════ */

'use strict';

const Sidebar = (() => {

    // ── SVG Icon Library (Lucide-style, stroke-based) ─────────────────────
    const Icons = {
        dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
        profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></svg>`,
        notifications: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
        resources: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
        assignments: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>`,
        attendance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>`,
        performance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
        news: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`,
        coding: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
        contests: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
        leaderboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
        roadmaps: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>`,
        resume: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
        placement: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>`,
        chat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
        groups: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
        events: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg>`,
        lostfound: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>`,
        saved: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
        settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
        chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
        panelLeft: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>`,
    };

    // ── Navigation Structure ──────────────────────────────────────────────
    const NAV_CONFIG = [
        {
            id: 'main',
            label: 'Main',
            items: [
                { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', href: '/pages/student/dashboard.html' },
                { id: 'profile', icon: 'profile', label: 'Profile', href: '/pages/student/profile.html' },
                { id: 'notifications', icon: 'notifications', label: 'Notifications', href: '/pages/student/notifications.html', badgeKey: 'notifications' },
            ]
        },
        {
            id: 'academics',
            label: 'Academics',
            items: [
                { id: 'resources', icon: 'resources', label: 'Resources', href: '/pages/student/resources.html' },
                { id: 'assignments', icon: 'assignments', label: 'Assignments', href: '/pages/student/assignments.html', badgeKey: 'assignments' },
                { id: 'attendance', icon: 'attendance', label: 'Attendance', href: '/pages/student/attendance.html' },
                { id: 'performance', icon: 'performance', label: 'Academic Performance', href: '/pages/student/cgpa.html' },
                { id: 'news', icon: 'news', label: 'News & Announcements', href: '/pages/student/news.html' },
            ]
        },
        {
            id: 'coding-career',
            label: 'Coding & Career',
            items: [
                { id: 'coding', icon: 'coding', label: 'Coding Hub', href: '/pages/student/coding.html' },
                { id: 'contests', icon: 'contests', label: 'Contests', href: '/pages/student/contests.html' },
                { id: 'leaderboard', icon: 'leaderboard', label: 'Leaderboard', href: '/pages/student/leaderboard.html' },
                { id: 'roadmaps', icon: 'roadmaps', label: 'Career Roadmaps', href: '/pages/student/roadmaps.html' },
                { id: 'resume', icon: 'resume', label: 'Resume Builder', href: '/pages/student/resume.html' },
                { id: 'placement', icon: 'placement', label: 'Placement Tracker', href: '/pages/student/placement.html' },
            ]
        },
        {
            id: 'community',
            label: 'Community',
            items: [
                { id: 'chat', icon: 'chat', label: 'Campus Chat', href: '/pages/student/communication.html' },
                { id: 'groups', icon: 'groups', label: 'Study Groups', href: '/pages/student/groups.html' },
                { id: 'events', icon: 'events', label: 'Events', href: '/pages/student/events.html' },
                { id: 'lost-found', icon: 'lostfound', label: 'Lost & Found', href: '/pages/student/lost-found.html' },
            ]
        },
    ];

    // Personal group (pinned to footer)
    const PERSONAL_GROUP = {
        id: 'personal',
        label: 'Personal',
        items: [
            { id: 'saved', icon: 'saved', label: 'Saved Content', href: '/pages/student/saved.html' },
            { id: 'settings', icon: 'settings', label: 'Settings', href: '/pages/student/settings.html' },
        ]
    };

    // ── State ─────────────────────────────────────────────────────────────
    let _isCollapsed = false;
    let _isMobileOpen = false;
    let _activeId = '';
    let _badges = {};
    let _collapsedGroups = {};
    let _el = null;
    let _overlay = null;

    // ── Persistence ───────────────────────────────────────────────────────
    const STORAGE_KEY = 'campushub_sidebar';

    function _loadState() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const state = JSON.parse(raw);
                _isCollapsed = state.collapsed || false;
                _collapsedGroups = state.groups || {};
            }
        } catch (e) { /* silent */ }
    }

    function _saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                collapsed: _isCollapsed,
                groups: _collapsedGroups,
            }));
        } catch (e) { /* silent */ }
    }

    // ── Render Helpers ────────────────────────────────────────────────────
    function _icon(name) {
        return Icons[name] || Icons.dashboard;
    }

    function _renderItem(item) {
        const isActive = item.id === _activeId;
        const badge = _badges[item.badgeKey];
        const badgeHtml = badge ? `<span class="sb-item-badge" aria-label="${badge} pending">${badge > 99 ? '99+' : badge}</span>` : '';
        const activeAttr = isActive ? ' aria-current="page"' : '';
        const activeClass = isActive ? ' is-active' : '';

        return `<a href="${item.href}" class="sb-item${activeClass}" data-id="${item.id}"${activeAttr} role="menuitem" tabindex="0">
            <span class="sb-item-icon" aria-hidden="true">${_icon(item.icon)}</span>
            <span class="sb-item-text">${item.label}</span>
            ${badgeHtml}
            <span class="sb-tooltip" aria-hidden="true">${item.label}</span>
        </a>`;
    }

    function _renderGroup(group, pinned) {
        const isClosed = _collapsedGroups[group.id] || false;
        const closedClass = isClosed ? ' is-closed' : '';
        const ariaExpanded = isClosed ? 'false' : 'true';
        const items = group.items.map(i => _renderItem(i)).join('');

        return `<div class="sb-group${closedClass}" data-group="${group.id}">
            <button class="sb-group-header" aria-expanded="${ariaExpanded}" aria-controls="sb-list-${group.id}" tabindex="0">
                <span class="sb-group-label">${group.label}</span>
                <span class="sb-group-arrow" aria-hidden="true">${_icon('chevron')}</span>
            </button>
            <div class="sb-group-list" id="sb-list-${group.id}" role="menu">
                <div class="sb-group-list-inner">
                    ${items}
                </div>
            </div>
        </div>`;
    }

    // ── Build Full Sidebar HTML ───────────────────────────────────────────
    function _buildHTML() {
        const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser() : null;
        const userName = user?.full_name || 'Student';
        const userRole = user?.role || 'student';
        const initials = userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U';

        const mainGroups = NAV_CONFIG.map(g => _renderGroup(g, false)).join('');
        const personalGroup = _renderGroup(PERSONAL_GROUP, true);

        return `
        <aside class="sidebar${_isCollapsed ? ' is-collapsed' : ''}" id="campushub-sidebar" role="navigation" aria-label="Main navigation">
            <div class="sb-header">
                <a href="/" class="sb-brand" aria-label="CampusHub Home">
                    <span class="sb-brand-mark" aria-hidden="true">C</span>
                    <span class="sb-brand-name">CampusHub</span>
                </a>
                <button class="sb-toggle" aria-label="Toggle sidebar" title="Toggle sidebar">
                    <span class="sb-toggle-icon" aria-hidden="true">${_icon('panelLeft')}</span>
                </button>
            </div>
            <nav class="sb-body" aria-label="Navigation menu">
                ${mainGroups}
            </nav>
            <div class="sb-footer">
                ${personalGroup}
                <a href="/pages/student/profile.html" class="sb-user" aria-label="User profile">
                    <span class="sb-user-avatar" aria-hidden="true">${initials}</span>
                    <span class="sb-user-meta">
                        <span class="sb-user-name">${_escapeHtml(userName)}</span>
                        <span class="sb-user-role">${_escapeHtml(userRole)}</span>
                    </span>
                </a>
            </div>
        </aside>
        <div class="sb-overlay" id="sb-overlay" aria-hidden="true"></div>`;
    }

    function _escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Event Binding ─────────────────────────────────────────────────────
    function _bindEvents() {
        _el = document.getElementById('campushub-sidebar');
        _overlay = document.getElementById('sb-overlay');
        if (!_el) return;

        // Toggle collapse
        const toggleBtn = _el.querySelector('.sb-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggle);
        }

        // Group collapse/expand
        _el.querySelectorAll('.sb-group-header').forEach(header => {
            header.addEventListener('click', _handleGroupToggle);
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    _handleGroupToggle(e);
                }
            });
        });

        // Overlay click closes mobile
        if (_overlay) {
            _overlay.addEventListener('click', closeMobile);
        }

        // Keyboard: Escape closes mobile
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && _isMobileOpen) {
                closeMobile();
            }
        });

        // Keyboard navigation within items
        _el.querySelectorAll('.sb-item').forEach(item => {
            item.addEventListener('keydown', _handleItemKeydown);
        });
    }

    function _handleGroupToggle(e) {
        const header = e.currentTarget;
        const group = header.closest('.sb-group');
        if (!group) return;

        const groupId = group.dataset.group;
        const isClosed = group.classList.toggle('is-closed');
        _collapsedGroups[groupId] = isClosed;
        header.setAttribute('aria-expanded', !isClosed);
        _saveState();
    }

    function _handleItemKeydown(e) {
        const items = Array.from(_el.querySelectorAll('.sb-item'));
        const idx = items.indexOf(e.currentTarget);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = items[idx + 1];
            if (next) next.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = items[idx - 1];
            if (prev) prev.focus();
        }
    }

    // ── Public API ────────────────────────────────────────────────────────

    /**
     * Initialize the sidebar. Call once on page load.
     * @param {string} activeId - The ID of the currently active nav item
     * @param {object} badges - Badge counts, e.g. { notifications: 3, assignments: 5 }
     */
    function init(activeId, badges = {}) {
        _activeId = activeId || '';
        _badges = badges;
        _loadState();

        // Inject sidebar HTML
        const container = document.getElementById('sidebar-root');
        if (container) {
            container.innerHTML = _buildHTML();
        } else {
            document.body.insertAdjacentHTML('afterbegin', _buildHTML());
        }

        _bindEvents();
        _syncMainContent();
    }

    /**
     * Toggle sidebar collapsed state (desktop)
     */
    function toggle() {
        _isCollapsed = !_isCollapsed;
        _el = document.getElementById('campushub-sidebar');
        if (_el) {
            _el.classList.toggle('is-collapsed', _isCollapsed);
        }
        _syncMainContent();
        _saveState();
    }

    /**
     * Open mobile drawer
     */
    function openMobile() {
        _isMobileOpen = true;
        _el = document.getElementById('campushub-sidebar');
        _overlay = document.getElementById('sb-overlay');
        if (_el) _el.classList.add('is-mobile-open');
        if (_overlay) _overlay.classList.add('is-visible');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close mobile drawer
     */
    function closeMobile() {
        _isMobileOpen = false;
        _el = document.getElementById('campushub-sidebar');
        _overlay = document.getElementById('sb-overlay');
        if (_el) _el.classList.remove('is-mobile-open');
        if (_overlay) _overlay.classList.remove('is-visible');
        document.body.style.overflow = '';
    }

    /**
     * Update badge count dynamically
     */
    function setBadge(key, count) {
        _badges[key] = count;
        if (!_el) return;
        const items = _el.querySelectorAll('.sb-item');
        items.forEach(item => {
            const id = item.dataset.id;
            const config = [...NAV_CONFIG, PERSONAL_GROUP]
                .flatMap(g => g.items)
                .find(i => i.id === id);
            if (config && config.badgeKey === key) {
                let badge = item.querySelector('.sb-item-badge');
                if (count > 0) {
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'sb-item-badge';
                        item.insertBefore(badge, item.querySelector('.sb-tooltip'));
                    }
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.setAttribute('aria-label', `${count} pending`);
                } else if (badge) {
                    badge.remove();
                }
            }
        });
    }

    /**
     * Set active item programmatically
     */
    function setActive(id) {
        _activeId = id;
        if (!_el) return;
        _el.querySelectorAll('.sb-item').forEach(item => {
            const isActive = item.dataset.id === id;
            item.classList.toggle('is-active', isActive);
            if (isActive) {
                item.setAttribute('aria-current', 'page');
            } else {
                item.removeAttribute('aria-current');
            }
        });
    }

    function _syncMainContent() {
        const main = document.querySelector('.main-content');
        if (main) {
            main.classList.toggle('sidebar-collapsed', _isCollapsed);
        }
        // Also sync the navbar left offset via the layout.css variable override
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            navbar.style.left = '';  // Let CSS handle it via .sidebar-collapsed class
        }
    }

    // ── Return Public Interface ───────────────────────────────────────────
    return {
        init,
        toggle,
        openMobile,
        closeMobile,
        setBadge,
        setActive,
        Icons,
    };

})();
