import api from "./api";

export const leaderboardService = {
  getLeaderboard: (params) => api.get("/leaderboard/", { params }),
  getMyXP: () => api.get("/leaderboard/me"),
  getBadges: () => api.get("/leaderboard/badges"),
  getHistory: () => api.get("/leaderboard/history"),
};
