import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import profileReducer from "./slices/profileSlice";
import resourceReducer from "./slices/resourceSlice";
import newsReducer from "./slices/newsSlice";
import codingReducer from "./slices/codingSlice";
import notificationReducer from "./slices/notificationSlice";
import savedReducer from "./slices/savedSlice";
import rbacReducer from "./slices/rbacSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    rbac: rbacReducer,
    profile: profileReducer,
    resources: resourceReducer,
    news: newsReducer,
    coding: codingReducer,
    notifications: notificationReducer,
    saved: savedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["auth/login/fulfilled"],
      },
    }),
});
