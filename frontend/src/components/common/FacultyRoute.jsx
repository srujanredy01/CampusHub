/**
 * @deprecated Use PermissionRoute instead.
 * Kept for backward compatibility — delegates to PermissionRoute.
 */
import PermissionRoute from "./PermissionRoute";

export default function FacultyRoute() {
  return <PermissionRoute requiresAny={["manage_students", "manage_attendance", "grade_assignments"]} />;
}
