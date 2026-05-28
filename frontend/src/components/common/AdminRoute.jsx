/**
 * @deprecated Use PermissionRoute instead.
 * Kept for backward compatibility — delegates to PermissionRoute.
 */
import PermissionRoute from "./PermissionRoute";

export default function AdminRoute() {
  return <PermissionRoute requires="manage_users" />;
}
