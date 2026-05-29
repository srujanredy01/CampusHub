/**
 * Custom hook for Admin Dashboard real-time WebSocket connection.
 * Provides live updates for all dashboard widgets.
 */
import { useEffect, useRef, useState, useCallback } from "react";

export function useAdminWebSocket() {
  const wsRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveStats, setLiveStats] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const reconnectAttempts = useRef(0);
  const maxReconnects = 10;
  const listenersRef = useRef(new Map());

  const connect = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/admin/dashboard/?token=${token}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (e) {
          console.warn("Admin WS parse error:", e);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        if (event.code !== 4001 && event.code !== 4003) {
          scheduleReconnect();
        }
      };

      ws.onerror = () => {
        setIsConnected(false);
      };
    } catch (e) {
      console.warn("Admin WS connection failed:", e);
    }
  }, []);

  const handleMessage = useCallback((data) => {
    switch (data.type) {
      case "connection_established":
        setLiveStats(data.data);
        break;
      case "stats_update":
        setLiveStats(data.data);
        break;
      case "dashboard_update":
        setLiveStats((prev) => prev ? { ...prev, ...data.data } : data.data);
        break;
      case "user_activity":
        setActivityFeed((prev) => [
          { ...data.data, timestamp: new Date().toISOString() },
          ...prev.slice(0, 49),
        ]);
        break;
      case "attendance_update":
      case "assignment_update":
      case "event_update":
      case "report_update":
      case "study_group_update":
      case "channel_update":
        setActivityFeed((prev) => [
          { ...data.data, type: data.type, timestamp: new Date().toISOString() },
          ...prev.slice(0, 49),
        ]);
        // Also notify listeners
        if (listenersRef.current.has(data.type)) {
          listenersRef.current.get(data.type).forEach((cb) => cb(data.data));
        }
        break;
      case "notification_update":
        setActivityFeed((prev) => [
          { ...data.data, type: "notification", timestamp: new Date().toISOString() },
          ...prev.slice(0, 49),
        ]);
        break;
      case "active_users_update":
        setLiveStats((prev) => prev ? { ...prev, ...data.data } : data.data);
        break;
      default:
        break;
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnects) return;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    reconnectAttempts.current++;
    setTimeout(() => {
      if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
        connect();
      }
    }, delay);
  }, [connect]);

  const requestStats = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "get_stats" }));
    }
  }, []);

  const on = useCallback((event, callback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, []);
    }
    listenersRef.current.get(event).push(callback);
  }, []);

  const off = useCallback((event, callback) => {
    if (listenersRef.current.has(event)) {
      const handlers = listenersRef.current.get(event).filter((h) => h !== callback);
      listenersRef.current.set(event, handlers);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmount");
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected, liveStats, activityFeed, requestStats, on, off };
}

export default useAdminWebSocket;
