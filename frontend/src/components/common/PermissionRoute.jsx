/**
 * Dynamic Permission-Based Route Guard.
 * Replaces hardcoded AdminRoute/FacultyRoute/ModeratorRoute.
 *
 * Usage:
 *   <Route element={<PermissionRoute requires="manage_users" />}>
 *     <Route path="/admin/users" element={<AdminUsersPage />} />
 *   </Route>
 *
 *   <Route element={<PermissionRoute requiresAny={["manage_students", "manage_attendance"]} />}>
 *     <Route path="/faculty/dashboard" element={<FacultyDashboardPage />} />
 *   </Route>
 *
 * Access Denied:
 *   Unauthorized users are redirected to /access-denied (not just hidden).
 *   This prevents role escalation via URL manipulation.
 */
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

export default function PermissionRoute({ requires, requiresAny, requiresAll, fallback = "/access-denied" }) {
  const { isAuthenticated, isInitialized } = useSelector((s) => s.auth);
  const { permissions, initialized: rbacInitialized } = useSelector((s) => s.rbac);

  // Wait for auth and RBAC to initialize
  if (!isInitialized || !rbacInitialized) return null;

  // Not authenticated → login
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Check permissions
  let hasAccess = false;

  if (requires) {
    // Single permission check
    hasAccess = permissions.includes(requires);
  } else if (requiresAny) {
    // Any of the permissions
    hasAccess = requiresAny.some((p) => permissions.includes(p));
  } else if (requiresAll) {
    // All permissions required
    hasAccess = requiresAll.every((p) => permissions.includes(p));
  } else {
    // No permission specified — just require authentication
    hasAccess = true;
  }

  if (!hasAccess) {
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}
