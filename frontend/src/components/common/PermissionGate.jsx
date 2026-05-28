/**
 * Permission Gate — conditionally renders children based on permissions.
 * This is for in-page component rendering (widgets, buttons, sections).
 * Does NOT just hide with CSS — actually prevents rendering.
 *
 * Usage:
 *   <PermissionGate requires="manage_users">
 *     <AdminWidget />
 *   </PermissionGate>
 *
 *   <PermissionGate requiresAny={["grade_assignments", "create_assignments"]}>
 *     <GradingPanel />
 *   </PermissionGate>
 *
 *   <PermissionGate requires="view_coding" fallback={<UpgradePrompt />}>
 *     <CodingHub />
 *   </PermissionGate>
 */
import { useSelector } from "react-redux";

export default function PermissionGate({ requires, requiresAny, requiresAll, children, fallback = null }) {
  const { permissions, initialized } = useSelector((s) => s.rbac);

  // Don't render anything until RBAC is initialized
  if (!initialized) return null;

  let hasAccess = false;

  if (requires) {
    hasAccess = permissions.includes(requires);
  } else if (requiresAny) {
    hasAccess = requiresAny.some((p) => permissions.includes(p));
  } else if (requiresAll) {
    hasAccess = requiresAll.every((p) => permissions.includes(p));
  } else {
    hasAccess = true;
  }

  if (!hasAccess) {
    return fallback;
  }

  return children;
}
