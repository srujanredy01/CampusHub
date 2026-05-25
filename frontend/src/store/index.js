import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import profileReducer from "./slices/profileSlice";
import resourceReducer from "./slices/resourceSlice";
import newsReducer from "./slices/newsSlice";
import codingReducer from "./slices/codingSlice";
import notificationReducer from "./slices/notificationSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    profile: profileReducer,
    resources: resourceReducer,
    news: newsReducer,
    coding: codingReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["auth/login/fulfilled"],
      },
    }),
});
