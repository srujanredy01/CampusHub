import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchNews, updateSaveStatus } from "../store/slices/newsSlice";
import { newsService } from "../services/newsService";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/common/LoadingSpinner";

// ── Constants ─────────────────────────────────────────────────────────────────
const DATE_FILTERS = [
  { value: "",      label: "All" },
  { value: "week",  label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year",  label: "This Year" },
];

const CAT_COLORS = {
  placement:     "bg-green-100 text-green-700",
  internship:    "bg-blue-100 text-blue-700",
  event:         "bg-purple-100 text-purple-700",
  academics:     "bg-yellow-100 text-yellow-700",
  campus_update: "bg-orange-100 text-orange-700",
  general:       "bg-gray-100 text-gray-600",
};

const CAT_ICONS = {
  placement:     "💼",
  internship:    "🏢",
  event:         "🎉",
  academics:     "📖",
  campus_update: "🏫",
  general:       "📢",
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  if (days < 7)   return `${days} day${days !== 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// ── News Card ─────────────────────────────────────────────────────────────────
function NewsCard({ article, onSave }) {
  const catColor = CAT_COLORS[article.category] || CAT_COLORS.general;
  const catIcon  = CAT_ICONS[article.category]  || "📢";
  const [saving, setSaving] = useState(false);

  const handleSave = async (saveType) => {
    setSaving(true);
    try {
      if (article.is_saved && article.save_type === saveType) {
        await newsService.unsave(article.id);
        onSave(article.id, false, null);
        toast.success("Removed from saved.");
      } else {
        await newsService.save(article.id, saveType);
        onSave(article.id, true, saveType);
        toast.success(saveType === "saved" ? "Article saved." : "Saved for later.");
      }
    } catch {
      toast.error("Could not save article.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-all duration-200 ${article.is_pinned ? "border-l-4 border-l-primary-500" : ""}`}>
      {/* Top row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${catColor}`}>
            {catIcon} {article.category?.replace("_", " ")}
          </span>
          {article.is_pinned && (
            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">📌 Pinned</span>
          )}
        </div>
        <span className="text-xs text-gray-400">{timeAgo(article.created_at)}</span>
      </div>

      {/* Featured image */}
      {article.featured_image_url && (
        <div className="mb-3 rounded-xl overflow-hidden h-40 bg-gray-100">
          <img src={article.featured_image_url} alt={article.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Title */}
      <h3 className="font-bold text-gray-900 text-base leading-snug mb-2 line-clamp-2">
        {article.title}
      </h3>

      {/* Short description */}
      {article.short_description && (
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-3">
          {article.short_description}
        </p>
      )}

      {/* Tags */}
      {article.tags_list?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {article.tags_list.slice(0, 3).map((t) => (
            <span key={t} className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded">
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>👁 {article.view_count}</span>
          <span>By {article.created_by_name || "Admin"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/news/${article.id}`}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            Read More →
          </Link>
          <button
            onClick={() => handleSave("saved")}
            disabled={saving}
            title="Save"
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
              article.is_saved && article.save_type === "saved"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
            }`}
          >
            {article.is_saved && article.save_type === "saved" ? "✓ Saved" : "Save"}
          </button>
          <button
            onClick={() => handleSave("saved_for_later")}
            disabled={saving}
            title="Save for Later"
            className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
              article.is_saved && article.save_type === "saved_for_later"
                ? "bg-yellow-500 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
            }`}
          >
            {article.is_saved && article.save_type === "saved_for_later" ? "✓ Later" : "Save for Later"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NewsPage() {
  const dispatch = useDispatch();
  const { items, loading, totalCount } = useSelector((s) => s.news);

  const [search,     setSearch]     = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page,       setPage]       = useState(1);

  const load = useCallback(() => {
    const params = { page };
    if (search)     params.search = search;
    if (dateFilter) params.filter = dateFilter;
    dispatch(fetchNews(params));
  }, [dispatch, search, dateFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, dateFilter]);

  const handleSaveUpdate = (id, is_saved, save_type) => {
    dispatch(updateSaveStatus({ id, is_saved, save_type }));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">News & Updates</h1>
        <p className="text-sm text-gray-500 mt-0.5">Stay up to date with campus announcements</p>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
        <input
          type="text"
          className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          placeholder="Search articles by keyword..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
        )}
      </div>

      {/* Date filter tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {DATE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setDateFilter(f.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              dateFilter === f.value
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-sm text-gray-500">
          {totalCount > 0 ? `${totalCount} article${totalCount !== 1 ? "s" : ""}` : `${items.length} article${items.length !== 1 ? "s" : ""}`}
          {search && ` matching "${search}"`}
        </p>
      )}

      {/* Articles */}
      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <p className="text-5xl mb-4">📰</p>
          <h3 className="text-lg font-semibold text-gray-700">No News Found</h3>
          <p className="text-sm text-gray-400 mt-1">No articles match your search.</p>
          {(search || dateFilter) && (
            <button
              onClick={() => { setSearch(""); setDateFilter(""); }}
              className="mt-4 text-sm text-primary-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((article) => (
            <NewsCard
              key={article.id}
              article={article}
              onSave={handleSaveUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
