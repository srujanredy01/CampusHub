import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authService } from "../../services/authService";

// Async thunks
export const login = createAsyncThunk(
  "auth/login",
  async ({ student_id, password }, { rejectWithValue }) => {
    try {
      const response = await authService.login(student_id, password);
      const { access, refresh, user } = response.data.data;
      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      return user;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Login failed"
      );
    }
  }
);

export const signup = createAsyncThunk(
  "auth/signup",
  async (userData, { rejectWithValue }) => {
    try {
      const response = await authService.signup(userData);
      return response.data;
    } catch (error) {
      const data = error.response?.data;
      // Handle throttle (429) and other structured error responses
      if (data?.error?.message) {
        return rejectWithValue(data.error.message);
      }
      if (data?.errors) {
        return rejectWithValue(data.errors);
      }
      return rejectWithValue("Signup failed. Please try again.");
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        await authService.logout(refresh);
      }
    } catch {
      // Ignore logout API errors — always clear local state
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("access_token");
    if (!token) return rejectWithValue("No token");
    try {
      const response = await authService.getCurrentUser();
      return response.data.data;
    } catch (error) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      return rejectWithValue("Session expired");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    isAuthenticated: false,
    isInitialized: false,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    forceLogout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      state.error = null;
    },
    /**
     * Update user data from external source (e.g., after role change).
     */
    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Signup
    builder
      .addCase(signup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signup.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(signup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Logout — clear all auth state so protected routes redirect immediately
    builder
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(logout.rejected, (state) => {
        // Even if the API call failed, clear local state
        state.loading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
        state.error = null;
      });

    // Fetch current user (app boot)
    builder
      .addCase(fetchCurrentUser.pending, (state) => {
        state.isInitialized = false;
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isInitialized = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
      });
  },
});

export const { clearError, setUser, forceLogout, updateUser } = authSlice.actions;
export default authSlice.reducer;
