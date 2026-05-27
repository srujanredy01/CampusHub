/**
 * Redux slice for Saved Content with real-time WebSocket integration.
 * Manages saved items state, counts, and optimistic updates.
 */
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// ── Async Thunks ─────────────────────────────────────────────────────────────

export const fetchSavedItems = createAsyncThunk(
  "saved/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/saved/list", { params });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || "Failed to fetch saved items");
    }
  }
);

export const fetchSavedByType = createAsyncThunk(
  "saved/fetchByType",
  async ({ type, params = {} }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/saved/${type}`, { params });
      return { type, data: response.data.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || "Failed to fetch saved items");
    }
  }
);

export const fetchSavedCounts = createAsyncThunk(
  "saved/fetchCounts",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/saved/counts");
      return response.data.data;
    } catch (error) {
      return rejectWithValue("Failed to fetch counts");
    }
  }
);

export const saveItem = createAsyncThunk(
  "saved/saveItem",
  async ({ content_type, object_id }, { rejectWithValue }) => {
    try {
      const response = await api.post("/saved/", { content_type, object_id });
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || "Failed to save item");
    }
  }
);

export const unsaveItem = createAsyncThunk(
  "saved/unsaveItem",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/saved/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || "Failed to unsave item");
    }
  }
);

export const unsaveByObject = createAsyncThunk(
  "saved/unsaveByObject",
  async ({ content_type, object_id }, { rejectWithValue }) => {
    try {
      await api.post("/saved/unsave", { content_type, object_id });
      return { content_type, object_id };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || "Failed to unsave item");
    }
  }
);

export const checkSavedStatus = createAsyncThunk(
  "saved/checkStatus",
  async ({ content_type, object_id }, { rejectWithValue }) => {
    try {
      const response = await api.get("/saved/check", {
        params: { content_type, object_id },
      });
      return { content_type, object_id, ...response.data.data };
    } catch (error) {
      return rejectWithValue("Failed to check saved status");
    }
  }
);

// ── Slice ────────────────────────────────────────────────────────────────────

const savedSlice = createSlice({
  name: "saved",
  initialState: {
    items: [],
    counts: {
      coding_problem: 0,
      news_article: 0,
      resource: 0,
      assignment: 0,
      contest: 0,
      roadmap: 0,
      total: 0,
    },
    loading: false,
    error: null,
    // Track saved status for individual items (used in other modules)
    savedStatus: {}, // { "content_type:object_id": { is_saved, saved_item_id } }
    // WebSocket connection status
    wsConnected: false,
  },
  reducers: {
    // ── WebSocket-driven reducers ────────────────────────────────────────

    /** Called when WebSocket confirms an item was saved (from any tab/device) */
    wsItemAdded: (state, action) => {
      const { item, counts } = action.payload;
      // Avoid duplicates
      const exists = state.items.find((i) => i.id === item.id);
      if (!exists) {
        state.items.unshift(item);
      }
      if (counts) {
        state.counts = counts;
      }
      // Update saved status cache
      const key = `${item.content_type}:${item.object_id}`;
      state.savedStatus[key] = { is_saved: true, saved_item_id: item.id };
    },

    /** Called when WebSocket confirms an item was removed (from any tab/device) */
    wsItemRemoved: (state, action) => {
      const { item_id, content_type, object_id, counts } = action.payload;
      state.items = state.items.filter((i) => i.id !== item_id);
      if (counts) {
        state.counts = counts;
      }
      // Update saved status cache
      const key = `${content_type}:${object_id}`;
      state.savedStatus[key] = { is_saved: false, saved_item_id: null };
    },

    /** Called when WebSocket sends updated counts */
    wsCountsUpdated: (state, action) => {
      state.counts = action.payload.counts;
    },

    /** WebSocket connection status */
    setSavedWsConnected: (state, action) => {
      state.wsConnected = action.payload;
    },

    /** Clear all saved state (on logout) */
    clearSaved: (state) => {
      state.items = [];
      state.counts = {
        coding_problem: 0,
        news_article: 0,
        resource: 0,
        assignment: 0,
        contest: 0,
        roadmap: 0,
        total: 0,
      };
      state.savedStatus = {};
      state.wsConnected = false;
    },

    /** Optimistic save — add item before API confirms */
    optimisticSave: (state, action) => {
      const { content_type, object_id } = action.payload;
      const key = `${content_type}:${object_id}`;
      state.savedStatus[key] = { is_saved: true, saved_item_id: "pending" };
      state.counts[content_type] = (state.counts[content_type] || 0) + 1;
      state.counts.total = (state.counts.total || 0) + 1;
    },

    /** Optimistic unsave — remove item before API confirms */
    optimisticUnsave: (state, action) => {
      const { content_type, object_id, item_id } = action.payload;
      const key = `${content_type}:${object_id}`;
      state.savedStatus[key] = { is_saved: false, saved_item_id: null };
      if (item_id) {
        state.items = state.items.filter((i) => i.id !== item_id);
      }
      state.counts[content_type] = Math.max((state.counts[content_type] || 0) - 1, 0);
      state.counts.total = Math.max((state.counts.total || 0) - 1, 0);
    },

    /** Revert optimistic save on API failure */
    revertOptimisticSave: (state, action) => {
      const { content_type, object_id } = action.payload;
      const key = `${content_type}:${object_id}`;
      state.savedStatus[key] = { is_saved: false, saved_item_id: null };
      state.counts[content_type] = Math.max((state.counts[content_type] || 0) - 1, 0);
      state.counts.total = Math.max((state.counts.total || 0) - 1, 0);
    },
  },
  extraReducers: (builder) => {
    // fetchSavedItems
    builder
      .addCase(fetchSavedItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSavedItems.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload || [];
        // Update savedStatus cache from fetched items
        (action.payload || []).forEach((item) => {
          const key = `${item.content_type}:${item.object_id}`;
          state.savedStatus[key] = { is_saved: true, saved_item_id: item.id };
        });
      })
      .addCase(fetchSavedItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // fetchSavedByType
    builder
      .addCase(fetchSavedByType.fulfilled, (state, action) => {
        const { data } = action.payload;
        // Merge into items (replace items of this type)
        const items = data || [];
        items.forEach((item) => {
          const key = `${item.content_type}:${item.object_id}`;
          state.savedStatus[key] = { is_saved: true, saved_item_id: item.id };
        });
      });

    // fetchSavedCounts
    builder.addCase(fetchSavedCounts.fulfilled, (state, action) => {
      state.counts = action.payload;
    });

    // saveItem
    builder
      .addCase(saveItem.fulfilled, (state, action) => {
        const item = action.payload;
        if (item) {
          const exists = state.items.find((i) => i.id === item.id);
          if (!exists) {
            state.items.unshift(item);
          }
          const key = `${item.content_type}:${item.object_id}`;
          state.savedStatus[key] = { is_saved: true, saved_item_id: item.id };
        }
      })
      .addCase(saveItem.rejected, (state, action) => {
        // Revert handled by component via revertOptimisticSave
        state.error = action.payload;
      });

    // unsaveItem
    builder.addCase(unsaveItem.fulfilled, (state, action) => {
      const id = action.payload;
      const item = state.items.find((i) => i.id === id);
      if (item) {
        const key = `${item.content_type}:${item.object_id}`;
        state.savedStatus[key] = { is_saved: false, saved_item_id: null };
      }
      state.items = state.items.filter((i) => i.id !== id);
    });

    // unsaveByObject
    builder.addCase(unsaveByObject.fulfilled, (state, action) => {
      const { content_type, object_id } = action.payload;
      const key = `${content_type}:${object_id}`;
      state.savedStatus[key] = { is_saved: false, saved_item_id: null };
      state.items = state.items.filter(
        (i) => !(i.content_type === content_type && i.object_id === object_id)
      );
    });

    // checkSavedStatus
    builder.addCase(checkSavedStatus.fulfilled, (state, action) => {
      const { content_type, object_id, is_saved, saved_item_id } = action.payload;
      const key = `${content_type}:${object_id}`;
      state.savedStatus[key] = { is_saved, saved_item_id };
    });
  },
});

export const {
  wsItemAdded,
  wsItemRemoved,
  wsCountsUpdated,
  setSavedWsConnected,
  clearSaved,
  optimisticSave,
  optimisticUnsave,
  revertOptimisticSave,
} = savedSlice.actions;

export default savedSlice.reducer;
