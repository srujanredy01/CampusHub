import { useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

const STATUS_CONFIG = {
  pending:  { label: "Pending",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" },
};

const FILE_ICONS = {
  pdf:   "📄", docx: "📝", ppt: "📊", image: "🖼", other: "📁",
};

function Skeleton() {
  return (
    <tr className="border-b border-slate-100">
      {[1,2,3,4,5,6].map(i => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${50+i*8}%` }} />
        </td>
      ))}
    </tr>
  );
}

function RejectModal({ note, onClose, onRejected }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/admin/notes/${note.id}/moderate`, { action: "reject", reason });
      toast.success("Note rejected.");
      onRejected();
      onClose();
    } catch { toast.error("Failed."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Reject Note</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-slate-600">Rejecting: <span className="font-semibold">{note.title}</span></p>
          <div>
            <label className="input-label">Reason for rejection</label>
            <textarea className="input-field resize-none" rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this note is being rejected..." required />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-200 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl text-sm hover:bg-red-700 transition-colors disabled:opacity-50">
              {saving ? "Rejecting..." : "Reject Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminNotesPage() {
  const [notes,       setNotes]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [rejectNote,  setRejectNote]  = useState(null);
  const [total,       setTotal]       = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)       params.search = search;
      if (filterStatus) params.status = filterStatus;
      const res = await api.get("/admin/notes", { params });
      const data = res.data.results || res.data.data || [];
      setNotes(data);
      setTotal(res.data.count || data.length);
    } catch { toast.error("Failed to load notes."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, filterStatus]);

  const handleApprove = async (id, title) => {
    try {
      await api.post(`/admin/notes/${id}/moderate`, { action: "approve" });
      toast.success(`"${title}" approved.`);
      load();
    } catch { toast.error("Failed to approve."); }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Remove "${title}"?`)) return;
    try {
      await api.delete(`/admin/notes/${id}`);
      toast.success("Note removed.");
      load();
    } catch { toast.error("Failed to remove."); }
  };

  const pending  = notes.filter(n => n.status === "pending").length;
  const approved = notes.filter(n => n.status === "approved").length;
  const rejected = notes.filter(n => n.status === "rejected").length;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Notes Moderation</h1>
        <p className="text-sm text-slate-500 mt-0.5">Review and moderate student-uploaded notes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending Review", value: pending,  cls: "bg-amber-50 border-amber-200 text-amber-700",    action: () => setFilterStatus("pending") },
          { label: "Approved",       value: approved, cls: "bg-emerald-50 border-emerald-200 text-emerald-700", action: () => setFilterStatus("approved") },
          { label: "Rejected",       value: rejected, cls: "bg-red-50 border-red-200 text-red-700",          action: () => setFilterStatus("rejected") },
        ].map(s => (
          <button key={s.label} onClick={s.action}
            className={`rounded-2xl border p-4 text-left hover:shadow-sm transition-all ${s.cls} ${filterStatus === s.label.toLowerCase().split(" ")[0] ? "ring-2 ring-offset-1 ring-current" : ""}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" className="input-field pl-9" placeholder="Search by title, subject, uploader..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1.5">
            {["pending","approved","rejected",""].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  filterStatus === s
                    ? s === "pending"  ? "bg-amber-500 text-white border-amber-500"
                    : s === "approved" ? "bg-emerald-600 text-white border-emerald-600"
                    : s === "rejected" ? "bg-red-600 text-white border-red-600"
                    : "bg-slate-800 text-white border-slate-800"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}>
                {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Note","Subject","Branch/Sem","Uploader","Status","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)
                : notes.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-slate-200 mx-auto mb-3">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <p className="text-slate-500 font-medium">No notes found</p>
                    </td>
                  </tr>
                )
                : notes.map(n => {
                  const sc = STATUS_CONFIG[n.status] || STATUS_CONFIG.pending;
                  return (
                    <tr key={n.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{FILE_ICONS[n.file_type] || "📁"}</span>
                          <div>
                            <p className="font-medium text-slate-800 max-w-[200px] truncate">{n.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{n.file_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">{n.subject}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-full">{n.branch}</span>
                        <span className="ml-1 text-slate-400">Sem {n.semester}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs">{n.uploaded_by_name || "—"}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${sc.cls}`}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {n.status !== "approved" && (
                            <button onClick={() => handleApprove(n.id, n.title)}
                              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors">
                              Approve
                            </button>
                          )}
                          {n.status !== "rejected" && (
                            <button onClick={() => setRejectNote(n)}
                              className="text-xs font-medium text-amber-600 hover:text-amber-700 px-2.5 py-1 rounded-lg hover:bg-amber-50 transition-colors">
                              Reject
                            </button>
                          )}
                          <button onClick={() => handleDelete(n.id, n.title)}
                            className="text-xs font-medium text-red-600 hover:text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors">
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
        {!loading && notes.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            Showing {notes.length} of {total} notes
          </div>
        )}
      </div>

      {rejectNote && (
        <RejectModal note={rejectNote} onClose={() => setRejectNote(null)} onRejected={load} />
      )}
    </div>
  );
}
