import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchNews = createAsyncThunk(
  "news/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.get("/news/", { params });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || "Failed to fetch news");
    }
  }
);

export const fetchNewsItem = createAsyncThunk(
  "news/fetchOne",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/news/${id}`);
      return response.data.data || response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || "Failed to fetch article");
    }
  }
);

export const fetchSavedNews = createAsyncThunk(
  "news/fetchSaved",
  async (saveType = "", { rejectWithValue }) => {
    try {
      const params = saveType ? { save_type: saveType } : {};
      const response = await api.get("/news/saved/", { params });
      return response.data.results || response.data;
    } catch (error) {
      return rejectWithValue("Failed to fetch saved articles");
    }
  }
);

const newsSlice = createSlice({
  name: "news",
  initialState: {
    items:       [],
    currentItem: null,
    savedItems:  [],
    totalCount:  0,
    loading:     false,
    error:       null,
  },
  reducers: {
    clearError:  (state) => { state.error = null; },
    updateSaveStatus: (state, action) => {
      const { id, is_saved, save_type } = action.payload;
      const item = state.items.find((i) => i.id === id);
      if (item) { item.is_saved = is_saved; item.save_type = save_type; }
      if (state.currentItem?.id === id) {
        state.currentItem.is_saved = is_saved;
        state.currentItem.save_type = save_type;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNews.pending,    (state) => { state.loading = true; state.error = null; })
      .addCase(fetchNews.fulfilled,  (state, action) => {
        state.loading    = false;
        state.items      = action.payload.results || action.payload;
        state.totalCount = action.payload.count || 0;
      })
      .addCase(fetchNews.rejected,   (state, action) => { state.loading = false; state.error = action.payload; });

    builder
      .addCase(fetchNewsItem.pending,   (state) => { state.loading = true; })
      .addCase(fetchNewsItem.fulfilled, (state, action) => { state.loading = false; state.currentItem = action.payload; })
      .addCase(fetchNewsItem.rejected,  (state, action) => { state.loading = false; state.error = action.payload; });

    builder
      .addCase(fetchSavedNews.fulfilled, (state, action) => { state.savedItems = action.payload; });
  },
});

export const { clearError, updateSaveStatus } = newsSlice.actions;
export default newsSlice.reducer;
