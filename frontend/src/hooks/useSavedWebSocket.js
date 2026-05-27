/**
 * React hook for managing WebSocket connection for real-time Saved Content sync.
 * Automatically connects/disconnects based on auth state.
 * Dispatches real-time updates to the saved Redux slice.
 */
import { useEffect, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  wsItemAdded,
  wsItemRemoved,
  wsCountsUpdated,
  setSavedWsConnected,
  fetchSavedItems,
  fetchSavedCounts,
} from "../store/slices/savedSlice";
import WebSocketService from "../services/websocketService";

// Dedicated WebSocket instance for saved content
const savedWS = new WebSocketService();

export function useSavedWebSocket() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((s) => s.auth);
  const connectedRef = useRef(false);

  const connect = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token || !isAuthenticated) return;

    // If already connected, just return
    if (savedWS.isConnected) {
      dispatch(setSavedWsConnected(true));
      return;
    }

    savedWS.connect("/ws/saved/", token);

    savedWS.on("connected", () => {
      dispatch(setSavedWsConnected(true));
    });

    savedWS.on("disconnected", () => {
      dispatch(setSavedWsConnected(false));
    });

    savedWS.on("saved_item_added", (data) => {
      dispatch(wsItemAdded(data));
    });

    savedWS.on("saved_item_removed", (data) => {
      dispatch(wsItemRemoved(data));
    });

    savedWS.on("counts_updated", (data) => {
      dispatch(wsCountsUpdated(data));
    });

    savedWS.on("connection_established", (data) => {
      if (data.counts) {
        dispatch(wsCountsUpdated({ counts: data.counts }));
      }
    });

    // Fallback polling when WebSocket is unavailable
    savedWS.on("poll_tick", () => {
      dispatch(fetchSavedCounts());
    });
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && !connectedRef.current) {
      connectedRef.current = true;
      connect();
    }

    return () => {
      if (connectedRef.current) {
        savedWS.disconnect();
        connectedRef.current = false;
      }
    };
  }, [isAuthenticated, connect]);

  return {
    /** Request a fresh counts update from the server via WebSocket */
    requestCounts: () => {
      savedWS.send({ action: "get_counts" });
    },
    /** Check if WebSocket is connected */
    isConnected: () => savedWS.isConnected,
  };
}

export { savedWS };
export default useSavedWebSocket;
