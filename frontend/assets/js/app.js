/**
 * CampusHub App — Navigation, Auth Guards, Layout Management
 */
'use strict';

const App = (function() {
  let currentPage = '';
  let sidebarOpen = false;

  function init() {
    // Check auth on protected pages
    const publicPages = ['login.html', 'signup.html', 'forgot-password.html', 'reset-password.html', 'verify-email.html'];
    const page = window.location.pathname.split('/').pop() || 'index.html';

    if (page === 'index.html' || page === '') {
      window.location.href = CampusHubAPI.isAuthenticated() ? '/dashboard.html' : '/login.html';
      return;
    }

    if (!publicPages.includes(page) && !CampusHubAPI.isAuthenticated()) {
      window.location.href = '/login.html';
      return;
    }

    if (publicPages.includes(page) && CampusHubAPI.isAuthenticated()) {
      const user = CampusHubAPI.getUser();
      window.location.href = user?.role === 'admin' ? '/admin.html' : '/dashboard.html';
      return;
    }

    currentPage = page;
    initLayout();
  }

  function initLayout() {
    // Setup sidebar toggle
    const menuBtn = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (menuBtn && sidebar) {
      menuBtn.addEventListener('click', () => toggleSidebar(true));
    }
    if (overlay) {
      overlay.addEventListener('click', () => toggleSidebar(false));
    }

    // Highlight active nav link
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage || href === '/' + currentPage) {
        link.classList.add('active');
      }
    });

    // Setup logout buttons
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
      btn.addEventListener('click', handleLogout);
    });

    // Load user info into sidebar
    loadUserInfo();
  }

  function toggleSidebar(open) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebarOpen = open;
    if (sidebar) sidebar.classList.toggle('open', open);
    if (overlay) overlay.classList.toggle('hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function loadUserInfo() {
    const user = CampusHubAPI.getUser();
    if (!user) return;
    const nameEl = document.getElementById('user-name');
    const detailEl = document.getElementById('user-detail');
    const avatarEl = document.getElementById('user-avatar');
    if (nameEl) nameEl.textContent = user.full_name || 'User';
    if (detailEl) detailEl.textContent = user.role === 'admin' ? 'Administrator' : `${user.branch || 'Student'} · ID ${user.student_id}`;
    if (avatarEl) {
      const initials = (user.full_name || 'U').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
      avatarEl.textContent = initials;
    }
  }

  async function handleLogout() {
    try { await AuthService.logout(); } catch(e) { /* ignore */ }
    CampusHubAPI.clearTokens();
    window.location.href = '/login.html';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init, toggleSidebar, handleLogout, formatDate, escapeHtml, loadUserInfo };
})();

document.addEventListener('DOMContentLoaded', App.init);
