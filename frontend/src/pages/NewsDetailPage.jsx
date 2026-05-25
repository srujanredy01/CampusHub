import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchNewsItem, updateSaveStatus } from "../store/slices/newsSlice";
import { newsService } from "../services/newsService";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/common/LoadingSpinner";

const CAT_COLORS = {
  placement:     "bg-green-100 text-green-700",
  internship:    "bg-blue-100 text-blue-700",
  event:         "bg-purple-100 text-purple-700",
  academics:     "bg-yellow-100 text-yellow-700",
  campus_update: "bg-orange-100 text-orange-700",
  general:       "bg-gray-100 text-gray-600",
};

const CAT_ICONS = {
  placement: "💼", internship: "🏢", event: "🎉",
  academics: "📖", campus_update: "🏫", general: "📢",
};

const PRIORITY_COLORS = {
  urgent: "bg-red-100 text-red-700",
  high:   "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low:    "bg-gray-100 text-gray-600",
};

export default function NewsDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentItem: n, loading } = useSelector((s) => s.news);
  const [saving, setSaving] = useState(false);

  useEffect(() => { dispatch(fetchNewsItem(id)); }, [id, dispatch]);

  const handleSave = async (saveType) => {
    if (!n) return;
    setSaving(true);
    try {
      if (n.is_saved && n.save_type === saveType) {
        await newsService.unsave(n.id);
        dispatch(updateSaveStatus({ id: n.id, is_saved: false, save_type: null }));
        toast.success("Removed from saved.");
      } else {
        await newsService.save(n.id, saveType);
        dispatch(updateSaveStatus({ id: n.id, is_saved: true, save_type: saveType }));
        toast.success(saveType === "saved" ? "Article saved." : "Saved for later.");
      }
    } catch {
      toast.error("Could not save article.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;
  if (!n) return (
    <div className="text-center py-20 text-gray-400">
      <p className="text-4xl mb-2">📰</p>
      <p>Article not found</p>
    </div>
  );

  const catColor  = CAT_COLORS[n.category]  || CAT_COLORS.general;
  const catIcon   = CAT_ICONS[n.category]   || "📢";
  const priColor  = PRIORITY_COLORS[n.priority] || PRIORITY_COLORS.low;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <button onClick={() => navigate(-1)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← Back to News & Updates
      </button>

      <article className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {/* Featured image */}
        {n.featured_image_url && (
          <div className="h-56 bg-gray-100 overflow-hidden">
            <img src={n.featured_image_url} alt={n.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-6 space-y-4">
          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${catColor}`}>
              {catIcon} {n.category?.replace("_", " ")}
            </span>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${priColor} capitalize`}>
              {n.priority}
            </span>
            {n.is_pinned && (
              <span className="text-xs bg-primary-100 text-primary-700 px-2.5 py-1 rounded-full">📌 Pinned</span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 leading-tight">{n.title}</h1>

          {/* Short description */}
          {n.short_description && (
            <p className="text-base text-gray-600 leading-relaxed font-medium">{n.short_description}</p>
          )}

          {/* Author + date */}
          <div className="flex items-center gap-3 text-sm text-gray-400 pb-4 border-b border-gray-100">
            <span>By {n.created_by_name || "Admin"}</span>
            <span>·</span>
            <span>{new Date(n.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</span>
            <span>·</span>
            <span>👁 {n.view_count} views</span>
          </div>

          {/* Full content */}
          <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
            {n.content}
          </div>

          {/* Tags */}
          {n.tags_list?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {n.tags_list.map((t) => (
                <span key={t} className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
                  #{t}
                </span>
              ))}
            </div>
          )}

          {/* External link */}
          {n.external_link && (
            <div className="pt-2">
              <a href={n.external_link} target="_blank" rel="noreferrer"
                className="text-primary-600 hover:underline text-sm flex items-center gap-1">
                🔗 {n.external_link}
              </a>
            </div>
          )}

          {/* Attachment */}
          {n.attachment_url && (
            <div className="pt-2">
              <a href={n.attachment_url} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                📎 Download Attachment
              </a>
            </div>
          )}

          {/* Save actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={() => handleSave("saved")}
              disabled={saving}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                n.is_saved && n.save_type === "saved"
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              {n.is_saved && n.save_type === "saved" ? "✓ Saved" : "Save"}
            </button>
            <button
              onClick={() => handleSave("saved_for_later")}
              disabled={saving}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                n.is_saved && n.save_type === "saved_for_later"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              {n.is_saved && n.save_type === "saved_for_later" ? "✓ Saved for Later" : "Save for Later"}
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
