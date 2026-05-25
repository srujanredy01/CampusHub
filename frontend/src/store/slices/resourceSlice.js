import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { resourceService } from "../../services/resourceService";

export const fetchResources = createAsyncThunk(
  "resources/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const response = await resourceService.getAll(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to fetch resources"
      );
    }
  }
);

export const fetchResourceCounts = createAsyncThunk(
  "resources/fetchCounts",
  async (branch = "", { rejectWithValue }) => {
    try {
      const response = await resourceService.getCounts(branch);
      return response.data.data;
    } catch (error) {
      return rejectWithValue("Failed to fetch counts");
    }
  }
);

export const fetchResource = createAsyncThunk(
  "resources/fetchOne",
  async (id, { rejectWithValue }) => {
    try {
      const response = await resourceService.getById(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error?.message || "Failed to fetch resource"
      );
    }
  }
);

const resourceSlice = createSlice({
  name: "resources",
  initialState: {
    items: [],
    currentResource: null,
    totalCount: 0,
    counts: { years: {}, semesters: {}, file_types: {} },
    loading: false,
    countsLoading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchResources.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchResources.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.results || action.payload;
        state.totalCount = action.payload.count || 0;
      })
      .addCase(fetchResources.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(fetchResourceCounts.pending, (state) => { state.countsLoading = true; })
      .addCase(fetchResourceCounts.fulfilled, (state, action) => {
        state.countsLoading = false;
        state.counts = action.payload;
      })
      .addCase(fetchResourceCounts.rejected, (state) => { state.countsLoading = false; });

    builder
      .addCase(fetchResource.pending, (state) => { state.loading = true; })
      .addCase(fetchResource.fulfilled, (state, action) => {
        state.loading = false;
        state.currentResource = action.payload;
      })
      .addCase(fetchResource.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError } = resourceSlice.actions;
export default resourceSlice.reducer;
