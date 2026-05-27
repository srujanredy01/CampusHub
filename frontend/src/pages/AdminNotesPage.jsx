import { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

export default function AdminNotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await api.get("/admin/notes/"); setNotes(Array.isArray(res.data) ? res.data : res.data.results || []); }
      catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    try { await api.delete(`/admin/notes/${id}/`); setNotes(notes.filter(n => n.id !== id)); toast.success("Deleted"); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="page-container space-y-6">
      <div><h1 className="page-title">Manage Notes</h1><p className="page-subtitle">Review uploaded notes</p></div>
      <div className="table-container">
        <table className="w-full">
          <thead className="table-head"><tr><th className="th">Title</th><th className="th">Subject</th><th className="th">Uploaded By</th><th className="th">Actions</th></tr></thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => <tr key={i} className="tr"><td colSpan={4} className="td"><div className="skeleton h-8 rounded-md" /></td></tr>) :
            notes.length === 0 ? <tr><td colSpan={4} className="td text-center py-12 text-surface-400">No notes</td></tr> :
            notes.map((n) => (
              <tr key={n.id} className="tr">
                <td className="td text-sm font-medium text-surface-800">{n.title}</td>
                <td className="td"><span className="badge-neutral">{n.subject || "—"}</span></td>
                <td className="td text-sm text-surface-500">{n.uploaded_by?.username || "—"}</td>
                <td className="td"><button onClick={() => handleDelete(n.id)} className="text-xs text-danger-600 hover:text-danger-700 font-medium">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
