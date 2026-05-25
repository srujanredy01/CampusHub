/**
 * CampusHub API Client — Pure JavaScript (no dependencies)
 * Handles JWT authentication, token refresh, and API calls.
 */
'use strict';

const CampusHubAPI = (function() {
  const API_BASE = '/api';
  let isRefreshing = false;
  let failedQueue = [];

  function getAccessToken() { return localStorage.getItem('access_token'); }
  function getRefreshToken() { return localStorage.getItem('refresh_token'); }
  function setTokens(access, refresh) {
    if (access) localStorage.setItem('access_token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
  }
  function clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }
  function getUser() {
    try { return JSON.parse(localStorage.getItem('user')); }
    catch { return null; }
  }
  function setUser(user) { localStorage.setItem('user', JSON.stringify(user)); }

  function processQueue(error, token) {
    failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
    failedQueue = [];
  }

  async function request(method, path, body, options = {}) {
    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
    const headers = {};
    const token = getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const config = { method, headers, ...options };
    if (body) config.body = body instanceof FormData ? body : JSON.stringify(body);

    let response = await fetch(url, config);

    // Handle 401 — attempt token refresh
    if (response.status === 401 && getRefreshToken()) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(newToken => {
          headers['Authorization'] = `Bearer ${newToken}`;
          config.headers = headers;
          return fetch(url, config).then(handleResponse);
        });
      }
      isRefreshing = true;
      try {
        const refreshResp = await fetch(`${API_BASE}/auth/token/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh: getRefreshToken() })
        });
        if (refreshResp.ok) {
          const data = await refreshResp.json();
          setTokens(data.access, data.refresh);
          processQueue(null, data.access);
          headers['Authorization'] = `Bearer ${data.access}`;
          config.headers = headers;
          response = await fetch(url, config);
        } else {
          processQueue(new Error('Refresh failed'), null);
          clearTokens();
          window.location.href = '/login.html';
          throw new Error('Session expired');
        }
      } catch (err) {
        processQueue(err, null);
        clearTokens();
        window.location.href = '/login.html';
        throw err;
      } finally { isRefreshing = false; }
    }
    return handleResponse(response);
  }

  async function handleResponse(response) {
    if (response.status === 204) return { success: true };
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg = data?.error?.message || data?.message || `Request failed (${response.status})`;
      const err = new Error(msg);
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // Convenience methods
  const get = (path, params) => {
    let url = path;
    if (params) {
      const qs = new URLSearchParams(params).toString();
      url += (url.includes('?') ? '&' : '?') + qs;
    }
    return request('GET', url);
  };
  const post = (path, body) => request('POST', path, body);
  const put = (path, body) => request('PUT', path, body);
  const del = (path) => request('DELETE', path);
  const upload = (path, formData) => request('POST', path, formData);

  // Public API
  return {
    get, post, put, del, upload, request,
    getUser, setUser, getAccessToken, getRefreshToken,
    setTokens, clearTokens,
    isAuthenticated: () => !!getAccessToken(),
  };
})();

// Auth service
const AuthService = {
  login: (student_id, password) => CampusHubAPI.post('/auth/login', { student_id, password }),
  signup: (data) => CampusHubAPI.post('/auth/signup', data),
  logout: () => CampusHubAPI.post('/auth/logout', { refresh: CampusHubAPI.getRefreshToken() }),
  me: () => CampusHubAPI.get('/auth/me'),
  forgotPassword: (email) => CampusHubAPI.post('/auth/forgot-password', { email }),
  resetPassword: (token, password, password_confirm) =>
    CampusHubAPI.post('/auth/reset-password', { token, password, password_confirm }),
  changePassword: (old_password, new_password, new_password_confirm) =>
    CampusHubAPI.post('/auth/change-password', { old_password, new_password, new_password_confirm }),
};

// Toast utility
const Toast = {
  _container: null,
  _init() {
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.className = 'toast-container';
      document.body.appendChild(this._container);
    }
  },
  show(message, type = 'info') {
    this._init();
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    this._container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 4000);
  },
  success(msg) { this.show(msg, 'success'); },
  error(msg) { this.show(msg, 'error'); },
  info(msg) { this.show(msg, 'info'); },
};
