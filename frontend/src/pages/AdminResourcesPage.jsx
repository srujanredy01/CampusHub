import { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

export default function AdminResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = search ? { search } : {};
        const res = await api.get("/admin/resources/", { params });
        setResources(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [search]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this resource?")) return;
    try { await api.delete(`/admin/resources/${id}/`); setResources(resources.filter(r => r.id !== id)); toast.success("Deleted"); }
    catch { toast.error("Failed to delete"); }
  };

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="page-title">Manage Resources</h1><p className="page-subtitle">Review and manage uploaded resources</p></div>
        <span className="badge-neutral">{resources.length} resources</span>
      </div>

      <div className="search-container max-w-md">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" className="search-input" placeholder="Search resources..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead className="table-head"><tr><th className="th">Title</th><th className="th">Category</th><th className="th">Uploaded By</th><th className="th">Downloads</th><th className="th">Actions</th></tr></thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => <tr key={i} className="tr"><td colSpan={5} className="td"><div className="skeleton h-8 rounded-md" /></td></tr>) :
            resources.length === 0 ? <tr><td colSpan={5} className="td text-center py-12 text-surface-400">No resources</td></tr> :
            resources.map((r) => (
              <tr key={r.id} className="tr">
                <td className="td text-sm font-medium text-surface-800">{r.title}</td>
                <td className="td"><span className="badge-neutral">{r.category || "—"}</span></td>
                <td className="td text-sm text-surface-500">{r.uploaded_by?.username || "—"}</td>
                <td className="td text-sm text-surface-500 tabular-nums">{r.downloads || 0}</td>
                <td className="td"><button onClick={() => handleDelete(r.id)} className="text-xs text-danger-600 hover:text-danger-700 font-medium">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
