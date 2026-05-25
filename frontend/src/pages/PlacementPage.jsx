import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { placementService } from "../services/placementService";

const STATUSES = [
  ["applied", "Applied"],
  ["shortlisted", "Shortlisted"],
  ["interview", "Interview"],
  ["offer", "Offer"],
  ["accepted", "Accepted"],
  ["rejected", "Rejected"],
  ["withdrawn", "Withdrawn"],
];

function BarChart({ data, color = "bg-primary-500" }) {
  const max = Math.max(1, ...data.map((d) => d.value || 0));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <div className="w-24 text-xs text-slate-600">{d.label}</div>
          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className={`h-full ${color}`} style={{ width: `${((d.value || 0) / max) * 100}%` }} />
          </div>
          <div className="w-8 text-xs text-slate-500 text-right">{d.value || 0}</div>
        </div>
      ))}
    </div>
  );
}

function AddApplicationModal({ companies, onClose, onAdded }) {
  const [form, setForm] = useState({
    company: "",
    role: "",
    status: "applied",
    applied_date: "",
    deadline: "",
    package_lpa: "",
    reminder_enabled: true,
    notes: "",
  });
  const [newCompany, setNewCompany] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let companyId = form.company;
      if (!companyId && newCompany.trim()) {
        const c = await placementService.createCompany({ name: newCompany.trim() });
        companyId = c.data.data.id;
      }
      await placementService.createApplication({ ...form, company: companyId });
      toast.success("Application added.");
      onAdded();
      onClose();
    } catch (e2) {
      const errs = e2.response?.data?.errors;
      if (errs) Object.values(errs).flat().forEach((m) => toast.error(String(m)));
      else toast.error(e2.response?.data?.error?.message || "Failed to add.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Add Application</h2>
          <button type="button" onClick={onClose} className="text-slate-400">✕</button>
        </div>
        <select className="input-field" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}>
          <option value="">Select existing company</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="input-field" placeholder="Or add new company name" value={newCompany} onChange={(e) => setNewCompany(e.target.value)} />
        <input className="input-field" placeholder="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} required />
        <div className="grid grid-cols-2 gap-2">
          <select className="input-field" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input type="number" step="0.01" className="input-field" placeholder="Package LPA" value={form.package_lpa} onChange={(e) => setForm((f) => ({ ...f, package_lpa: e.target.value }))} />
          <input type="date" className="input-field" value={form.applied_date} onChange={(e) => setForm((f) => ({ ...f, applied_date: e.target.value }))} />
          <input type="date" className="input-field" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.reminder_enabled} onChange={(e) => setForm((f) => ({ ...f, reminder_enabled: e.target.checked }))} />
          Enable deadline reminders
        </label>
        <textarea className="input-field resize-none" rows={2} placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        <button disabled={saving} className="w-full py-2.5 bg-primary-600 text-white rounded-xl font-semibold">{saving ? "Saving..." : "Save Application"}</button>
      </form>
    </div>
  );
}

function AddRoundModal({ app, onClose, onAdded }) {
  const [form, setForm] = useState({ round_number: (app.rounds?.length || 0) + 1, round_type: "technical", round_date: "", result: "pending", feedback: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await placementService.addRound(app.id, form);
      toast.success("Round added.");
      onAdded();
      onClose();
    } catch (e2) {
      toast.error(e2.response?.data?.error?.message || "Failed to add round.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl w-full max-w-md p-5 space-y-3">
        <h2 className="text-base font-bold text-slate-900">Add Round · {app.company_name}</h2>
        <div className="grid grid-cols-2 gap-2">
          <input type="number" min={1} className="input-field" value={form.round_number} onChange={(e) => setForm((f) => ({ ...f, round_number: Number(e.target.value) }))} />
          <select className="input-field" value={form.round_type} onChange={(e) => setForm((f) => ({ ...f, round_type: e.target.value }))}>
            <option value="online_test">Online Test</option>
            <option value="coding">Coding</option>
            <option value="technical">Technical</option>
            <option value="hr">HR</option>
            <option value="group_discussion">Group Discussion</option>
            <option value="other">Other</option>
          </select>
          <input type="date" className="input-field" value={form.round_date} onChange={(e) => setForm((f) => ({ ...f, round_date: e.target.value }))} />
          <select className="input-field" value={form.result} onChange={(e) => setForm((f) => ({ ...f, result: e.target.value }))}>
            <option value="pending">Pending</option>
            <option value="cleared">Cleared</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <textarea className="input-field resize-none" rows={2} placeholder="Feedback" value={form.feedback} onChange={(e) => setForm((f) => ({ ...f, feedback: e.target.value }))} />
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 bg-slate-100 rounded-lg">Cancel</button>
          <button disabled={saving} className="flex-1 py-2 bg-primary-600 text-white rounded-lg">{saving ? "Saving..." : "Add Round"}</button>
        </div>
      </form>
    </div>
  );
}

function ApplicationCard({ app, onStatus, onDelete, onRound }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm text-slate-800">{app.company_name}</p>
          <p className="text-xs text-slate-500">{app.role}</p>
        </div>
        <button onClick={() => onDelete(app.id)} className="text-xs text-red-500">Delete</button>
      </div>
      <p className="text-xs text-slate-500">Deadline: {app.deadline || "N/A"} {app.days_left != null ? `(${app.days_left}d)` : ""}</p>
      <div className="grid grid-cols-2 gap-1">
        <select className="input-field text-xs" value={app.status} onChange={(e) => onStatus(app.id, e.target.value)}>
          {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button onClick={() => onRound(app)} className="text-xs bg-primary-50 text-primary-600 rounded-lg">+ Round</button>
      </div>
      {!!app.rounds?.length && (
        <div className="space-y-1">
          {app.rounds.slice(0, 3).map((r) => (
            <div key={r.id} className="text-xs bg-slate-50 rounded p-1.5 flex justify-between">
              <span>{r.round_type} #{r.round_number}</span>
              <span>{r.result}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlacementPage() {
  const { user } = useSelector((s) => s.auth);
  const isAdmin = user?.role === "admin";
  const [apps, setApps] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState(null);
  const [adminAnalytics, setAdminAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [roundApp, setRoundApp] = useState(null);
  const [activeTab, setActiveTab] = useState("kanban");

  const load = async () => {
    setLoading(true);
    try {
      const [a, c, s] = await Promise.all([
        placementService.getApplications(),
        placementService.getCompanies(),
        placementService.getStats(),
      ]);
      setApps(a.data.results || a.data.data || []);
      setCompanies(c.data.results || c.data.data || []);
      setStats(s.data.data || null);
      if (isAdmin) {
        const ad = await placementService.getAdminAnalytics();
        setAdminAnalytics(ad.data.data || null);
      }
    } catch (e) {
      toast.error(e.response?.data?.error?.message || "Failed to load placement data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [isAdmin]);

  const updateStatus = async (id, status) => {
    try {
      await placementService.updateApplication(id, { status });
      setApps((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this application?")) return;
    try {
      await placementService.deleteApplication(id);
      setApps((prev) => prev.filter((x) => x.id !== id));
    } catch {
      toast.error("Delete failed.");
    }
  };

  const statusMap = useMemo(() => {
    const map = {};
    STATUSES.forEach(([k]) => (map[k] = []));
    apps.forEach((a) => {
      if (!map[a.status]) map[a.status] = [];
      map[a.status].push(a);
    });
    return map;
  }, [apps]);

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Placement Tracker</h1>
          <p className="text-sm text-slate-500">Track applications, rounds, deadlines, offers, and outcomes.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold">Add Application</button>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setActiveTab("kanban")} className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === "kanban" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>Kanban</button>
        <button onClick={() => setActiveTab("charts")} className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === "charts" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>Charts</button>
        {isAdmin && <button onClick={() => setActiveTab("admin")} className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === "admin" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>Admin</button>}
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">Loading placement dashboard...</div>
      ) : (
        <>
          {activeTab === "kanban" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {STATUSES.map(([k, label]) => (
                <div key={k} className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
                    <span className="text-xs text-slate-400">{statusMap[k]?.length || 0}</span>
                  </div>
                  <div className="space-y-2 min-h-[80px]">
                    {(statusMap[k] || []).map((app) => (
                      <ApplicationCard key={app.id} app={app} onStatus={updateStatus} onDelete={remove} onRound={setRoundApp} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "charts" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Application Status Distribution</h3>
                <BarChart
                  data={STATUSES.map(([k, l]) => ({ label: l, value: stats?.by_status?.[k] || 0 }))}
                />
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Summary</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Total</p><p className="text-2xl font-bold">{stats?.total_applications || 0}</p></div>
                  <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Offer Rate</p><p className="text-2xl font-bold">{stats?.offer_rate || 0}%</p></div>
                  <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Avg Package</p><p className="text-2xl font-bold">{stats?.average_package_lpa || 0}</p></div>
                  <div className="bg-slate-50 rounded-xl p-3"><p className="text-xs text-slate-500">Active Deadlines</p><p className="text-2xl font-bold">{stats?.active_deadline_count || 0}</p></div>
                </div>
              </div>
            </div>
          )}

          {isAdmin && activeTab === "admin" && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Placement Analytics</h3>
                <BarChart
                  data={STATUSES.map(([k, l]) => ({ label: l, value: adminAnalytics?.by_status?.[k] || 0 }))}
                  color="bg-emerald-500"
                />
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="bg-slate-50 rounded-lg p-2 text-xs">Total: <b>{adminAnalytics?.total_applications || 0}</b></div>
                  <div className="bg-slate-50 rounded-lg p-2 text-xs">Offers: <b>{adminAnalytics?.offer_count || 0}</b></div>
                  <div className="bg-slate-50 rounded-lg p-2 text-xs">Accepted: <b>{adminAnalytics?.accepted_count || 0}</b></div>
                  <div className="bg-slate-50 rounded-lg p-2 text-xs">Rejected: <b>{adminAnalytics?.rejected_count || 0}</b></div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 p-4">
                <h3 className="text-sm font-semibold text-slate-800 mb-3">Top Companies</h3>
                <div className="space-y-2">
                  {(adminAnalytics?.top_companies || []).map((c) => (
                    <div key={c.company} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                      <span>{c.company}</span>
                      <span className="text-slate-500">{c.applications} apps · {c.offers} offers</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {showAdd && <AddApplicationModal companies={companies} onClose={() => setShowAdd(false)} onAdded={load} />}
      {roundApp && <AddRoundModal app={roundApp} onClose={() => setRoundApp(null)} onAdded={load} />}
    </div>
  );
}
