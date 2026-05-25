import { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { attendanceService } from "../services/attendanceService";
import PageHeader from "../components/common/PageHeader";
import EmptyState from "../components/common/EmptyState";

const STATUS_LABELS = { ok: "Good", low: "Low", critical: "Critical" };
const STATUS_COLORS = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
  low: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

export default function AdminAttendancePage() {
  const [tab, setTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({ count: 0, page: 1, total_pages: 1 });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filters, setFilters] = useState({ search: "", branch: "", semester: "", status: "", page: 1 });
  const [loading, setLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const r = await attendanceService.adminGetDashboard();
      setDashboard(r.data.data);
    } catch {
      toast.error("Failed to load attendance dashboard.");
    } finally { setLoading(false); }
  }, []);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const r = await attendanceService.adminGetStudents(filters);
      const data = r.data.data;
      setStudents(data.results || []);
      setMeta({ count: data.count, page: data.page, total_pages: data.total_pages });
    } catch {
      toast.error("Failed to load students.");
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { if (tab === "dashboard") loadDashboard(); }, [tab, loadDashboard]);
  useEffect(() => { if (tab === "students") loadStudents(); }, [tab, loadStudents]);

  const viewStudent = async (id) => {
    try {
      const r = await attendanceService.adminGetStudentDetail(id);
      setSelectedStudent(r.data.data);
    } catch { toast.error("Failed to load student details."); }
  };

  const exportCSV = async () => {
    try {
      const r = await attendanceService.adminExport();
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "attendance_report.csv";
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Export downloaded.");
    } catch { toast.error("Export failed."); }
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader
        title="Attendance Management"
        subtitle="Monitor all student attendance across LPU campus"
        actions={
          <button onClick={exportCSV} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Export CSV
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
        {[
          { id: "dashboard", label: "Dashboard" },
          { id: "students", label: "Students" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ DASHBOARD TAB ═══ */}
      {tab === "dashboard" && dashboard && (
        <div className="space-y-5">
          {/* Overview stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs text-slate-500 font-medium">Total Students</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{dashboard.overview.total_students}</p>
              <p className="text-xs text-slate-400 mt-0.5">{dashboard.overview.students_with_data} with data</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs text-slate-500 font-medium">Average Attendance</p>
              <p className="text-3xl font-bold text-primary-600 mt-1">{dashboard.overview.average_attendance}%</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs text-slate-500 font-medium">Low Attendance</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">{dashboard.overview.low_attendance_count}</p>
              <p className="text-xs text-slate-400 mt-0.5">below 75%</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs text-slate-500 font-medium">Critical Students</p>
              <p className="text-3xl font-bold text-red-600 mt-1">{dashboard.overview.critical_count}</p>
              <p className="text-xs text-slate-400 mt-0.5">below 60%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {/* Branch-wise stats */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Branch-wise Attendance</h3>
              <div className="space-y-2">
                {(dashboard.branch_stats || []).map((b, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-600 w-24 truncate" title={b.branch}>{b.branch}</span>
                    <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${b.average_attendance >= 75 ? "bg-emerald-500" : b.average_attendance >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(100, b.average_attendance)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-700 w-14 text-right">{b.average_attendance}%</span>
                    <span className="text-[10px] text-slate-400 w-16">{b.students} students</span>
                  </div>
                ))}
                {(dashboard.branch_stats || []).length === 0 && <p className="text-sm text-slate-500">No data yet.</p>}
              </div>
            </div>

            {/* Semester-wise stats */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Semester-wise Attendance</h3>
              <div className="space-y-2">
                {(dashboard.semester_stats || []).map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-sm font-medium text-slate-700">Semester {s.semester}</span>
                      <span className="text-xs text-slate-400 ml-2">{s.students} students · {s.subjects} subjects</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-bold ${s.average_attendance >= 75 ? "text-emerald-600" : s.average_attendance >= 60 ? "text-amber-600" : "text-red-600"}`}>
                        {s.average_attendance}%
                      </span>
                      {s.shortage_count > 0 && <span className="text-xs text-red-500 ml-2">{s.shortage_count} shortage</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Critical students */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Critical Students (below 60%)</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(dashboard.critical_students || []).length === 0 && <p className="text-sm text-slate-500">No critical students.</p>}
                {(dashboard.critical_students || []).map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-red-50/50 border border-red-100">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.branch || "—"} · {s.student_id || "—"}</p>
                    </div>
                    <p className="text-lg font-bold text-red-700">{s.average_attendance}%</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Low attendance students */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Low Attendance (below 75%)</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(dashboard.low_attendance_students || []).length === 0 && <p className="text-sm text-slate-500">No low attendance students.</p>}
                {(dashboard.low_attendance_students || []).map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-amber-50/50 border border-amber-100">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.branch || "—"} · {s.subjects_count} subjects</p>
                    </div>
                    <p className="text-lg font-bold text-amber-700">{s.average_attendance}%</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subject-wise analytics */}
          {(dashboard.subject_stats || []).length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Subject-wise Analytics (lowest first)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Subject</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">Code</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">Semester</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">Students</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">Avg %</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-slate-500">Shortage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dashboard.subject_stats.slice(0, 15).map((s, i) => (
                      <tr key={i} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2 font-medium">{s.subject_name}</td>
                        <td className="px-4 py-2 text-center text-slate-500">{s.subject_code || "—"}</td>
                        <td className="px-4 py-2 text-center">{s.semester}</td>
                        <td className="px-4 py-2 text-center">{s.students}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`font-bold ${s.average_attendance >= 75 ? "text-emerald-600" : s.average_attendance >= 60 ? "text-amber-600" : "text-red-600"}`}>
                            {s.average_attendance}%
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          {s.shortage_count > 0 ? <span className="text-red-600 font-medium">{s.shortage_count}</span> : "0"}
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

      {/* ═══ STUDENTS TAB ═══ */}
      {tab === "students" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <input className="input-field text-sm" placeholder="Search name, email, ID" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
            <input className="input-field text-sm" placeholder="Branch" value={filters.branch} onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value, page: 1 }))} />
            <select className="input-field text-sm" value={filters.semester} onChange={(e) => setFilters((f) => ({ ...f, semester: e.target.value, page: 1 }))}>
              <option value="">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <select className="input-field text-sm" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}>
              <option value="">All Status</option>
              <option value="ok">Good (≥75%)</option>
              <option value="low">Low (60-75%)</option>
              <option value="critical">Critical (&lt;60%)</option>
            </select>
            <button onClick={loadStudents} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold">Search</button>
          </div>

          {/* Students table */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">Student</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Branch</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Subjects</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Avg %</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Shortage</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.email} {s.student_id ? `· ${s.student_id}` : ""}</p>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">{s.branch || "—"}</td>
                      <td className="px-4 py-3 text-center">{s.subjects_count}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${s.average_attendance >= 75 ? "text-emerald-600" : s.average_attendance >= 60 ? "text-amber-600" : "text-red-600"}`}>
                          {s.average_attendance}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">{s.shortage_count > 0 ? <span className="text-red-600 font-medium">{s.shortage_count}</span> : "0"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${STATUS_COLORS[s.status] || ""}`}>
                          {STATUS_LABELS[s.status] || s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => viewStudent(s.id)} className="px-3 py-1 rounded-lg bg-primary-50 text-primary-700 text-xs font-medium hover:bg-primary-100">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {students.length === 0 && !loading && (
              <div className="p-8"><EmptyState icon="generic" title="No students found" desc="No students match the current filters." /></div>
            )}
          </div>

          {/* Pagination */}
          {meta.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{meta.count} total students</p>
              <div className="flex gap-2">
                <button disabled={meta.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40">Prev</button>
                <span className="px-3 py-1.5 text-sm text-slate-600">Page {meta.page} of {meta.total_pages}</span>
                <button disabled={meta.page >= meta.total_pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ STUDENT DETAIL MODAL ═══ */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 p-4 flex items-start justify-center overflow-y-auto" onClick={() => setSelectedStudent(null)}>
          <div className="bg-white rounded-3xl w-full max-w-4xl my-8 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedStudent.student.name}</h2>
                <p className="text-xs text-slate-500">
                  {selectedStudent.student.email}
                  {selectedStudent.student.student_id ? ` · ${selectedStudent.student.student_id}` : ""}
                  {selectedStudent.student.branch ? ` · ${selectedStudent.student.branch}` : ""}
                </p>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-primary-50 border border-primary-100 text-center">
                  <p className="text-2xl font-bold text-primary-700">{selectedStudent.summary.average_attendance}%</p>
                  <p className="text-[10px] uppercase text-primary-600">Average</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <p className="text-2xl font-bold text-slate-900">{selectedStudent.summary.total_subjects}</p>
                  <p className="text-[10px] uppercase text-slate-500">Subjects</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{selectedStudent.summary.total_attended}</p>
                  <p className="text-[10px] uppercase text-emerald-600">Attended</p>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
                  <p className="text-2xl font-bold text-red-700">{selectedStudent.summary.total_missed}</p>
                  <p className="text-[10px] uppercase text-red-600">Missed</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                  <p className="text-2xl font-bold text-amber-700">{selectedStudent.summary.shortage_count}</p>
                  <p className="text-[10px] uppercase text-amber-600">Shortage</p>
                </div>
              </div>

              {/* Semester breakdown */}
              {(selectedStudent.semesters || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Semester Breakdown</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {selectedStudent.semesters.map((sem) => (
                      <div key={sem.semester} className="p-2 rounded-xl border border-slate-100 text-center">
                        <p className="text-xs text-slate-500">Sem {sem.semester}</p>
                        <p className={`text-lg font-bold ${sem.average_attendance >= 75 ? "text-emerald-600" : sem.average_attendance >= 60 ? "text-amber-600" : "text-red-600"}`}>
                          {sem.average_attendance}%
                        </p>
                        <p className="text-[10px] text-slate-400">{sem.subjects} subjects · {sem.shortage_count} shortage</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subjects table */}
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Subject Details</h3>
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-500">Subject</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-500">Sem</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-500">Attended</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-500">Total</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-500">%</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-500">Need 75%</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-500">Need 80%</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-500">Can Miss</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedStudent.subjects || []).map((sub) => (
                        <tr key={sub.id} className={sub.is_shortage ? "bg-red-50/30" : ""}>
                          <td className="px-3 py-2">
                            <span className="font-medium">{sub.subject_name}</span>
                            {sub.subject_code && <span className="text-slate-400 ml-1">({sub.subject_code})</span>}
                          </td>
                          <td className="px-3 py-2 text-center">{sub.semester}</td>
                          <td className="px-3 py-2 text-center">{sub.attended_classes}</td>
                          <td className="px-3 py-2 text-center">{sub.total_classes}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`font-bold ${sub.is_shortage ? "text-red-600" : "text-emerald-600"}`}>{sub.attendance_percentage}%</span>
                          </td>
                          <td className="px-3 py-2 text-center">{sub.classes_needed_75 || "—"}</td>
                          <td className="px-3 py-2 text-center">{sub.classes_needed_80 || "—"}</td>
                          <td className="px-3 py-2 text-center">{sub.classes_can_miss}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent history */}
              {(selectedStudent.history || []).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Recent Activity</h3>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedStudent.history.map((h) => (
                      <div key={h.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            h.action === "marked_present" ? "bg-emerald-50 text-emerald-700" :
                            h.action === "marked_absent" ? "bg-red-50 text-red-700" :
                            h.action === "created" ? "bg-blue-50 text-blue-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>{h.action.replace("_", " ")}</span>
                          <span className="text-slate-700">{h.subject_name}</span>
                        </div>
                        <span className="text-slate-400">{h.old_percentage}% → {h.new_percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
