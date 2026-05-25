import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { codingService } from "../../services/codingService";

export const fetchQuestions = createAsyncThunk(
  "coding/fetchQuestions",
  async (params, { rejectWithValue }) => {
    try {
      const response = await codingService.getQuestions(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || "Failed to fetch questions");
    }
  }
);

export const fetchQuestion = createAsyncThunk(
  "coding/fetchQuestion",
  async (id, { rejectWithValue }) => {
    try {
      const response = await codingService.getQuestion(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || "Failed to fetch question");
    }
  }
);

export const runCode = createAsyncThunk(
  "coding/runCode",
  async ({ language, code, stdin }, { rejectWithValue }) => {
    try {
      const response = await codingService.runCode(language, code, stdin);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || "Execution failed");
    }
  }
);

export const submitCode = createAsyncThunk(
  "coding/submitCode",
  async ({ question_id, language, code }, { rejectWithValue }) => {
    try {
      const response = await codingService.submitCode(question_id, language, code);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || "Submission failed");
    }
  }
);

export const saveQuestion = createAsyncThunk(
  "coding/saveQuestion",
  async (question_id, { rejectWithValue }) => {
    try {
      await codingService.saveQuestion(question_id);
      return question_id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || "Failed to save question");
    }
  }
);

const codingSlice = createSlice({
  name: "coding",
  initialState: {
    questions: [],
    currentQuestion: null,
    totalCount: 0,
    runResult: null,
    submitResult: null,
    loading: false,
    runLoading: false,
    submitLoading: false,
    error: null,
    filters: {
      topic: "",
      difficulty: "",
      search: "",
    },
  },
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearRunResult: (state) => {
      state.runResult = null;
    },
    clearSubmitResult: (state) => {
      state.submitResult = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuestions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchQuestions.fulfilled, (state, action) => {
        state.loading = false;
        state.questions = action.payload.results || action.payload;
        state.totalCount = action.payload.count || action.payload.length;
      })
      .addCase(fetchQuestions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(fetchQuestion.pending, (state) => {
        state.loading = true;
        state.currentQuestion = null;
      })
      .addCase(fetchQuestion.fulfilled, (state, action) => {
        state.loading = false;
        state.currentQuestion = action.payload;
      })
      .addCase(fetchQuestion.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    builder
      .addCase(runCode.pending, (state) => {
        state.runLoading = true;
        state.runResult = null;
      })
      .addCase(runCode.fulfilled, (state, action) => {
        state.runLoading = false;
        state.runResult = action.payload;
      })
      .addCase(runCode.rejected, (state, action) => {
        state.runLoading = false;
        state.error = action.payload;
      });

    builder
      .addCase(submitCode.pending, (state) => {
        state.submitLoading = true;
        state.submitResult = null;
      })
      .addCase(submitCode.fulfilled, (state, action) => {
        state.submitLoading = false;
        state.submitResult = action.payload;
      })
      .addCase(submitCode.rejected, (state, action) => {
        state.submitLoading = false;
        state.error = action.payload;
      });
  },
});

export const { setFilters, clearRunResult, clearSubmitResult, clearError } = codingSlice.actions;
export default codingSlice.reducer;
