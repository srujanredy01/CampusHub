/**
 * Real-time role/permission sync hook.
 * Listens for WebSocket events when Super Admin changes a user's role or permissions.
 * Automatically refreshes the dashboard configuration.
 */
import { useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  fetchDashboardConfig,
  setRoleChangeNotification,
  clearRoleChangeNotification,
} from "../store/slices/rbacSlice";
import { fetchCurrentUser } from "../store/slices/authSlice";
import { userNotificationWS } from "../services/websocketService";

/**
 * Hook that listens for role_changed and permissions_changed WebSocket events.
 * When triggered, it:
 * 1. Shows a toast notification
 * 2. Refreshes the dashboard config from backend
 * 3. Updates the auth user data
 */
export function useRoleSync() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((s) => s.auth);
  const handlersRef = useRef({});

  const handleRoleChanged = useCallback(
    (data) => {
      const info = data.data || data;

      // Show notification toast
      toast.info(
        `🔄 ${info.message || "Your role has been updated. Refreshing dashboard..."}`,
        { autoClose: 5000 }
      );

      // Store notification for UI display
      dispatch(setRoleChangeNotification(info));

      // Refresh dashboard config and user data
      dispatch(fetchDashboardConfig());
      dispatch(fetchCurrentUser());

      // Clear notification after 10 seconds
      setTimeout(() => {
        dispatch(clearRoleChangeNotification());
      }, 10000);
    },
    [dispatch]
  );

  const handlePermissionsChanged = useCallback(
    (data) => {
      const info = data.data || data;

      toast.info(
        `🔐 ${info.message || "Your permissions have been updated. Refreshing..."}`,
        { autoClose: 5000 }
      );

      // Refresh dashboard config
      dispatch(fetchDashboardConfig());
    },
    [dispatch]
  );

  useEffect(() => {
    if (!isAuthenticated) return;

    // Store refs for cleanup
    handlersRef.current = { handleRoleChanged, handlePermissionsChanged };

    // Listen for role/permission change events
    userNotificationWS.on("role_changed", handleRoleChanged);
    userNotificationWS.on("permissions_changed", handlePermissionsChanged);

    return () => {
      userNotificationWS.off("role_changed", handleRoleChanged);
      userNotificationWS.off("permissions_changed", handlePermissionsChanged);
    };
  }, [isAuthenticated, handleRoleChanged, handlePermissionsChanged]);
}
