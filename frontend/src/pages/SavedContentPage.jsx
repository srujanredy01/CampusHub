import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-toastify";

export default function SavedContentPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = filter !== "all" ? { type: filter } : {};
        const res = await api.get("/saved/", { params });
        setItems(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [filter]);

  const handleRemove = async (id) => {
    try {
      await api.delete(`/saved/${id}/`);
      setItems(items.filter((i) => i.id !== id));
      toast.success("Removed from saved");
    } catch { toast.error("Failed to remove"); }
  };

  const typeIcon = (type) => {
    const icons = {
      resource: "📚", question: "💻", news: "📰", note: "📝", event: "🎉",
    };
    return icons[type] || "📌";
  };

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title">Saved Content</h1>
        <p className="page-subtitle">Your bookmarked items across CampusHub</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {["all", "resource", "question", "news", "note", "event"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={filter === f ? "filter-pill-active" : "filter-pill-inactive"}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </div>
          <p className="empty-state-title">Nothing saved yet</p>
          <p className="empty-state-desc">Bookmark resources, problems, and articles to find them here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="card-padded flex items-center gap-3">
              <span className="text-lg">{typeIcon(item.content_type || item.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-800 truncate">{item.title || item.content_title}</p>
                <p className="text-xs text-surface-400">{item.content_type || item.type}</p>
              </div>
              <button onClick={() => handleRemove(item.id)} className="btn-icon p-1.5 text-surface-300 hover:text-danger-500" title="Remove">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
