import { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

export default function AdminCommunicationPage() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await api.get("/admin/communication/"); setChannels(Array.isArray(res.data) ? res.data : res.data.results || res.data.channels || []); }
      catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  return (
    <div className="page-container space-y-6">
      <div><h1 className="page-title">Communication</h1><p className="page-subtitle">Manage chat channels and moderation</p></div>
      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
      ) : channels.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><p className="empty-state-title">No channels</p></div>
      ) : (
        <div className="table-container">
          <table className="w-full">
            <thead className="table-head"><tr><th className="th">Channel</th><th className="th">Members</th><th className="th">Messages</th><th className="th">Created</th></tr></thead>
            <tbody>
              {channels.map((ch) => (
                <tr key={ch.id} className="tr">
                  <td className="td"><div className="flex items-center gap-2"><span className="text-surface-400">#</span><span className="text-sm font-medium text-surface-800">{ch.name}</span></div></td>
                  <td className="td text-sm text-surface-500 tabular-nums">{ch.members_count || 0}</td>
                  <td className="td text-sm text-surface-500 tabular-nums">{ch.messages_count || 0}</td>
                  <td className="td text-xs text-surface-400">{ch.created_at ? new Date(ch.created_at).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
