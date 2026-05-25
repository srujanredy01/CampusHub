/**
 * CampusHub Layout — Generates sidebar and top bar for authenticated pages
 */
'use strict';

const Layout = (function() {
  const studentNav = [
    { href: '/dashboard.html', icon: 'grid', label: 'Dashboard' },
    { href: '/profile.html', icon: 'user', label: 'Profile' },
    { href: '/resources.html', icon: 'book', label: 'Resources' },
    { href: '/news.html', icon: 'newspaper', label: 'News & Updates' },
    { href: '/codinghub.html', icon: 'code', label: 'Coding Hub' },
    { href: '/notifications.html', icon: 'bell', label: 'Notifications' },
  ];

  const adminNav = [
    { href: '/admin.html', icon: 'grid', label: 'Overview' },
    { href: '/admin-users.html', icon: 'users', label: 'Students' },
    { href: '/admin-resources.html', icon: 'book', label: 'Resources' },
    { href: '/admin-news.html', icon: 'newspaper', label: 'News' },
    { href: '/admin-questions.html', icon: 'code', label: 'Coding' },
    { href: '/admin-notifications.html', icon: 'bell', label: 'Notifications' },
  ];

  const icons = {
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    newspaper: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/></svg>',
    code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
    bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  };

  function render(title, isAdmin) {
    const user = CampusHubAPI.getUser();
    if (!user) { window.location.href = '/login.html'; return; }
    const nav = isAdmin ? adminNav : studentNav;
    const currentPath = '/' + (window.location.pathname.split('/').pop() || '');
    const initials = (user.full_name || 'U').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
    const portalLabel = isAdmin ? 'Admin Console' : 'Student Portal';

    const navHtml = nav.map(item => {
      const active = currentPath === item.href ? ' active' : '';
      return `<a href="${item.href}" class="nav-link${active}"><span style="width:18px;height:18px">${icons[item.icon]}</span><span>${item.label}</span></a>`;
    }).join('');

    const layoutHtml = `
      <div id="sidebar-overlay" class="sidebar-overlay hidden" onclick="App.toggleSidebar(false)"></div>
      <aside id="sidebar" class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-logo">C</div>
          <div><div class="sidebar-brand">CampusHub</div><div class="sidebar-subtitle">${portalLabel}</div></div>
        </div>
        <nav class="sidebar-nav">
          <div class="sidebar-section-label">${isAdmin ? 'Management' : 'Navigation'}</div>
          ${navHtml}
        </nav>
        <div style="border-top:1px solid var(--surface-100);padding:0.75rem">
          <div class="flex items-center gap-3" style="padding:0.5rem;border-radius:var(--radius-xl)">
            <div id="user-avatar" style="width:32px;height:32px;border-radius:var(--radius-xl);background:linear-gradient(135deg,var(--primary-500),var(--accent-violet));display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.75rem;font-weight:700;flex-shrink:0">${initials}</div>
            <div style="flex:1;min-width:0">
              <div id="user-name" style="font-size:0.875rem;font-weight:600;color:var(--slate-800);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${user.full_name}</div>
              <div id="user-detail" style="font-size:0.625rem;color:var(--slate-400)">${isAdmin ? 'Administrator' : (user.branch || 'Student') + ' · ID ' + user.student_id}</div>
            </div>
            <button data-action="logout" title="Sign out" aria-label="Sign out" style="background:none;border:none;color:var(--slate-400);padding:0.375rem;border-radius:var(--radius-lg)" onmouseover="this.style.color='var(--danger)'" onmouseout="this.style.color='var(--slate-400)'">${icons.logout}</button>
          </div>
        </div>
      </aside>
      <div class="main-wrapper">
        <header class="top-bar">
          <button id="menu-toggle" class="mobile-only" style="background:none;border:none;color:var(--slate-600);padding:0.25rem" aria-label="Open menu"><span style="width:20px;height:20px;display:block">${icons.menu}</span></button>
          <div class="top-bar-title" style="flex:1">${title}</div>
          <div id="user-avatar-top" style="width:32px;height:32px;border-radius:var(--radius-xl);background:linear-gradient(135deg,var(--primary-500),var(--accent-violet));display:flex;align-items:center;justify-content:center;color:#fff;font-size:0.75rem;font-weight:700">${initials}</div>
        </header>
        <main class="main-content"><div class="content-container fade-in" id="page-content"></div></main>
      </div>`;

    document.getElementById('app').innerHTML = layoutHtml;

    // Bind events
    const menuBtn = document.getElementById('menu-toggle');
    if (menuBtn) menuBtn.addEventListener('click', () => App.toggleSidebar(true));
    document.querySelectorAll('[data-action="logout"]').forEach(btn => btn.addEventListener('click', App.handleLogout));
  }

  return { render, icons };
})();
