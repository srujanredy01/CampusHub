import api from "./api";

export const authService = {
  signup: (data) => api.post("/auth/signup", data),
  login: (student_id, password) => api.post("/auth/login", { student_id, password }),
  logout: (refreshToken) => api.post("/auth/logout", { refresh: refreshToken }),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${token}`),
  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token, password, password_confirm) =>
    api.post("/auth/reset-password", { token, password, password_confirm }),
  changePassword: (old_password, new_password, new_password_confirm) =>
    api.post("/auth/change-password", { old_password, new_password, new_password_confirm }),
  resendVerification: (email) => api.post("/auth/resend-verification", { email }),
  getCurrentUser: () => api.get("/auth/me"),
  refreshToken: (refresh) => api.post("/auth/token/refresh", { refresh }),
};
