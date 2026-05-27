import { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

export default function AdminNotificationsPage() {
  const [form, setForm] = useState({ title: "", message: "", type: "system" });
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await api.get("/admin/notifications/"); setHistory(Array.isArray(res.data) ? res.data : res.data.results || []); }
      catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await api.post("/admin/notifications/", form);
      toast.success("Notification sent to all users");
      setForm({ title: "", message: "", type: "system" });
    } catch { toast.error("Failed to send"); }
    finally { setSending(false); }
  };

  return (
    <div className="page-container space-y-6">
      <div><h1 className="page-title">Notifications</h1><p className="page-subtitle">Send announcements to all users</p></div>

      <div className="card-padded max-w-2xl">
        <h3 className="text-base font-semibold text-surface-900 mb-4">Send Notification</h3>
        <form onSubmit={handleSend} className="space-y-4">
          <div className="form-group">
            <label className="input-label">Title</label>
            <input type="text" className="input" placeholder="Notification title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="input-label">Message</label>
            <textarea className="input min-h-[80px] resize-none" placeholder="Notification message..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="input-label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="system">System</option>
              <option value="campus_news">Campus News</option>
              <option value="event">Event</option>
              <option value="assignment">Assignment</option>
            </select>
          </div>
          <button type="submit" disabled={sending} className="btn-primary">{sending ? "Sending..." : "Send to All Users"}</button>
        </form>
      </div>

      <div className="card-padded">
        <h3 className="text-base font-semibold text-surface-900 mb-3">Recent Notifications</h3>
        {loading ? <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div> :
        history.length === 0 ? <p className="text-sm text-surface-400">No notifications sent yet</p> :
        <div className="space-y-2">
          {history.slice(0, 10).map((n) => (
            <div key={n.id} className="flex items-center justify-between py-2 border-b border-surface-100 last:border-0">
              <div><p className="text-sm font-medium text-surface-700">{n.title || n.message}</p><p className="text-xs text-surface-400">{n.type}</p></div>
              <span className="text-xs text-surface-400">{n.created_at ? new Date(n.created_at).toLocaleDateString() : ""}</span>
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}
