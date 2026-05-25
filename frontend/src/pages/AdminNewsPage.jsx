import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchNews } from "../store/slices/newsSlice";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/common/LoadingSpinner";
import api from "../services/api";

const CATEGORIES = [
  { value: "placement",     label: "Placements" },
  { value: "internship",    label: "Internships" },
  { value: "event",         label: "Events" },
  { value: "academics",     label: "Academics" },
  { value: "campus_update", label: "Campus Updates" },
  { value: "general",       label: "General" },
];

const PRIORITIES = ["low", "medium", "high", "urgent"];

const CAT_COLORS = {
  placement: "bg-green-100 text-green-700", internship: "bg-blue-100 text-blue-700",
  event: "bg-purple-100 text-purple-700",   academics: "bg-yellow-100 text-yellow-700",
  campus_update: "bg-orange-100 text-orange-700", general: "bg-gray-100 text-gray-600",
};

const EMPTY_FORM = {
  title: "", short_description: "", content: "", category: "general",
  priority: "medium", tags: "", external_link: "",
  is_active: true, is_pinned: false,
  featured_image: null, attachment: null,
};

// ── Article Modal ─────────────────────────────────────────────────────────────
function ArticleModal({ article, onClose, onSaved }) {
  const isEdit = !!article;
  const [form, setForm] = useState(
    isEdit
      ? {
          title: article.title || "",
          short_description: article.short_description || "",
          content: article.content || "",
          category: article.category || "general",
          priority: article.priority || "medium",
          tags: article.tags || "",
          external_link: article.external_link || "",
          is_active: article.is_active ?? true,
          is_pinned: article.is_pinned ?? false,
          featured_image: null,
          attachment: null,
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if ((k === "featured_image" || k === "attachment") && v) fd.append(k, v);
        else if (k !== "featured_image" && k !== "attachment") fd.append(k, v);
      });

      if (isEdit) {
        await api.put(`/admin/news/${article.id}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Article updated.");
      } else {
        await api.post("/admin/news/create", fd, { headers: { "Content-Type": "multipart/form-data" } });
        toast.success("Article created.");
      }
      onSaved();
      onClose();
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) Object.values(errors).flat().forEach((m) => toast.error(m));
      else toast.error(err.response?.data?.error?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Edit Article" : "Create Article"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input className="input-field" value={form.title} onChange={(e) => set("title", e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Short Description</label>
            <input className="input-field" placeholder="Brief summary shown on card..." value={form.short_description} onChange={(e) => set("short_description", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Content *</label>
            <textarea className="input-field resize-none" rows={6} value={form.content} onChange={(e) => set("content", e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select className="input-field" value={form.category} onChange={(e) => set("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select className="input-field" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <input className="input-field" placeholder="placement, tech, fest" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">External Link</label>
            <input type="url" className="input-field" placeholder="https://..." value={form.external_link} onChange={(e) => set("external_link", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Featured Image</label>
            <input type="file" className="input-field" accept="image/*" onChange={(e) => set("featured_image", e.target.files[0] || null)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attachment</label>
            <input type="file" className="input-field" onChange={(e) => set("attachment", e.target.files[0] || null)} />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} className="w-4 h-4 accent-primary-600" />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.is_pinned} onChange={(e) => set("is_pinned", e.target.checked)} className="w-4 h-4 accent-primary-600" />
              Pinned
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50">
              {saving ? "Saving…" : isEdit ? "Update Article" : "Create Article"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Admin News Page ──────────────────────────────────────────────────────
export default function AdminNewsPage() {
  const dispatch = useDispatch();
  const { items, loading, totalCount } = useSelector((s) => s.news);

  const [search,      setSearch]      = useState("");
  const [filterCat,   setFilterCat]   = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [modal,       setModal]       = useState(null);
  const [stats,       setStats]       = useState(null);

  const load = () => {
    const params = {};
    if (search)       params.search   = search;
    if (filterCat)    params.category = filterCat;
    if (filterActive !== "") params.is_active = filterActive;
    dispatch(fetchNews(params));
  };

  useEffect(() => { load(); }, [search, filterCat, filterActive]);

  useEffect(() => {
    api.get("/admin/news/stats").then((r) => setStats(r.data.data)).catch(() => {});
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await api.delete(`/admin/news/${id}`);
      toast.success("Article deleted.");
      load();
    } catch { toast.error("Delete failed."); }
  };

  const handlePin = async (id) => {
    try {
      await api.post(`/admin/news/${id}/pin`);
      toast.success("Pin status updated.");
      load();
    } catch { toast.error("Failed."); }
  };

  const handleToggleActive = async (id, current) => {
    try {
      await api.put(`/admin/news/${id}`, { is_active: !current }, { headers: { "Content-Type": "application/json" } });
      toast.success(current ? "Article unpublished." : "Article published.");
      load();
    } catch { toast.error("Failed."); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">News Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and manage campus news articles</p>
        </div>
        <button onClick={() => setModal("create")} className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-xl transition-colors">
          + Create Article
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Articles", value: stats.total,        icon: "📰", color: "blue" },
            { label: "Published",      value: stats.active,       icon: "✅", color: "green" },
            { label: "This Week",      value: stats.weekly,       icon: "📅", color: "purple" },
            { label: "Total Saves",    value: stats.total_saves,  icon: "🔖", color: "yellow" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-${s.color}-100 flex items-center justify-center text-xl`}>{s.icon}</div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="text" className="input-field" placeholder="Search articles..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="input-field" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select className="input-field" value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
            <option value="">All Status</option>
            <option value="true">Published</option>
            <option value="false">Unpublished</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <p className="text-4xl mb-3">📰</p>
          <p className="font-semibold text-gray-700">No articles found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Article</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Category</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Reads</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Pinned</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 max-w-[280px] truncate">{a.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(a.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CAT_COLORS[a.category] || "bg-gray-100 text-gray-600"}`}>
                        {a.category?.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">{a.read_count || a.view_count}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(a.id, a.is_active)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                          a.is_active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {a.is_active ? "Published" : "Draft"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handlePin(a.id)} className={`text-lg ${a.is_pinned ? "opacity-100" : "opacity-30 hover:opacity-60"}`} title="Toggle pin">
                        📌
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setModal(a)} className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg transition-colors">Edit</button>
                        <button onClick={() => handleDelete(a.id, a.title)} className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1 rounded-lg transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {items.length} of {totalCount || items.length} articles
          </div>
        </div>
      )}

      {modal && (
        <ArticleModal
          article={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
