import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { attendanceService } from "../services/attendanceService";
import { SkeletonGrid } from "../components/common/Skeleton";
import EmptyState from "../components/common/EmptyState";
import PageHeader from "../components/common/PageHeader";
import Modal from "../components/common/Modal";

function AttendanceBar({ pct, required }) {
  const safe = Math.min(Math.max(pct, 0), 100);
  const color = pct >= required ? "bg-emerald-500" : pct >= required - 10 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${safe}%` }} />
      <div className="absolute top-0 h-full w-0.5 bg-slate-400" style={{ left: `${required}%` }} title={`Required: ${required}%`} />
    </div>
  );
}

function PredictionModal({ subject, onClose }) {
  const [futureClasses, setFutureClasses] = useState(5);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadPrediction = async () => {
    setLoading(true);
    try {
      const res = await attendanceService.predict(subject.id, { future_classes: futureClasses });
      setPrediction(res.data.data);
    } catch {
      toast.error("Failed to load prediction.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPrediction(); }, []);

  return (
    <Modal open onClose={onClose} title={`Predictions — ${subject.subject_name}`} maxWidth="max-w-lg">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Future classes:</label>
          <input
            type="number"
            className="input-field w-24"
            min={1}
            max={200}
            value={futureClasses}
            onChange={(e) => setFutureClasses(Number(e.target.value))}
          />
          <button onClick={loadPrediction} disabled={loading} className="btn-primary btn-sm">
            {loading ? "..." : "Calculate"}
          </button>
        </div>

        {prediction && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Current Attendance</p>
                <p className="text-xl font-bold text-slate-800">{prediction.current_percentage}%</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-xs text-slate-500">Classes: {prediction.current_attended}/{prediction.current_total}</p>
                <p className="text-xl font-bold text-slate-800">{prediction.current_total - prediction.current_attended} missed</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <p className="text-sm font-semibold text-emerald-800 mb-1">If you attend all {prediction.future_classes} classes</p>
              <p className="text-2xl font-bold text-emerald-700">{prediction.projected_if_attend_all}%</p>
            </div>

            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm font-semibold text-red-800 mb-1">If you miss all {prediction.future_classes} classes</p>
              <p className="text-2xl font-bold text-red-700">{prediction.projected_if_miss_all}%</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-center">
                <p className="text-xs text-blue-600">Need for 75%</p>
                <p className="text-lg font-bold text-blue-800">{prediction.classes_needed_75}</p>
                <p className="text-[10px] text-blue-500">classes</p>
              </div>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-center">
                <p className="text-xs text-purple-600">Need for 80%</p>
                <p className="text-lg font-bold text-purple-800">{prediction.classes_needed_80}</p>
                <p className="text-[10px] text-purple-500">classes</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <p className="text-xs text-amber-600">Can still miss</p>
                <p className="text-lg font-bold text-amber-800">{prediction.classes_can_miss}</p>
                <p className="text-[10px] text-amber-500">classes</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

function HistoryModal({ onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await attendanceService.getHistory({ limit: 50 });
        setHistory(res.data.data || []);
      } catch {
        toast.error("Failed to load history.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const actionLabels = {
    created: "Created",
    updated: "Updated",
    marked_present: "Present",
    marked_absent: "Absent",
    deleted: "Deleted",
  };
  const actionColors = {
    created: "bg-blue-50 text-blue-700",
    updated: "bg-amber-50 text-amber-700",
    marked_present: "bg-emerald-50 text-emerald-700",
    marked_absent: "bg-red-50 text-red-700",
    deleted: "bg-slate-100 text-slate-600",
  };

  return (
    <Modal open onClose={onClose} title="Attendance History" maxWidth="max-w-2xl">
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : history.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No history yet.</p>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-2">
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${actionColors[h.action] || ""}`}>
                  {actionLabels[h.action] || h.action}
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-800">{h.subject_name}</p>
                  <p className="text-xs text-slate-500">Sem {h.semester} {h.subject_code ? `· ${h.subject_code}` : ""}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">
                  {h.old_percentage}% → {h.new_percentage}%
                </p>
                <p className="text-[10px] text-slate-400">
                  {new Date(h.created_at).toLocaleDateString()} {new Date(h.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function SubjectCard({ subject, onUpdate, onDelete, onPredict }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ total_classes: subject.total_classes, attended_classes: subject.attended_classes });
  const [saving, setSaving] = useState(false);

  const pct = subject.attendance_percentage;
  const isShortage = subject.is_shortage;
  const needed = subject.classes_needed;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(subject.id, form);
      setEditing(false);
    } finally { setSaving(false); }
  };

  const mark = async (attended) => {
    try {
      await attendanceService.markClass(subject.id, attended);
      toast.success(attended ? "Marked as attended." : "Marked as missed.");
      onUpdate(subject.id, null, true);
    } catch { toast.error("Failed to mark."); }
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 ${isShortage ? "border-red-200" : "border-slate-100"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-slate-800">{subject.subject_name}</p>
          {subject.subject_code && <p className="text-xs text-slate-400">{subject.subject_code}</p>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-lg font-bold px-3 py-1 rounded-xl ${isShortage ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
            {pct}%
          </span>
          <button onClick={() => onPredict(subject)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Predictions">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </button>
          <button onClick={() => setEditing(!editing)} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button onClick={() => onDelete(subject.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      </div>

      <AttendanceBar pct={pct} required={Number(subject.required_percentage)} />

      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
        <span>{subject.attended_classes}/{subject.total_classes} classes</span>
        <span>Required: {subject.required_percentage}%</span>
      </div>
      <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
        <span>Missed: {subject.missed_classes}</span>
        <span>Can still miss: {subject.classes_can_miss}</span>
      </div>

      {/* Prediction badges */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {subject.classes_needed_75 > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            {subject.classes_needed_75} for 75%
          </span>
        )}
        {subject.classes_needed_80 > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            {subject.classes_needed_80} for 80%
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button onClick={() => mark(true)} className="py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100">+ Attended</button>
        <button onClick={() => mark(false)} className="py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 hover:bg-red-100">+ Missed</button>
      </div>

      {isShortage && needed > 0 && (
        <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
          Need {needed} more consecutive class{needed > 1 ? "es" : ""} to reach {subject.required_percentage}%
        </div>
      )}

      {editing && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Total Classes</label>
              <input type="number" className="input-field text-sm" min={0} value={form.total_classes} onChange={e => setForm(f => ({ ...f, total_classes: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Attended</label>
              <input type="number" className="input-field text-sm" min={0} max={form.total_classes} value={form.attended_classes} onChange={e => setForm(f => ({ ...f, attended_classes: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-primary-600 text-white text-xs font-semibold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddSubjectModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ subject_name: "", subject_code: "", semester: "", total_classes: 0, attended_classes: 0, required_percentage: 75 });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await attendanceService.create(form);
      toast.success("Subject added.");
      onAdded();
      onClose();
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs) Object.values(errs).flat().forEach(m => toast.error(m));
      else toast.error("Failed to add subject.");
    } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} title="Add Subject" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 form-group">
            <label className="input-label">Subject Name *</label>
            <input className="input-field" value={form.subject_name} onChange={e => setForm(f => ({ ...f, subject_name: e.target.value }))} required placeholder="e.g. Data Structures" />
          </div>
          <div className="form-group">
            <label className="input-label">Subject Code</label>
            <input className="input-field" value={form.subject_code} onChange={e => setForm(f => ({ ...f, subject_code: e.target.value }))} placeholder="e.g. CS301" />
          </div>
          <div className="form-group">
            <label className="input-label">Semester *</label>
            <select className="input-field" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} required>
              <option value="">Select</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="input-label">Total Classes</label>
            <input type="number" className="input-field" min={0} value={form.total_classes} onChange={e => setForm(f => ({ ...f, total_classes: Number(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label className="input-label">Attended</label>
            <input type="number" className="input-field" min={0} value={form.attended_classes} onChange={e => setForm(f => ({ ...f, attended_classes: Number(e.target.value) }))} />
          </div>
          <div className="col-span-2 form-group">
            <label className="input-label">Required % (default 75)</label>
            <input type="number" className="input-field" min={0} max={100} value={form.required_percentage} onChange={e => setForm(f => ({ ...f, required_percentage: Number(e.target.value) }))} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Adding...
              </span>
            ) : "Add Subject"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AttendancePage() {
  const [subjects,  setSubjects]  = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [overview,  setOverview]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [showAdd,   setShowAdd]   = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [predictSubject, setPredictSubject] = useState(null);
  const [semester,  setSemester]  = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = semester ? { semester } : {};
      const [listRes, sumRes, overRes] = await Promise.all([
        attendanceService.getAll(params),
        attendanceService.getSummary(params),
        attendanceService.getOverview(params),
      ]);
      setSubjects(listRes.data.results || listRes.data.data || []);
      setSummary(sumRes.data.data);
      setOverview(overRes.data.data);
    } catch { toast.error("Failed to load attendance."); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [semester]);

  const handleUpdate = async (id, data, silentReload = false) => {
    try {
      if (data) {
        await attendanceService.update(id, data);
        if (!silentReload) toast.success("Updated.");
      }
      load();
    } catch { toast.error("Update failed."); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this subject?")) return;
    try {
      await attendanceService.delete(id);
      toast.success("Deleted.");
      load();
    } catch { toast.error("Delete failed."); }
  };

  const shortage = subjects.filter(s => s.is_shortage);
  const semesterSeries = overview?.semester_series || [];

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader
        title="Attendance Tracker"
        subtitle="Monitor your subject-wise attendance — LPU"
        actions={
          <div className="flex gap-2">
            <button onClick={() => setShowHistory(true)} className="btn-secondary btn-sm flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              History
            </button>
            <button onClick={() => setShowAdd(true)} className="btn-primary btn-sm flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Subject
            </button>
          </div>
        }
      />

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Subjects", value: summary.total_subjects, cls: "bg-slate-50 border-slate-200 text-slate-700" },
            { label: "Avg Attendance", value: `${summary.average_attendance}%`, cls: "bg-primary-50 border-primary-200 text-primary-700" },
            { label: "Shortage", value: summary.shortage_subjects, cls: shortage.length > 0 ? "bg-red-50 border-red-200 text-red-700" : "bg-emerald-50 border-emerald-200 text-emerald-700" },
            { label: "Total Missed", value: summary.total_missed, cls: "bg-amber-50 border-amber-200 text-amber-700" },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl border p-4 ${s.cls}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {overview && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Subject Attendance Chart</h2>
            <div className="space-y-2">
              {(overview.by_subject || []).map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <div className="w-28 text-xs text-slate-600 truncate" title={s.subject_name}>{s.subject_name}</div>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`${s.is_shortage ? "bg-red-500" : "bg-emerald-500"} h-full`} style={{ width: `${Math.max(0, Math.min(100, s.attendance_percentage))}%` }} />
                  </div>
                  <div className="w-12 text-xs text-slate-500 text-right">{s.attendance_percentage}%</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">Semester Overview</h2>
            <div className="space-y-2">
              {semesterSeries.map((s) => (
                <div key={s.semester} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-slate-700">Semester {s.semester}</span>
                  <span className="text-slate-500">{s.average_attendance}% · {s.shortage_count} shortage</span>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 rounded-lg bg-primary-50 text-xs text-primary-700">
              Overall attended: {overview.summary.total_attended} · missed: {overview.summary.total_missed}
            </div>
          </div>
        </div>
      )}

      {/* Semester filter */}
      <div className="flex gap-2">
        <select className="input-field w-48" value={semester} onChange={e => setSemester(e.target.value)}>
          <option value="">All Semesters</option>
          {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
      </div>

      {/* Shortage warning */}
      {shortage.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-red-700 mb-1">Attendance Shortage in {shortage.length} subject{shortage.length > 1 ? "s" : ""}</p>
          <p className="text-xs text-red-600">{shortage.map(s => s.subject_name).join(", ")}</p>
        </div>
      )}

      {/* Subject grid */}
      {loading ? (
        <SkeletonGrid count={6} cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-3" />
      ) : subjects.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="attendance"
            title="No subjects added"
            desc="Add your subjects to start tracking attendance"
            action={
              <button onClick={() => setShowAdd(true)} className="btn-primary btn-sm">
                Add Your First Subject
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {subjects.map(s => (
            <SubjectCard key={s.id} subject={s} onUpdate={handleUpdate} onDelete={handleDelete} onPredict={setPredictSubject} />
          ))}
        </div>
      )}

      {showAdd && <AddSubjectModal onClose={() => setShowAdd(false)} onAdded={load} />}
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
      {predictSubject && <PredictionModal subject={predictSubject} onClose={() => setPredictSubject(null)} />}
    </div>
  );
}
