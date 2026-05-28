/**
 * @deprecated Use PermissionRoute instead.
 * Kept for backward compatibility — delegates to PermissionRoute.
 */
import PermissionRoute from "./PermissionRoute";

export default function ModeratorRoute() {
  return <PermissionRoute requiresAny={["view_reports", "moderate_channels", "moderate_notes"]} />;
}
