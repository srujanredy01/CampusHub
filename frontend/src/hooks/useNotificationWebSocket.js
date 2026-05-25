/**
 * React hook for managing WebSocket notification connections.
 * Automatically connects/disconnects based on auth state.
 */
import { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addNotification,
  addAdminAlert,
  addLiveActivity,
  setUnreadCount,
  setAlertUnreadCount,
  setWsConnected,
  fetchNotifications,
  fetchAdminAlerts,
} from "../store/slices/notificationSlice";
import { userNotificationWS, adminNotificationWS } from "../services/websocketService";

export function useNotificationWebSocket() {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((s) => s.auth);
  const connectedRef = useRef(false);

  const connectUser = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token || !isAuthenticated) return;

    userNotificationWS.connect("/ws/notifications/", token);

    userNotificationWS.on("connected", () => {
      dispatch(setWsConnected(true));
    });

    userNotificationWS.on("disconnected", () => {
      dispatch(setWsConnected(false));
    });

    userNotificationWS.on("new_notification", (data) => {
      dispatch(addNotification(data));
    });

    userNotificationWS.on("unread_update", (data) => {
      dispatch(setUnreadCount(data.unread_count));
    });

    userNotificationWS.on("connection_established", (data) => {
      dispatch(setUnreadCount(data.unread_count));
    });

    // Fallback polling
    userNotificationWS.on("poll_tick", () => {
      dispatch(fetchNotifications());
    });
  }, [dispatch, isAuthenticated]);

  const connectAdmin = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token || !isAuthenticated || user?.role !== "admin") return;

    adminNotificationWS.connect("/ws/admin/notifications/", token);

    adminNotificationWS.on("new_alert", (data) => {
      dispatch(addAdminAlert(data));
    });

    adminNotificationWS.on("activity_update", (data) => {
      dispatch(addLiveActivity(data.activity));
    });

    adminNotificationWS.on("unread_update", (data) => {
      dispatch(setAlertUnreadCount(data.unread_count));
    });

    adminNotificationWS.on("connection_established", (data) => {
      dispatch(setAlertUnreadCount(data.unread_count));
    });

    // Fallback polling for admin
    adminNotificationWS.on("poll_tick", () => {
      dispatch(fetchAdminAlerts());
    });
  }, [dispatch, isAuthenticated, user?.role]);

  useEffect(() => {
    if (isAuthenticated && !connectedRef.current) {
      connectedRef.current = true;
      connectUser();

      if (user?.role === "admin") {
        connectAdmin();
      }
    }

    return () => {
      if (connectedRef.current) {
        userNotificationWS.disconnect();
        adminNotificationWS.disconnect();
        connectedRef.current = false;
      }
    };
  }, [isAuthenticated, user?.role, connectUser, connectAdmin]);

  return {
    markReadViaWS: (notificationId) => {
      userNotificationWS.send({ action: "mark_read", notification_id: notificationId });
    },
    markAllReadViaWS: () => {
      userNotificationWS.send({ action: "mark_all_read" });
    },
    markAlertReadViaWS: (alertId) => {
      adminNotificationWS.send({ action: "mark_read", alert_id: alertId });
    },
    markAllAlertsReadViaWS: () => {
      adminNotificationWS.send({ action: "mark_all_read" });
    },
  };
}

export default useNotificationWebSocket;
