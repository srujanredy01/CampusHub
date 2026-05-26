import api from "./api";

export const searchService = {
  search: (q, category = "all") => api.get("/search/", { params: { q, category } }),
};
