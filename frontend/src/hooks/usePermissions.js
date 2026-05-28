/**
 * Permission hooks for dynamic RBAC.
 * These hooks are the primary way components check permissions.
 * NO hardcoded role checks — everything flows from backend config.
 */
import { useSelector } from "react-redux";
import { useMemo } from "react";

/**
 * Check if the current user has a specific permission.
 * @param {string} permission - Permission codename
 * @returns {boolean}
 */
export function useHasPermission(permission) {
  const permissions = useSelector((s) => s.rbac.permissions);
  return permissions.includes(permission);
}

/**
 * Check if the current user has ANY of the given permissions.
 * @param {string[]} perms - Array of permission codenames
 * @returns {boolean}
 */
export function useHasAnyPermission(perms) {
  const permissions = useSelector((s) => s.rbac.permissions);
  return useMemo(
    () => perms.some((p) => permissions.includes(p)),
    [permissions, perms]
  );
}

/**
 * Check if the current user has ALL of the given permissions.
 * @param {string[]} perms - Array of permission codenames
 * @returns {boolean}
 */
export function useHasAllPermissions(perms) {
  const permissions = useSelector((s) => s.rbac.permissions);
  return useMemo(
    () => perms.every((p) => permissions.includes(p)),
    [permissions, perms]
  );
}

/**
 * Get the current user's role.
 * @returns {string|null}
 */
export function useRole() {
  return useSelector((s) => s.rbac.role);
}

/**
 * Check if a module is accessible to the current user.
 * @param {string} moduleId - Module identifier
 * @returns {boolean}
 */
export function useCanAccessModule(moduleId) {
  const modules = useSelector((s) => s.rbac.modules);
  return modules.includes(moduleId);
}

/**
 * Get the dynamic sidebar items for the current user.
 * @returns {Array}
 */
export function useSidebar() {
  return useSelector((s) => s.rbac.sidebar);
}

/**
 * Get the dashboard widgets for the current user.
 * @returns {Array}
 */
export function useWidgets() {
  return useSelector((s) => s.rbac.widgets);
}

/**
 * Get the user's access scope.
 * @returns {object|null}
 */
export function useScope() {
  return useSelector((s) => s.rbac.scope);
}

/**
 * Check if RBAC is initialized (config loaded from backend).
 * @returns {boolean}
 */
export function useRbacInitialized() {
  return useSelector((s) => s.rbac.initialized);
}

/**
 * Check if the current user is a specific role.
 * Prefer permission checks over role checks where possible.
 * @param {string} roleName - Role to check
 * @returns {boolean}
 */
export function useIsRole(roleName) {
  const role = useSelector((s) => s.rbac.role);
  return role === roleName;
}

/**
 * Check if the current user is any of the given roles.
 * @param {string[]} roles - Array of role names
 * @returns {boolean}
 */
export function useIsAnyRole(roles) {
  const role = useSelector((s) => s.rbac.role);
  return roles.includes(role);
}

/**
 * Get all permissions for the current user.
 * Useful for debugging or displaying permission lists.
 * @returns {string[]}
 */
export function usePermissions() {
  return useSelector((s) => s.rbac.permissions);
}

/**
 * Get all accessible modules for the current user.
 * @returns {string[]}
 */
export function useAccessibleModules() {
  return useSelector((s) => s.rbac.modules);
}
