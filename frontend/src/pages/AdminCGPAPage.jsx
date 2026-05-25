import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { cgpaService } from "../services/cgpaService";
import PageHeader from "../components/common/PageHeader";
import EmptyState from "../components/common/EmptyState";

const STANDING_LABELS = { excellent: "Excellent", good: "Good", average: "Average", at_risk: "At Risk", critical: "Critical" };
const STANDING_COLORS = { excellent: "bg-emerald-50 text-emerald-700 border-emerald-200", good: "bg-blue-50 text-blue-700 border-blue-200", average: "bg-amber-50 text-amber-700 border-amber-200", at_risk: "bg-orange-50 text-orange-700 border-orange-200", critical: "bg-red-50 text-red-700 border-red-200" };

export default function AdminCGPAPage() {
  const [tab, setTab] = useState("records");
  const [records, setRecords] = useState([]);
  const [meta, setMeta] = useState({ count: 0, page: 1, total_pages: 1 });
  const [analytics, setAnalytics] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [filters, setFilters] = useState({ search: "", branch: "", standing: "", page: 1 });
  const [loading, setLoading] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const r = await cgpaService.adminGetRecords(filters);
      const data = r.data.data;
      setRecords(data.results || []);
      setMeta({ count: data.count, page: data.page, total_pages: data.total_pages });
    } catch {
      toast.error("Failed to load academic records.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadAnalytics = useCallback(async () => {
    try {
      const r = await cgpaService.adminGetAnalytics();
      setAnalytics(r.data.data);
    } catch {
      toast.error("Failed to load analytics.");
    }
  }, []);

  useEffect(() => { if (tab === "records") loadRecords(); }, [tab, loadRecords]);
  useEffect(() => { if (tab === "analytics") loadAnalytics(); }, [tab, loadAnalytics]);

  const viewStudent = async (userId) => {
    try {
      const r = await cgpaService.adminGetRecord(userId);
      setSelectedProfile(r.data.data);
      setSelectedUser(userId);
    } catch {
      toast.error("Failed to load student profile.");
    }
  };

  const exportCSV = async () => {
    try {
      const r = await cgpaService.adminExport();
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "academic_records.csv";
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Export downloaded.");
    } catch {
      toast.error("Export failed.");
    }
  };

  const deleteStudentRecords = async (userId) => {
    if (!window.confirm("Clear all academic records for this student?")) return;
    try {
      await cgpaService.adminDeleteRecord(userId);
      toast.success("Records cleared.");
      setSelectedProfile(null);
      setSelectedUser(null);
      await loadRecords();
    } catch {
      toast.error("Delete failed.");
    }
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader
        title="Academic Records"
        subtitle="View and manage student CGPA data, analytics, and exports."
        actions={
          <button onClick={exportCSV} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Export CSV
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
        {[{ id: "records", label: "Student Records" }, { id: "analytics", label: "Analytics" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ RECORDS TAB ═══ */}
      {tab === "records" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className="input-field text-sm" placeholder="Search by name, email, or ID" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
            <input className="input-field text-sm" placeholder="Branch" value={filters.branch} onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value, page: 1 }))} />
            <select className="input-field text-sm" value={filters.standing} onChange={(e) => setFilters((f) => ({ ...f, standing: e.target.value, page: 1 }))}>
              <option value="">All standings</option>
              {Object.entries(STANDING_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={loadRecords} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold">Search</button>
          </div>

          {/* Records table */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Student</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">CGPA</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Credits</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Semesters</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Backlogs</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Standing</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{r.user_name}</p>
                        <p className="text-xs text-slate-500">{r.user_email} {r.student_id ? `· ${r.student_id}` : ""}</p>
                        {r.branch && <p className="text-xs text-slate-400">{r.branch}</p>}
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-lg">{Number(r.current_cgpa).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">{r.total_credits_earned}</td>
                      <td className="px-4 py-3 text-center">{r.total_semesters}</td>
                      <td className="px-4 py-3 text-center">{r.total_backlogs > 0 ? <span className="text-red-600 font-medium">{r.total_backlogs}</span> : "0"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${STANDING_COLORS[r.academic_standing] || ""}`}>
                          {STANDING_LABELS[r.academic_standing] || r.academic_standing}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => viewStudent(r.id)} className="px-3 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {records.length === 0 && !loading && (
              <div className="p-8"><EmptyState icon="generic" title="No academic records" desc="No students have saved CGPA data yet." /></div>
            )}
          </div>

          {/* Pagination */}
          {meta.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{meta.count} total records</p>
              <div className="flex gap-2">
                <button disabled={meta.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40">Prev</button>
                <span className="px-3 py-1.5 text-sm text-slate-600">Page {meta.page} of {meta.total_pages}</span>
                <button disabled={meta.page >= meta.total_pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40">Next</button>
              </div>
            </div>
          )}

          {/* Student detail modal */}
          {selectedProfile && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 p-4 flex items-start justify-center overflow-y-auto" onClick={() => { setSelectedProfile(null); setSelectedUser(null); }}>
              <div className="bg-white rounded-3xl w-full max-w-4xl my-8 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedProfile.user_name}</h2>
                    <p className="text-xs text-slate-500">{selectedProfile.user_email} {selectedProfile.student_id ? `· ${selectedProfile.student_id}` : ""} {selectedProfile.branch ? `· ${selectedProfile.branch}` : ""}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => deleteStudentRecords(selectedUser)} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-medium">Clear Records</button>
                    <button onClick={() => { setSelectedProfile(null); setSelectedUser(null); }} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">✕</button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-primary-50 border border-primary-100 text-center">
                      <p className="text-2xl font-bold text-primary-700">{Number(selectedProfile.current_cgpa).toFixed(2)}</p>
                      <p className="text-[10px] uppercase text-primary-600">CGPA</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-2xl font-bold text-slate-900">{selectedProfile.total_credits_earned}</p>
                      <p className="text-[10px] uppercase text-slate-500">Credits</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className="text-2xl font-bold text-slate-900">{selectedProfile.total_semesters}</p>
                      <p className="text-[10px] uppercase text-slate-500">Semesters</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <p className={`text-lg font-bold ${STANDING_COLORS[selectedProfile.academic_standing]?.includes("emerald") ? "text-emerald-700" : "text-slate-900"}`}>
                        {STANDING_LABELS[selectedProfile.academic_standing]}
                      </p>
                      <p className="text-[10px] uppercase text-slate-500">Standing</p>
                    </div>
                  </div>

                  {/* Semesters */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-800">Semester Records</h3>
                    {(selectedProfile.semesters || []).map((sem) => (
                      <div key={sem.id} className="border border-slate-100 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-slate-800">Semester {sem.semester} {sem.semester_name ? `· ${sem.semester_name}` : ""}</p>
                          <p className="text-sm font-bold">{Number(sem.sgpa).toFixed(2)} SGPA</p>
                        </div>
                        <table className="w-full text-xs">
                          <thead><tr className="text-slate-500"><th className="text-left py-1">Subject</th><th className="text-center py-1">Credits</th><th className="text-center py-1">Grade</th><th className="text-center py-1">Points</th></tr></thead>
                          <tbody>
                            {(sem.subjects || []).map((sub) => (
                              <tr key={sub.id} className={sub.is_backlog ? "text-red-600" : ""}>
                                <td className="py-1">{sub.subject_name}</td>
                                <td className="text-center py-1">{sub.credits}</td>
                                <td className="text-center py-1 font-bold">{sub.grade}</td>
                                <td className="text-center py-1">{sub.grade_points}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ ANALYTICS TAB ═══ */}
      {tab === "analytics" && analytics && (
        <div className="space-y-5">
          {/* Overview stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs text-slate-500 font-medium">Students with Data</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{analytics.overview?.total_students_with_data || 0}</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs text-slate-500 font-medium">Average CGPA</p>
              <p className="text-3xl font-bold text-primary-600 mt-1">{analytics.overview?.average_cgpa || "—"}</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs text-slate-500 font-medium">Excellent Students</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{analytics.overview?.total_excellent || 0}</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs text-slate-500 font-medium">At Risk Students</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{analytics.overview?.total_at_risk || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* CGPA Distribution */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">CGPA Distribution</h3>
              <div className="space-y-2">
                {Object.entries(analytics.cgpa_distribution || {}).map(([range, count]) => {
                  const maxCount = Math.max(1, ...Object.values(analytics.cgpa_distribution || {}));
                  return (
                    <div key={range} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-600 w-20">{range}</span>
                      <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Standing Distribution */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Academic Standing</h3>
              <div className="space-y-2">
                {(analytics.standing_distribution || []).map((s) => (
                  <div key={s.academic_standing} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${STANDING_COLORS[s.academic_standing] || ""}`}>
                      {STANDING_LABELS[s.academic_standing] || s.academic_standing}
                    </span>
                    <span className="text-sm font-bold text-slate-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Top Performers</h3>
              <div className="space-y-2">
                {(analytics.top_performers || []).map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/50 border border-emerald-100">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.user__full_name}</p>
                      <p className="text-xs text-slate-500">{s.user__branch || "—"} · {s.user__student_id || "—"}</p>
                    </div>
                    <p className="text-lg font-bold text-emerald-700">{Number(s.current_cgpa).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* At Risk */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">At Risk Students</h3>
              <div className="space-y-2">
                {(analytics.at_risk_students || []).length === 0 && <p className="text-sm text-slate-500">No at-risk students.</p>}
                {(analytics.at_risk_students || []).map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-red-50/50 border border-red-100">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.user__full_name}</p>
                      <p className="text-xs text-slate-500">{s.user__branch || "—"} · {s.total_backlogs} backlogs</p>
                    </div>
                    <p className="text-lg font-bold text-red-700">{Number(s.current_cgpa).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Branch Stats */}
          {(analytics.branch_stats || []).length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Branch-wise Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Branch</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">Students</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">Avg CGPA</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.branch_stats.map((b, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 font-medium">{b.user__branch || "Unknown"}</td>
                        <td className="px-4 py-2 text-center">{b.count}</td>
                        <td className="px-4 py-2 text-center font-bold">{Number(b.avg_cgpa).toFixed(2)}</td>
                        <td className="px-4 py-2">
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-primary-500" style={{ width: `${(Number(b.avg_cgpa) / 10) * 100}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
