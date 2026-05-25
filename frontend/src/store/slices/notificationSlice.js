import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchNotifications = createAsyncThunk(
  "notifications/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/notifications/", { params });
      return response.data.data;
    } catch (error) {
      return rejectWithValue("Failed to fetch notifications");
    }
  }
);

export const markAllRead = createAsyncThunk(
  "notifications/markAllRead",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/notifications/mark-read", {});
      return response.data.data;
    } catch (error) {
      return rejectWithValue("Failed to mark notifications as read");
    }
  }
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async (ids, { rejectWithValue }) => {
    try {
      const response = await api.post("/notifications/mark-read", { ids });
      return { ids, unread_count: response.data.data?.unread_count };
    } catch (error) {
      return rejectWithValue("Failed to mark notification as read");
    }
  }
);

export const deleteNotification = createAsyncThunk(
  "notifications/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/notifications/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue("Failed to delete notification");
    }
  }
);

export const fetchUnreadCount = createAsyncThunk(
  "notifications/fetchUnreadCount",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/notifications/unread-count");
      return response.data.data.unread_count;
    } catch (error) {
      return rejectWithValue("Failed to fetch unread count");
    }
  }
);

// Admin alerts
export const fetchAdminAlerts = createAsyncThunk(
  "notifications/fetchAdminAlerts",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin/alerts", { params });
      return response.data.data;
    } catch (error) {
      return rejectWithValue("Failed to fetch admin alerts");
    }
  }
);

export const markAllAlertsRead = createAsyncThunk(
  "notifications/markAllAlertsRead",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.post("/admin/alerts/mark-read", {});
      return response.data.data;
    } catch (error) {
      return rejectWithValue("Failed to mark alerts as read");
    }
  }
);

export const fetchAlertStats = createAsyncThunk(
  "notifications/fetchAlertStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/admin/alerts/stats");
      return response.data.data;
    } catch (error) {
      return rejectWithValue("Failed to fetch alert stats");
    }
  }
);

const notificationSlice = createSlice({
  name: "notifications",
  initialState: {
    items: [],
    unreadCount: 0,
    loading: false,
    // Admin alerts
    alerts: [],
    alertUnreadCount: 0,
    alertStats: null,
    alertsLoading: false,
    // Live activity feed
    liveActivities: [],
    // WebSocket status
    wsConnected: false,
  },
  reducers: {
    // Called by WebSocket when new notification arrives
    addNotification: (state, action) => {
      state.items.unshift(action.payload.notification);
      state.unreadCount = action.payload.unread_count ?? state.unreadCount + 1;
      // Keep max 100 items in memory
      if (state.items.length > 100) {
        state.items = state.items.slice(0, 100);
      }
    },
    // Called by WebSocket when new admin alert arrives
    addAdminAlert: (state, action) => {
      state.alerts.unshift(action.payload.alert);
      state.alertUnreadCount = action.payload.unread_count ?? state.alertUnreadCount + 1;
      if (state.alerts.length > 100) {
        state.alerts = state.alerts.slice(0, 100);
      }
    },
    // Called by WebSocket for live activity
    addLiveActivity: (state, action) => {
      state.liveActivities.unshift(action.payload);
      if (state.liveActivities.length > 50) {
        state.liveActivities = state.liveActivities.slice(0, 50);
      }
    },
    // Update unread count from WebSocket
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    setAlertUnreadCount: (state, action) => {
      state.alertUnreadCount = action.payload;
    },
    setWsConnected: (state, action) => {
      state.wsConnected = action.payload;
    },
    clearNotifications: (state) => {
      state.items = [];
      state.unreadCount = 0;
    },
    clearAlerts: (state) => {
      state.alerts = [];
      state.alertUnreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.notifications || [];
        state.unreadCount = action.payload.unread_count || 0;
      })
      .addCase(fetchNotifications.rejected, (state) => {
        state.loading = false;
      });

    builder.addCase(markAllRead.fulfilled, (state) => {
      state.items = state.items.map((n) => ({ ...n, is_read: true }));
      state.unreadCount = 0;
    });

    builder.addCase(markNotificationRead.fulfilled, (state, action) => {
      const { ids, unread_count } = action.payload;
      state.items = state.items.map((n) =>
        ids.includes(n.id) ? { ...n, is_read: true } : n
      );
      if (unread_count !== undefined) {
        state.unreadCount = unread_count;
      }
    });

    builder.addCase(deleteNotification.fulfilled, (state, action) => {
      state.items = state.items.filter((n) => n.id !== action.payload);
    });

    builder.addCase(fetchUnreadCount.fulfilled, (state, action) => {
      state.unreadCount = action.payload;
    });

    // Admin alerts
    builder
      .addCase(fetchAdminAlerts.pending, (state) => {
        state.alertsLoading = true;
      })
      .addCase(fetchAdminAlerts.fulfilled, (state, action) => {
        state.alertsLoading = false;
        state.alerts = action.payload.alerts || [];
        state.alertUnreadCount = action.payload.unread_count || 0;
      })
      .addCase(fetchAdminAlerts.rejected, (state) => {
        state.alertsLoading = false;
      });

    builder.addCase(markAllAlertsRead.fulfilled, (state) => {
      state.alerts = state.alerts.map((a) => ({ ...a, is_read: true }));
      state.alertUnreadCount = 0;
    });

    builder.addCase(fetchAlertStats.fulfilled, (state, action) => {
      state.alertStats = action.payload;
    });
  },
});

export const {
  addNotification,
  addAdminAlert,
  addLiveActivity,
  setUnreadCount,
  setAlertUnreadCount,
  setWsConnected,
  clearNotifications,
  clearAlerts,
} = notificationSlice.actions;

export default notificationSlice.reducer;
