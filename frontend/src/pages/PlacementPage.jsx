import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

// ── Pipeline Stage Config ────────────────────────────────────────────────────
const STAGES = [
  { id: "wishlist", label: "Wishlist", color: "bg-slate-100 text-slate-700", icon: "⭐" },
  { id: "applied", label: "Applied", color: "bg-blue-100 text-blue-700", icon: "📤" },
  { id: "oa_scheduled", label: "OA Scheduled", color: "bg-indigo-100 text-indigo-700", icon: "📝" },
  { id: "oa_completed", label: "OA Done", color: "bg-violet-100 text-violet-700", icon: "✅" },
  { id: "shortlisted", label: "Shortlisted", color: "bg-purple-100 text-purple-700", icon: "🎯" },
  { id: "interview_round_1", label: "Interview 1", color: "bg-amber-100 text-amber-700", icon: "🗣️" },
  { id: "interview_round_2", label: "Interview 2", color: "bg-orange-100 text-orange-700", icon: "🗣️" },
  { id: "hr_round", label: "HR Round", color: "bg-pink-100 text-pink-700", icon: "🤝" },
  { id: "selected", label: "Selected", color: "bg-emerald-100 text-emerald-700", icon: "🎉" },
  { id: "offer_received", label: "Offer", color: "bg-green-100 text-green-700", icon: "💰" },
  { id: "rejected", label: "Rejected", color: "bg-red-100 text-red-700", icon: "❌" },
];

const STAGE_MAP = Object.fromEntries(STAGES.map((s) => [s.id, s]));

// ── Application Card ─────────────────────────────────────────────────────────
function AppCard({ app, onStatusChange, onDelete, onClick }) {
  const stage = STAGE_MAP[app.status] || STAGES[0];
  const daysUntilDeadline = app.deadline
    ? Math.ceil((new Date(app.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div
      onClick={() => onClick(app)}
      className="p-3.5 rounded-xl border border-surface-100 bg-white hover:shadow-card-hover hover:border-primary-200 transition-all duration-150 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-surface-800 truncate group-hover:text-primary-700 transition-colors">
            {app.company_name}
          </h4>
          <p className="text-xs text-surface-500 mt-0.5 truncate">{app.role}</p>
        </div>
        {app.package_lpa && (
          <span className="text-xs font-medium text-success-600 bg-success-50 px-2 py-0.5 rounded-full flex-shrink-0">
            ₹{app.package_lpa}L
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium ${stage.color}`}>
          {stage.icon} {stage.label}
        </span>
        {app.job_type && app.job_type !== "full_time" && (
          <span className="text-2xs text-surface-400 bg-surface-100 px-1.5 py-0.5 rounded">
            {app.job_type === "internship" ? "Intern" : "Contract"}
          </span>
        )}
      </div>

      {daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 7 && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-warning-600">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {daysUntilDeadline === 0 ? "Due today" : `${daysUntilDeadline}d left`}
        </div>
      )}

      {app.location && (
        <p className="text-2xs text-surface-400 mt-1.5 truncate">📍 {app.location}</p>
      )}
    </div>
  );
}

// ── Add Application Modal ────────────────────────────────────────────────────
function AddAppModal({ isOpen, onClose, onAdd, editApp }) {
  const [form, setForm] = useState({
    company_name: "", role: "", package_lpa: "", status: "wishlist",
    application_date: "", deadline: "", job_link: "", location: "",
    job_type: "full_time", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editApp) {
      setForm({
        company_name: editApp.company_name || "",
        role: editApp.role || "",
        package_lpa: editApp.package_lpa || "",
        status: editApp.status || "wishlist",
        application_date: editApp.application_date || "",
        deadline: editApp.deadline || "",
        job_link: editApp.job_link || "",
        location: editApp.location || "",
        job_type: editApp.job_type || "full_time",
        notes: editApp.notes || "",
      });
    } else {
      setForm({
        company_name: "", role: "", package_lpa: "", status: "wishlist",
        application_date: "", deadline: "", job_link: "", location: "",
        job_type: "full_time", notes: "",
      });
    }
  }, [editApp, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_name || !form.role) {
      toast.error("Company name and role are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = { ...form };
      if (!payload.package_lpa) delete payload.package_lpa;
      if (!payload.application_date) delete payload.application_date;
      if (!payload.deadline) delete payload.deadline;
      await onAdd(payload, editApp?.id);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-surface-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-float w-full max-w-lg p-6 animate-fade-up max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">
          {editApp ? "Edit Application" : "Add Application"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-medium text-surface-600 mb-1 block">Company *</label>
              <input type="text" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                className="input-field" placeholder="e.g., Google" />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="text-xs font-medium text-surface-600 mb-1 block">Role *</label>
              <input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="input-field" placeholder="e.g., SDE Intern" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Package (LPA)</label>
              <input type="number" step="0.01" value={form.package_lpa} onChange={(e) => setForm({ ...form, package_lpa: e.target.value })}
                className="input-field" placeholder="12.5" />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Type</label>
              <select value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })} className="input-field">
                <option value="full_time">Full Time</option>
                <option value="internship">Internship</option>
                <option value="contract">Contract</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="input-field">
                {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Applied Date</label>
              <input type="date" value={form.application_date} onChange={(e) => setForm({ ...form, application_date: e.target.value })}
                className="input-field" />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Deadline</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="input-field" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Location</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="input-field" placeholder="Bangalore, Remote, etc." />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Job Link</label>
            <input type="url" value={form.job_link} onChange={(e) => setForm({ ...form, job_link: e.target.value })}
              className="input-field" placeholder="https://..." />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-field min-h-[60px] resize-none" placeholder="Prep notes, contacts, etc." />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-surface-600 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50">
              {submitting ? "Saving..." : editApp ? "Update" : "Add Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function PlacementPage() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("pipeline"); // pipeline | list
  const [showModal, setShowModal] = useState(false);
  const [editApp, setEditApp] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [appsRes, statsRes, readinessRes] = await Promise.allSettled([
        api.get("/placement/applications"),
        api.get("/placement/stats"),
        api.get("/placement/readiness"),
      ]);

      if (appsRes.status === "fulfilled") {
        const data = appsRes.value.data;
        setApplications(data?.results || data?.data || []);
      }
      if (statsRes.status === "fulfilled") {
        setStats(statsRes.value.data?.data || null);
      }
      if (readinessRes.status === "fulfilled") {
        setReadiness(readinessRes.value.data?.data || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (payload, editId) => {
    if (editId) {
      await api.put(`/placement/applications/${editId}`, payload);
      toast.success("Application updated");
    } else {
      await api.post("/placement/applications/create", payload);
      toast.success("Application added");
    }
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this application?")) return;
    try {
      await api.delete(`/placement/applications/${id}`);
      toast.success("Deleted");
      fetchData();
    } catch { toast.error("Failed to delete"); }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/placement/applications/${id}`, { status: newStatus });
      fetchData();
    } catch { toast.error("Failed to update status"); }
  };

  const handleCardClick = (app) => {
    setEditApp(app);
    setShowModal(true);
  };

  // Group by status for pipeline view
  const grouped = {};
  STAGES.forEach((s) => { grouped[s.id] = []; });
  applications.forEach((app) => {
    if (grouped[app.status]) grouped[app.status].push(app);
    else grouped.wishlist.push(app);
  });

  const filteredApps = statusFilter
    ? applications.filter((a) => a.status === statusFilter)
    : applications;

  if (loading) {
    return (
      <div className="page-container space-y-6">
        <div className="skeleton h-12 w-64 rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        <div className="skeleton h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Placement Tracker</h1>
          <p className="page-subtitle">Manage your placement journey end-to-end</p>
        </div>
        <button
          onClick={() => { setEditApp(null); setShowModal(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Application
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-surface-900 tabular-nums">{stats?.total_applications || 0}</p>
          <p className="text-xs text-surface-500 mt-0.5">Total Applications</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-success-600 tabular-nums">{stats?.offers || 0}</p>
          <p className="text-xs text-surface-500 mt-0.5">Offers</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-info-600 tabular-nums">{stats?.interviews_count || 0}</p>
          <p className="text-xs text-surface-500 mt-0.5">Interviews</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-primary-600 tabular-nums">{readiness?.overall_score || 0}%</p>
          <p className="text-xs text-surface-500 mt-0.5">Readiness</p>
        </div>
      </div>

      {/* Readiness Breakdown */}
      {readiness && readiness.overall_score > 0 && (
        <div className="card-padded">
          <h3 className="text-sm font-semibold text-surface-800 mb-3">Placement Readiness</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Resume", value: readiness.resume_completion, color: "bg-blue-500" },
              { label: "Coding", value: readiness.coding_solved, color: "bg-emerald-500" },
              { label: "Roadmap", value: readiness.roadmap_progress, color: "bg-violet-500" },
              { label: "Profile", value: readiness.profile_completion, color: "bg-amber-500" },
              { label: "Contests", value: readiness.contests_participated, color: "bg-pink-500" },
              { label: "Assignments", value: readiness.assignments_completed, color: "bg-indigo-500" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-surface-600">{item.label}</span>
                  <span className="text-xs font-semibold text-surface-800">{item.value}%</span>
                </div>
                <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Toggle + Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex bg-surface-100 rounded-lg p-0.5">
          <button onClick={() => setView("pipeline")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === "pipeline" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500"}`}>
            Pipeline
          </button>
          <button onClick={() => setView("list")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${view === "list" ? "bg-white text-surface-900 shadow-sm" : "text-surface-500"}`}>
            List
          </button>
        </div>
        {view === "list" && (
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-surface-200 rounded-lg px-2.5 py-1.5 bg-white text-surface-600 outline-none focus:ring-2 focus:ring-primary-100">
            <option value="">All Stages</option>
            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        )}
      </div>

      {/* Pipeline View */}
      {view === "pipeline" && (
        <div className="overflow-x-auto -mx-4 px-4 pb-4">
          <div className="flex gap-3 min-w-max">
            {STAGES.filter((s) => grouped[s.id]?.length > 0 || ["wishlist", "applied", "shortlisted", "offer_received", "rejected"].includes(s.id)).map((stage) => (
              <div key={stage.id} className="w-64 flex-shrink-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="text-sm">{stage.icon}</span>
                  <span className="text-xs font-semibold text-surface-700">{stage.label}</span>
                  <span className="text-xs text-surface-400 bg-surface-100 px-1.5 py-0.5 rounded-full">
                    {grouped[stage.id]?.length || 0}
                  </span>
                </div>
                <div className="space-y-2 min-h-[100px] p-2 rounded-xl bg-surface-50 border border-surface-100">
                  {grouped[stage.id]?.length === 0 ? (
                    <p className="text-xs text-surface-400 text-center py-6">No applications</p>
                  ) : (
                    grouped[stage.id].map((app) => (
                      <AppCard key={app.id} app={app} onClick={handleCardClick} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="space-y-2">
          {filteredApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400">
                  <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                </svg>
              </div>
              <p className="text-base font-medium text-surface-700">No applications yet</p>
              <p className="text-sm text-surface-400 mt-1">Start tracking your placement journey</p>
            </div>
          ) : (
            filteredApps.map((app) => {
              const stage = STAGE_MAP[app.status] || STAGES[0];
              return (
                <div key={app.id} className="card-padded flex items-center gap-4 hover:shadow-card-hover transition-all cursor-pointer" onClick={() => handleCardClick(app)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-surface-800">{app.company_name}</h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium ${stage.color}`}>
                        {stage.icon} {stage.label}
                      </span>
                    </div>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {app.role}
                      {app.package_lpa && ` · ₹${app.package_lpa}L`}
                      {app.location && ` · ${app.location}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {app.deadline && (
                      <span className="text-xs text-surface-400">
                        {new Date(app.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(app.id); }}
                      className="p-1.5 text-surface-300 hover:text-danger-500 rounded-lg hover:bg-danger-50 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <AddAppModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditApp(null); }}
        onAdd={handleAdd}
        editApp={editApp}
      />
    </div>
  );
}
