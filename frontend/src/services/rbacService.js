/**
 * RBAC Service — fetches dynamic dashboard configuration from backend.
 * This is the bridge between backend permissions and frontend rendering.
 */
import api from "./api";

export const rbacService = {
  /**
   * Fetch complete dashboard configuration (sidebar, widgets, permissions, modules).
   * Called on login, token refresh, and role change events.
   */
  getDashboardConfig: () => api.get("/auth/dashboard-config"),

  /**
   * Lightweight permission sync (just role + permissions array).
   * Called periodically or on WebSocket permission_changed events.
   */
  getPermissions: () => api.get("/auth/permissions"),

  /**
   * Get all available roles and their permissions (admin only).
   */
  getRoles: () => api.get("/auth/roles"),

  /**
   * Update a user's role (admin only).
   */
  updateUserRole: (userId, role) => api.post(`/auth/users/${userId}/role`, { role }),

  /**
   * Update a user's permissions (super admin only).
   */
  updateUserPermissions: (userId, { grant, revoke }) =>
    api.post(`/auth/users/${userId}/permissions`, { grant, revoke }),
};
