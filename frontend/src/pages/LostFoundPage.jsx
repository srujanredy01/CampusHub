import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

const CATEGORIES = [
  { id: "id_card", label: "ID Card", icon: "🪪" },
  { id: "wallet", label: "Wallet", icon: "👛" },
  { id: "charger", label: "Charger", icon: "🔌" },
  { id: "book", label: "Book", icon: "📖" },
  { id: "calculator", label: "Calculator", icon: "🧮" },
  { id: "keys", label: "Keys", icon: "🔑" },
  { id: "electronics", label: "Electronics", icon: "📱" },
  { id: "clothing", label: "Clothing", icon: "👕" },
  { id: "bag", label: "Bag", icon: "🎒" },
  { id: "other", label: "Other", icon: "📦" },
];

const STATUS_STYLES = {
  lost: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Lost" },
  found: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Found" },
  claimed: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Claimed" },
  closed: { bg: "bg-surface-100", text: "text-surface-600", border: "border-surface-200", label: "Resolved" },
};

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

function ItemCard({ item, onClaim, onFlag }) {
  const style = STATUS_STYLES[item.status] || STATUS_STYLES.lost;
  const cat = CATEGORY_MAP[item.category] || { icon: "📦", label: item.category };

  return (
    <div className="card-padded hover:shadow-card-hover transition-all duration-200 group">
      {/* Image */}
      {item.image && (
        <div className="w-full h-36 rounded-xl bg-surface-100 overflow-hidden mb-3 -mt-1 -mx-1" style={{ width: "calc(100% + 8px)" }}>
          <img src={item.image} alt={item.item_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      )}

      {/* Status + Category */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold ${style.bg} ${style.text} border ${style.border}`}>
          {style.label}
        </span>
        <span className="text-xs text-surface-400 flex items-center gap-1">
          {cat.icon} {cat.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-surface-800 group-hover:text-primary-700 transition-colors">
        {item.item_name}
      </h3>

      {/* Description */}
      {item.description && (
        <p className="text-xs text-surface-500 mt-1 line-clamp-2">{item.description}</p>
      )}

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-surface-400">
        {item.location && (
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {item.location}
          </span>
        )}
        {item.date_lost_found && (
          <span className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            {new Date(item.date_lost_found).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {/* Contact */}
      {item.contact_name && (
        <p className="text-xs text-surface-500 mt-2">Contact: {item.contact_name}</p>
      )}

      {/* Actions */}
      {item.status === "found" && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-100">
          <button onClick={() => onClaim(item.id)}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors text-center">
            Claim This Item
          </button>
          <button onClick={() => onFlag(item.id)}
            className="p-1.5 text-surface-300 hover:text-warning-500 hover:bg-warning-50 rounded-lg transition-colors" title="Report">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}

function PostItemModal({ isOpen, onClose, onSubmit }) {
  const [form, setForm] = useState({
    item_name: "", category: "other", description: "", status: "lost",
    date_lost_found: new Date().toISOString().split("T")[0],
    location: "", contact_name: "", contact_phone: "", contact_email: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item_name || !form.location) {
      toast.error("Item name and location are required");
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => {
        if (val) formData.append(key, val);
      });
      if (imageFile) formData.append("image", imageFile);
      await onSubmit(formData);
      setForm({
        item_name: "", category: "other", description: "", status: "lost",
        date_lost_found: new Date().toISOString().split("T")[0],
        location: "", contact_name: "", contact_phone: "", contact_email: "",
      });
      setImageFile(null);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-surface-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-float w-full max-w-lg p-6 animate-fade-up max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Report Lost/Found Item</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-surface-600 mb-1 block">Item Name *</label>
              <input type="text" value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })}
                className="input-field" placeholder="e.g., Blue Wallet" />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Type</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
                <option value="lost">I Lost This</option>
                <option value="found">I Found This</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field min-h-[60px] resize-none" placeholder="Color, brand, distinguishing features..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Location *</label>
              <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="input-field" placeholder="Library, Canteen, etc." />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Date</label>
              <input type="date" value={form.date_lost_found} onChange={(e) => setForm({ ...form, date_lost_found: e.target.value })}
                className="input-field" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Image (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])}
              className="text-xs text-surface-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Your Name</label>
              <input type="text" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                className="input-field" placeholder="Your name" />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Phone</label>
              <input type="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                className="input-field" placeholder="Phone number" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-surface-600 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50">
              {submitting ? "Posting..." : "Post Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LostFoundPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showPostModal, setShowPostModal] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const params = {};
      if (tab !== "all") params.status = tab;
      if (search) params.search = search;
      if (category) params.category = category;
      const res = await api.get("/lost-found/", { params });
      const data = res.data;
      setItems(data?.data || data?.results || (Array.isArray(data) ? data : []));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tab, search, category]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handlePost = async (formData) => {
    await api.post("/lost-found/create", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    toast.success("Item posted successfully");
    fetchItems();
  };

  const handleClaim = async (id) => {
    try {
      await api.post(`/lost-found/${id}/claim`);
      toast.success("Claim request sent");
      fetchItems();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to claim");
    }
  };

  const handleFlag = async (id) => {
    try {
      await api.post(`/lost-found/${id}/flag`, { reason: "Inappropriate or suspicious" });
      toast.success("Item reported");
    } catch (err) {
      toast.error("Failed to report");
    }
  };

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Lost & Found</h1>
          <p className="page-subtitle">Report or find lost items on campus</p>
        </div>
        <button onClick={() => setShowPostModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Report Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input type="text" placeholder="Search items..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="text-xs border border-surface-200 rounded-lg px-3 py-2 bg-white text-surface-600 outline-none focus:ring-2 focus:ring-primary-100">
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
        </select>
        <div className="flex bg-surface-100 rounded-lg p-0.5">
          {[
            { id: "all", label: "All" },
            { id: "lost", label: "Lost" },
            { id: "found", label: "Found" },
            { id: "claimed", label: "Claimed" },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${tab === t.id ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-48 rounded-xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
          <p className="text-base font-medium text-surface-700">No items found</p>
          <p className="text-sm text-surface-400 mt-1">
            {search || category ? "Try adjusting your filters" : "No lost or found items reported yet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onClaim={handleClaim} onFlag={handleFlag} />
          ))}
        </div>
      )}

      {/* Post Modal */}
      <PostItemModal isOpen={showPostModal} onClose={() => setShowPostModal(false)} onSubmit={handlePost} />
    </div>
  );
}
