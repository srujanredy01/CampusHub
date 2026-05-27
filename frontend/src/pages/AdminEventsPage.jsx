import { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

export default function AdminEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await api.get("/admin/events/"); setEvents(Array.isArray(res.data) ? res.data : res.data.results || []); }
      catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try { await api.delete(`/admin/events/${id}/`); setEvents(events.filter(e => e.id !== id)); toast.success("Deleted"); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="page-container space-y-6">
      <div><h1 className="page-title">Manage Events</h1><p className="page-subtitle">Create and manage campus events</p></div>
      <div className="table-container">
        <table className="w-full">
          <thead className="table-head"><tr><th className="th">Event</th><th className="th">Type</th><th className="th">Date</th><th className="th">Registrations</th><th className="th">Actions</th></tr></thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => <tr key={i} className="tr"><td colSpan={5} className="td"><div className="skeleton h-8 rounded-md" /></td></tr>) :
            events.length === 0 ? <tr><td colSpan={5} className="td text-center py-12 text-surface-400">No events</td></tr> :
            events.map((e) => (
              <tr key={e.id} className="tr">
                <td className="td text-sm font-medium text-surface-800">{e.title}</td>
                <td className="td"><span className="badge-neutral">{e.event_type || "—"}</span></td>
                <td className="td text-xs text-surface-400">{e.date ? new Date(e.date).toLocaleDateString() : "—"}</td>
                <td className="td text-sm text-surface-500 tabular-nums">{e.registrations_count || 0}</td>
                <td className="td"><button onClick={() => handleDelete(e.id)} className="text-xs text-danger-600 hover:text-danger-700 font-medium">Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
