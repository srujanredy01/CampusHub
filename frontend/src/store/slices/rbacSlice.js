/**
 * RBAC Redux Slice — manages dynamic permissions, sidebar, widgets, and modules.
 * This is the core of the dynamic dashboard system.
 *
 * The frontend NEVER hardcodes role checks. Instead, it checks permissions
 * from this slice, which are populated from the backend API.
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { rbacService } from "../../services/rbacService";

// ── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchDashboardConfig = createAsyncThunk(
  "rbac/fetchDashboardConfig",
  async (_, { rejectWithValue }) => {
    try {
      const response = await rbacService.getDashboardConfig();
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to fetch dashboard config"
      );
    }
  }
);

export const refreshPermissions = createAsyncThunk(
  "rbac/refreshPermissions",
  async (_, { rejectWithValue }) => {
    try {
      const response = await rbacService.getPermissions();
      return response.data.data;
    } catch (error) {
      return rejectWithValue("Failed to refresh permissions");
    }
  }
);

// ── Slice ────────────────────────────────────────────────────────────────────

const rbacSlice = createSlice({
  name: "rbac",
  initialState: {
    // Current user's role
    role: null,
    // Array of permission codenames the user has
    permissions: [],
    // Array of module IDs the user can access
    modules: [],
    // Sidebar navigation items (filtered by permissions)
    sidebar: [],
    // Dashboard widgets for the user's role
    widgets: [],
    // User's access scope (section/department restrictions)
    scope: null,
    // Loading state
    loading: false,
    initialized: false,
    error: null,
    // Role change notification
    roleChangeNotification: null,
  },
  reducers: {
    /**
     * Called when WebSocket receives a role_changed event.
     * Stores the notification and triggers a config refresh.
     */
    setRoleChangeNotification: (state, action) => {
      state.roleChangeNotification = action.payload;
    },
    clearRoleChangeNotification: (state) => {
      state.roleChangeNotification = null;
    },
    /**
     * Reset RBAC state on logout.
     */
    resetRbac: (state) => {
      state.role = null;
      state.permissions = [];
      state.modules = [];
      state.sidebar = [];
      state.widgets = [];
      state.scope = null;
      state.initialized = false;
      state.error = null;
      state.roleChangeNotification = null;
    },
    /**
     * Directly update config from WebSocket event (optimistic).
     */
    updateFromWebSocket: (state, action) => {
      const { role, permissions } = action.payload;
      if (role) state.role = role;
      if (permissions) state.permissions = permissions;
    },
  },
  extraReducers: (builder) => {
    // fetchDashboardConfig
    builder
      .addCase(fetchDashboardConfig.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardConfig.fulfilled, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.role = action.payload.role;
        state.permissions = action.payload.permissions;
        state.modules = action.payload.modules;
        state.sidebar = action.payload.sidebar;
        state.widgets = action.payload.widgets;
        state.scope = action.payload.scope;
      })
      .addCase(fetchDashboardConfig.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // refreshPermissions (lightweight)
    builder
      .addCase(refreshPermissions.fulfilled, (state, action) => {
        state.role = action.payload.role;
        state.permissions = action.payload.permissions;
      });
  },
});

export const {
  setRoleChangeNotification,
  clearRoleChangeNotification,
  resetRbac,
  updateFromWebSocket,
} = rbacSlice.actions;

export default rbacSlice.reducer;

// ── Selectors ────────────────────────────────────────────────────────────────

/**
 * Check if user has a specific permission.
 * Usage: const canManage = useSelector(selectHasPermission("manage_users"));
 */
export const selectHasPermission = (permission) => (state) =>
  state.rbac.permissions.includes(permission);

/**
 * Check if user has ANY of the given permissions.
 */
export const selectHasAnyPermission = (permissions) => (state) =>
  permissions.some((p) => state.rbac.permissions.includes(p));

/**
 * Check if user has ALL of the given permissions.
 */
export const selectHasAllPermissions = (permissions) => (state) =>
  permissions.every((p) => state.rbac.permissions.includes(p));

/**
 * Check if a module is accessible.
 */
export const selectCanAccessModule = (moduleId) => (state) =>
  state.rbac.modules.includes(moduleId);
