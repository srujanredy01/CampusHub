import { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

export default function AdminNewsPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await api.get("/admin/news/"); setArticles(Array.isArray(res.data) ? res.data : res.data.results || []); }
      catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this article?")) return;
    try { await api.delete(`/admin/news/${id}/`); setArticles(articles.filter(a => a.id !== id)); toast.success("Deleted"); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="page-title">Manage News</h1><p className="page-subtitle">Create and manage announcements</p></div></div>
      <div className="table-container">
        <table className="w-full">
          <thead className="table-head"><tr><th className="th">Title</th><th className="th">Category</th><th className="th">Date</th><th className="th">Actions</th></tr></thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => <tr key={i} className="tr"><td colSpan={4} className="td"><div className="skeleton h-8 rounded-md" /></td></tr>) :
            articles.length === 0 ? <tr><td colSpan={4} className="td text-center py-12 text-surface-400">No articles</td></tr> :
            articles.map((a) => (
              <tr key={a.id} className="tr">
                <td className="td text-sm font-medium text-surface-800">{a.title}</td>
                <td className="td"><span className="badge-neutral">{a.category || "—"}</span></td>
                <td className="td text-xs text-surface-400">{a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}</td>
                <td className="td"><button onClick={() => handleDelete(a.id)} className="text-xs text-danger-600 hover:text-danger-700 font-medium">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
