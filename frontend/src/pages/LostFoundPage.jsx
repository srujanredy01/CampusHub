import { useState, useEffect } from "react";
import { lostFoundService } from "../services/lostFoundService";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/common/LoadingSpinner";

const CATEGORIES = ["", "id_card", "wallet", "charger", "book", "calculator", "keys", "electronics", "other"];
const STATUSES = ["", "lost", "found", "claimed", "closed"];

export default function LostFoundPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({ status: "", category: "" });
  const [form, setForm] = useState({ item_name: "", category: "other", description: "", status: "lost", date_lost_found: "", location: "", contact_name: "", contact_phone: "", contact_email: "" });

  useEffect(() => { fetchItems(); }, [filters]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.category) params.category = filters.category;
      const res = await lostFoundService.getItems(params);
      setItems(res.data.data?.results || res.data.data || []);
    } catch { toast.error("Failed to load items"); }
    finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      await lostFoundService.createItem(fd);
      toast.success("Item posted!");
      setShowForm(false); fetchItems();
    } catch (e) { toast.error(e.response?.data?.errors ? "Validation error" : "Failed"); }
  };

  const handleClaim = async (id) => {
    try { await lostFoundService.claimItem(id); toast.success("Claimed!"); fetchItems(); }
    catch (e) { toast.error(e.response?.data?.error?.message || "Failed"); }
  };

  if (loading && items.length === 0) return <LoadingSpinner size="lg" className="mt-20" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">Lost & Found</h1><p className="text-sm text-gray-500">Report or find lost items on campus</p></div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">{showForm ? "Cancel" : "+ Report Item"}</button>
      </div>

      {showForm && (
        <div className="card space-y-4">
          <h2 className="font-semibold">Report Lost/Found Item</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="input-field" placeholder="Item Name" value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} />
            <select className="input-field" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
              {CATEGORIES.filter(Boolean).map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
            </select>
            <select className="input-field" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
              <option value="lost">Lost</option><option value="found">Found</option>
            </select>
            <input className="input-field" type="date" value={form.date_lost_found} onChange={e => setForm({...form, date_lost_found: e.target.value})} />
            <input className="input-field" placeholder="Location" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
            <input className="input-field" placeholder="Contact Phone" value={form.contact_phone} onChange={e => setForm({...form, contact_phone: e.target.value})} />
          </div>
          <textarea className="input-field" rows={3} placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          <button onClick={handleSubmit} className="btn-primary">Post Item</button>
        </div>
      )}

      <div className="flex gap-3">
        <select className="input-field w-40" value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
          <option value="">All Status</option>{STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input-field w-40" value={filters.category} onChange={e => setFilters({...filters, category: e.target.value})}>
          <option value="">All Categories</option>{CATEGORIES.filter(Boolean).map(c => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="card">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-gray-900">{item.item_name}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === "lost" ? "bg-red-50 text-red-700" : item.status === "found" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"}`}>{item.status}</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
            <div className="mt-2 text-xs text-gray-400 space-y-1">
              <p>📍 {item.location}</p>
              <p>📅 {item.date_lost_found}</p>
              <p>👤 {item.posted_by_name}</p>
            </div>
            {item.status === "found" && (
              <button onClick={() => handleClaim(item.id)} className="btn-secondary text-xs mt-3">Claim Item</button>
            )}
          </div>
        ))}
      </div>
      {items.length === 0 && <div className="text-center py-12 text-gray-500">No items posted yet.</div>}
    </div>
  );
}
