/**
 * WebSocket service for real-time notifications.
 * Handles connection, reconnection, and message dispatching.
 */

class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.isConnected = false;
    this.url = null;
    this.pollInterval = null;
  }

  /**
   * Connect to WebSocket endpoint.
   * @param {string} path - WebSocket path (e.g., '/ws/notifications/')
   * @param {string} token - JWT access token
   */
  connect(path, token) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    this.url = `${protocol}//${host}${path}?token=${token}`;

    this._createConnection();
  }

  _createConnection() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this._stopPolling();
        this._emit("connected", {});
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this._emit(data.type, data);
        } catch (e) {
          console.warn("WebSocket message parse error:", e);
        }
      };

      this.ws.onclose = (event) => {
        this.isConnected = false;
        this._emit("disconnected", { code: event.code });

        // Don't reconnect on auth failure
        if (event.code === 4001 || event.code === 4003) {
          return;
        }

        this._scheduleReconnect();
      };

      this.ws.onerror = () => {
        // WebSocket failed — fall back to polling
        this.isConnected = false;
        this._startPolling();
      };
    } catch (e) {
      // WebSocket not supported or blocked — fall back to polling
      this._startPolling();
    }
  }

  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this._startPolling();
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    setTimeout(() => {
      if (!this.isConnected && this.url) {
        this._createConnection();
      }
    }, Math.min(delay, 30000));
  }

  /**
   * Fallback polling when WebSocket is unavailable.
   */
  _startPolling() {
    if (this.pollInterval) return;

    this.pollInterval = setInterval(() => {
      this._emit("poll_tick", {});
    }, 15000); // Poll every 15 seconds
  }

  _stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Send a message through the WebSocket.
   * @param {object} data - Message payload
   */
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Register an event listener.
   * @param {string} event - Event type
   * @param {function} callback - Handler function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Remove an event listener.
   * @param {string} event - Event type
   * @param {function} callback - Handler to remove
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const handlers = this.listeners.get(event).filter((h) => h !== callback);
      this.listeners.set(event, handlers);
    }
  }

  _emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.warn("WebSocket listener error:", e);
        }
      });
    }
  }

  /**
   * Disconnect and clean up.
   */
  disconnect() {
    this._stopPolling();
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this.isConnected = false;
    this.listeners.clear();
  }
}

// Singleton instances
export const userNotificationWS = new WebSocketService();
export const adminNotificationWS = new WebSocketService();

export default WebSocketService;
