import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "react-toastify";
import { cgpaService } from "../services/cgpaService";
import { SkeletonStatCard, SkeletonCard } from "../components/common/Skeleton";
import EmptyState from "../components/common/EmptyState";
import PageHeader from "../components/common/PageHeader";

const GRADE_POINTS = { O: 10, "A+": 9, A: 8, "B+": 7, B: 6, C: 5, P: 4, F: 0 };
const GRADE_COLORS = { O: "#059669", "A+": "#0d9488", A: "#0284c7", "B+": "#6366f1", B: "#7c3aed", C: "#d97706", P: "#ea580c", F: "#dc2626" };
const STANDING_LABELS = { excellent: "Excellent", good: "Good", average: "Average", at_risk: "At Risk", critical: "Critical" };
const STANDING_COLORS = { excellent: "emerald", good: "blue", average: "amber", at_risk: "orange", critical: "rose" };

// ── Chart Components ──────────────────────────────────────────────────────────

function LineChart({ points, color = "#2563eb", height = 180 }) {
  if (!points?.length) return <div className="text-xs text-slate-400 py-8 text-center">No data yet</div>;
  const maxY = 10;
  const width = 560;
  const step = points.length > 1 ? width / (points.length - 1) : width / 2;
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${height - (p.value / maxY) * height}`)
    .join(" ");
  const areaD = d + ` L ${(points.length - 1) * step} ${height} L 0 ${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: `${height}px` }}>
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[2, 4, 6, 8, 10].map((v) => (
        <line key={v} x1="0" y1={height - (v / maxY) * height} x2={width} y2={height - (v / maxY) * height} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="4" />
      ))}
      <path d={areaD} fill={`url(#grad-${color.replace("#", "")})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={`${p.label}-${i}`}>
          <circle cx={i * step} cy={height - (p.value / maxY) * height} r="5" fill="white" stroke={color} strokeWidth="2" />
          <text x={i * step} y={height + 14} textAnchor="middle" className="text-[9px]" fill="#64748b">{p.label}</text>
          <text x={i * step} y={height - (p.value / maxY) * height - 10} textAnchor="middle" className="text-[9px] font-semibold" fill={color}>{p.value.toFixed(2)}</text>
        </g>
      ))}
    </svg>
  );
}

function GradeBarChart({ distribution }) {
  const keys = Object.keys(GRADE_POINTS);
  const maxVal = Math.max(1, ...keys.map((k) => distribution?.[k] || 0));
  return (
    <div className="space-y-2">
      {keys.map((k) => {
        const val = distribution?.[k] || 0;
        const pct = (val / maxVal) * 100;
        return (
          <div key={k} className="flex items-center gap-2">
            <div className="w-8 text-xs font-bold" style={{ color: GRADE_COLORS[k] }}>{k}</div>
            <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: GRADE_COLORS[k] }} />
            </div>
            <div className="w-8 text-xs text-slate-600 text-right font-medium">{val}</div>
          </div>
        );
      })}
    </div>
  );
}

function ProgressRing({ value, max = 10, size = 80, strokeWidth = 8, color = "#2563eb" }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const offset = circumference * (1 - progress);
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700" />
      </svg>
      <span className="absolute text-sm font-bold text-slate-900">{Number(value).toFixed(1)}</span>
    </div>
  );
}

// ── Semester Form Modal ───────────────────────────────────────────────────────

function SemesterForm({ initial, onSave, onClose, existingSemesters = [] }) {
  const [semester, setSemester] = useState(initial?.semester || 1);
  const [semesterName, setSemesterName] = useState(initial?.semester_name || "");
  const [academicYear, setAcademicYear] = useState(initial?.academic_year || "");
  const [subjects, setSubjects] = useState(
    initial?.subjects?.length
      ? initial.subjects.map((s) => ({ ...s }))
      : [{ subject_name: "", subject_code: "", credits: 3, grade: "O", internal_marks: "", external_marks: "" }]
  );
  const [saving, setSaving] = useState(false);

  const addSubject = () => setSubjects((prev) => [...prev, { subject_name: "", subject_code: "", credits: 3, grade: "O", internal_marks: "", external_marks: "" }]);
  const removeSubject = (i) => setSubjects((prev) => prev.filter((_, idx) => idx !== i));
  const updateSubject = (i, key, value) => setSubjects((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));
  const duplicateSubject = (i) => setSubjects((prev) => [...prev.slice(0, i + 1), { ...prev[i], subject_name: prev[i].subject_name + " (copy)" }, ...prev.slice(i + 1)]);

  const resetForm = () => {
    setSubjects([{ subject_name: "", subject_code: "", credits: 3, grade: "O", internal_marks: "", external_marks: "" }]);
    setSemesterName("");
    setAcademicYear("");
  };

  const previewSgpa = useMemo(() => {
    const valid = subjects.filter((s) => s.subject_name && Number(s.credits) > 0);
    if (!valid.length) return "0.00";
    const tc = valid.reduce((a, s) => a + Number(s.credits), 0);
    const weighted = valid.reduce((a, s) => a + Number(s.credits) * GRADE_POINTS[s.grade], 0);
    return (weighted / tc).toFixed(2);
  }, [subjects]);

  const totalCredits = useMemo(() => {
    return subjects.filter((s) => s.subject_name).reduce((a, s) => a + Number(s.credits), 0);
  }, [subjects]);

  const submit = async (e) => {
    e.preventDefault();
    const validSubjects = subjects.filter((s) => s.subject_name.trim());
    if (!validSubjects.length) { toast.error("Add at least one subject."); return; }
    setSaving(true);
    try {
      await onSave({
        semester: Number(semester),
        semester_name: semesterName,
        academic_year: academicYear,
        subjects: validSubjects.map((s) => ({
          subject_name: s.subject_name.trim(),
          subject_code: s.subject_code?.trim() || "",
          credits: Number(s.credits),
          grade: s.grade,
          internal_marks: s.internal_marks ? Number(s.internal_marks) : null,
          external_marks: s.external_marks ? Number(s.external_marks) : null,
        })),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 p-4 flex items-start justify-center overflow-y-auto" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-4xl my-8 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-primary-50 to-blue-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{initial ? "Edit Semester" : "Add New Semester"}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Fill in your subjects and grades for this semester</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Semester info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Semester Number</label>
              <select className="input-field" value={semester} onChange={(e) => setSemester(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Label (optional)</label>
              <input className="input-field" placeholder="e.g. Fall 2024" value={semesterName} onChange={(e) => setSemesterName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Academic Year</label>
              <input className="input-field" placeholder="e.g. 2024-25" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
            </div>
          </div>

          {/* Preview stats */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-gradient-to-r from-primary-50 to-emerald-50 border border-primary-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-700">{previewSgpa}</p>
              <p className="text-[10px] uppercase tracking-wide text-primary-600 font-medium">Preview SGPA</p>
            </div>
            <div className="w-px h-8 bg-primary-200" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-700">{totalCredits}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">Total Credits</p>
            </div>
            <div className="w-px h-8 bg-primary-200" />
            <div className="text-center">
              <p className="text-lg font-bold text-slate-700">{subjects.filter((s) => s.subject_name).length}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">Subjects</p>
            </div>
          </div>

          {/* Subject rows */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-1">
              <span className="col-span-3 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Subject Name</span>
              <span className="col-span-2 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Code</span>
              <span className="col-span-1 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Credits</span>
              <span className="col-span-2 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Grade</span>
              <span className="col-span-1 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Int.</span>
              <span className="col-span-1 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Ext.</span>
              <span className="col-span-2 text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Actions</span>
            </div>
            {subjects.map((s, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-slate-50/50 border border-slate-100 hover:border-primary-200 transition-colors">
                <input className="input-field col-span-3 text-sm" placeholder="Subject name" value={s.subject_name} onChange={(e) => updateSubject(i, "subject_name", e.target.value)} />
                <input className="input-field col-span-2 text-sm" placeholder="CS101" value={s.subject_code || ""} onChange={(e) => updateSubject(i, "subject_code", e.target.value)} />
                <input type="number" min={1} max={10} className="input-field col-span-1 text-sm text-center" value={s.credits} onChange={(e) => updateSubject(i, "credits", e.target.value)} />
                <select className="input-field col-span-2 text-sm" value={s.grade} onChange={(e) => updateSubject(i, "grade", e.target.value)}>
                  {Object.entries(GRADE_POINTS).map(([g, p]) => (
                    <option key={g} value={g}>{g} ({p})</option>
                  ))}
                </select>
                <input type="number" min={0} max={100} className="input-field col-span-1 text-sm" placeholder="—" value={s.internal_marks || ""} onChange={(e) => updateSubject(i, "internal_marks", e.target.value)} />
                <input type="number" min={0} max={100} className="input-field col-span-1 text-sm" placeholder="—" value={s.external_marks || ""} onChange={(e) => updateSubject(i, "external_marks", e.target.value)} />
                <div className="col-span-2 flex gap-1">
                  <button type="button" onClick={() => duplicateSubject(i)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-primary-50 hover:text-primary-600 text-xs" title="Duplicate">⧉</button>
                  <button type="button" onClick={() => removeSubject(i)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 text-xs" title="Remove">×</button>
                </div>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addSubject} className="px-3 py-2 rounded-xl bg-primary-50 text-primary-700 text-sm font-medium hover:bg-primary-100 transition-colors">+ Add Subject</button>
            <button type="button" onClick={resetForm} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 transition-colors">Reset Form</button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
          <button disabled={saving} className="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors">
            {saving ? "Saving..." : initial ? "Update Semester" : "Save Semester"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Main CGPA Page Component ──────────────────────────────────────────────────

export default function CGPAPage() {
  const [record, setRecord] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [gradeInput, setGradeInput] = useState("O");
  const [marksInput, setMarksInput] = useState("");
  const [gradeResult, setGradeResult] = useState(null);
  const [target, setTarget] = useState({ target_cgpa: "", remaining_semesters: 2, avg_credits_per_semester: 20 });
  const [prediction, setPrediction] = useState(null);
  const [expandedSemester, setExpandedSemester] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, a] = await Promise.all([cgpaService.getRecord(), cgpaService.getAnalytics()]);
      setRecord(r.data.data);
      setAnalytics(a.data.data);
    } catch {
      toast.error("Failed to load CGPA data.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const r = await cgpaService.getHistory();
      setHistory(r.data.data || []);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (activeTab === "history") loadHistory(); }, [activeTab, loadHistory]);

  const saveSemester = async (payload) => {
    try {
      if (editing?.id) await cgpaService.updateSemester(editing.id, payload);
      else await cgpaService.saveSemester(payload);
      toast.success("Semester saved successfully.");
      setShowForm(false);
      setEditing(null);
      await load();
    } catch (e) {
      const errs = e.response?.data?.errors;
      if (errs) Object.values(errs).flat().forEach((m) => toast.error(String(m)));
      else toast.error(e.response?.data?.error?.message || "Save failed.");
    }
  };

  const deleteSemester = async (id) => {
    if (!window.confirm("Delete this semester and all its subjects?")) return;
    try {
      await cgpaService.deleteSemester(id);
      toast.success("Semester deleted.");
      await load();
    } catch {
      toast.error("Delete failed.");
    }
  };

  const convertGrade = async () => {
    try {
      const payload = {};
      if (gradeInput) payload.grade = gradeInput;
      if (marksInput) payload.marks = Number(marksInput);
      const r = await cgpaService.convertGrade(payload);
      setGradeResult(r.data.data);
    } catch {
      toast.error("Conversion failed.");
    }
  };

  const predictTarget = async () => {
    if (!target.target_cgpa) { toast.error("Enter a target CGPA."); return; }
    try {
      const r = await cgpaService.predictTarget({
        target_cgpa: Number(target.target_cgpa),
        remaining_semesters: Number(target.remaining_semesters),
        avg_credits_per_semester: Number(target.avg_credits_per_semester),
      });
      setPrediction(r.data.data);
    } catch (e) {
      toast.error(e.response?.data?.error?.message || "Prediction failed.");
    }
  };

  const sgpaSeries = (analytics?.semester_sgpa_series || []).map((s) => ({ label: `S${s.semester}`, value: Number(s.sgpa) }));
  const cgpaSeries = (analytics?.cgpa_progress_series || []).map((s) => ({ label: `S${s.semester}`, value: Number(s.cgpa) }));

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "semesters", label: "Semesters" },
    { id: "analytics", label: "Analytics" },
    { id: "tools", label: "Tools" },
    { id: "history", label: "History" },
  ];

  if (loading) return (
    <div className="space-y-5 animate-fade-up">
      <div className="h-7 w-48 skeleton rounded-xl mb-2" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SkeletonCard lines={5} hasIcon={false} />
        <SkeletonCard lines={5} hasIcon={false} />
      </div>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader
        title="Academic Performance"
        subtitle="Track your GPA, analyze trends, and plan your academic goals."
        actions={
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary btn-sm">
            + Add Semester
          </button>
        }
      />

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === "overview" && (
        <div className="space-y-5">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5 flex items-center gap-4">
              <ProgressRing value={Number(record?.current_cgpa || 0)} color="#2563eb" />
              <div>
                <p className="text-xs text-slate-500 font-medium">Current CGPA</p>
                <p className="text-xl font-bold text-slate-900">{Number(record?.current_cgpa || 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs text-slate-500 font-medium">Total Credits</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{record?.total_credits_earned || 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Earned across all semesters</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs text-slate-500 font-medium">Semesters</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{record?.total_semesters || record?.semesters?.length || 0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Completed semesters</p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <p className="text-xs text-slate-500 font-medium">Standing</p>
              <p className={`text-lg font-bold mt-1 text-${STANDING_COLORS[record?.academic_standing] || "slate"}-600`}>
                {STANDING_LABELS[record?.academic_standing] || "—"}
              </p>
              {record?.total_backlogs > 0 && (
                <p className="text-[10px] text-red-500 mt-1">{record.total_backlogs} backlog(s)</p>
              )}
            </div>
          </div>

          {/* Warnings */}
          {analytics?.warnings?.length > 0 && (
            <div className="space-y-2">
              {analytics.warnings.map((w, i) => (
                <div key={i} className={`p-3 rounded-xl border text-sm ${
                  w.type === "low_cgpa" ? "bg-red-50 border-red-200 text-red-700" :
                  w.type === "backlogs" ? "bg-amber-50 border-amber-200 text-amber-700" :
                  "bg-orange-50 border-orange-200 text-orange-700"
                }`}>
                  ⚠️ {w.message}
                </div>
              ))}
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">SGPA Trend</h3>
              <LineChart points={sgpaSeries} color="#0ea5e9" />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">CGPA Progress</h3>
              <LineChart points={cgpaSeries} color="#16a34a" />
            </div>
          </div>

          {/* Insights */}
          {analytics?.insights && Object.keys(analytics.insights).length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Performance Insights</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-medium">Best Semester</p>
                  <p className="text-lg font-bold text-emerald-700">S{analytics.insights.best_semester?.semester}</p>
                  <p className="text-xs text-emerald-600">{analytics.insights.best_semester?.sgpa} SGPA</p>
                </div>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
                  <p className="text-[10px] uppercase tracking-wide text-rose-600 font-medium">Lowest Semester</p>
                  <p className="text-lg font-bold text-rose-700">S{analytics.insights.worst_semester?.semester}</p>
                  <p className="text-xs text-rose-600">{analytics.insights.worst_semester?.sgpa} SGPA</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-[10px] uppercase tracking-wide text-blue-600 font-medium">Average SGPA</p>
                  <p className="text-lg font-bold text-blue-700">{analytics.insights.average_sgpa}</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                  <p className="text-[10px] uppercase tracking-wide text-purple-600 font-medium">Trend</p>
                  <p className="text-lg font-bold text-purple-700 capitalize">{analytics.insights.trend}</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-[10px] uppercase tracking-wide text-amber-600 font-medium">Backlogs</p>
                  <p className="text-lg font-bold text-amber-700">{analytics.insights.total_backlogs || 0}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ SEMESTERS TAB ═══ */}
      {activeTab === "semesters" && (
        <div className="space-y-3">
          {(record?.semesters || []).length === 0 && (
            <EmptyState
              icon="generic"
              title="No semesters recorded"
              desc="Add your first semester to start tracking your academic performance."
              action={<button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary btn-sm">Add Semester</button>}
            />
          )}
          {(record?.semesters || []).map((sem) => (
            <div key={sem.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden transition-all">
              {/* Semester header */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50/50"
                onClick={() => setExpandedSemester(expandedSemester === sem.id ? null : sem.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary-600">S{sem.semester}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Semester {sem.semester} {sem.semester_name ? `· ${sem.semester_name}` : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      {sem.total_credits} credits · {sem.total_subjects || sem.subjects?.length || 0} subjects
                      {sem.academic_year ? ` · ${sem.academic_year}` : ""}
                      {sem.failed_subjects > 0 && <span className="text-red-500 ml-1">· {sem.failed_subjects} failed</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-900">{Number(sem.sgpa).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400 uppercase">SGPA</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setEditing(sem); setShowForm(true); }} className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-primary-50 hover:text-primary-600 text-xs">✎</button>
                    <button onClick={(e) => { e.stopPropagation(); deleteSemester(sem.id); }} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 text-xs">🗑</button>
                  </div>
                  <span className={`text-slate-400 transition-transform ${expandedSemester === sem.id ? "rotate-180" : ""}`}>▾</span>
                </div>
              </div>

              {/* Expanded subjects table */}
              {expandedSemester === sem.id && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wide text-slate-500">
                        <th className="text-left py-2 px-2">Subject</th>
                        <th className="text-left py-2 px-2">Code</th>
                        <th className="text-center py-2 px-2">Credits</th>
                        <th className="text-center py-2 px-2">Grade</th>
                        <th className="text-center py-2 px-2">Points</th>
                        <th className="text-center py-2 px-2">Int.</th>
                        <th className="text-center py-2 px-2">Ext.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(sem.subjects || []).map((sub) => (
                        <tr key={sub.id} className={`${sub.is_backlog ? "bg-red-50/50" : ""}`}>
                          <td className="py-2 px-2 font-medium text-slate-800">{sub.subject_name}</td>
                          <td className="py-2 px-2 text-slate-500">{sub.subject_code || "—"}</td>
                          <td className="py-2 px-2 text-center">{sub.credits}</td>
                          <td className="py-2 px-2 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: `${GRADE_COLORS[sub.grade]}15`, color: GRADE_COLORS[sub.grade] }}>
                              {sub.grade}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center font-medium">{sub.grade_points}</td>
                          <td className="py-2 px-2 text-center text-slate-500">{sub.internal_marks ?? "—"}</td>
                          <td className="py-2 px-2 text-center text-slate-500">{sub.external_marks ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══ ANALYTICS TAB ═══ */}
      {activeTab === "analytics" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">SGPA Trend Over Semesters</h3>
              <LineChart points={sgpaSeries} color="#0ea5e9" height={200} />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Cumulative CGPA Progress</h3>
              <LineChart points={cgpaSeries} color="#16a34a" height={200} />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Grade Distribution</h3>
              <GradeBarChart distribution={analytics?.grade_distribution || {}} />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Credits Per Semester</h3>
              <div className="space-y-2">
                {(analytics?.credit_distribution || []).map((c) => (
                  <div key={c.semester} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-600 w-6">S{c.semester}</span>
                    <div className="flex-1 h-4 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(c.credits / 40) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-700 w-8 text-right">{c.credits}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Semester comparison table */}
          {(analytics?.semester_sgpa_series || []).length > 0 && (
            <div className="bg-white border border-slate-100 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">Semester Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Semester</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">SGPA</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Credits</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Subjects</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-slate-500">Failed</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500">Performance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics.semester_sgpa_series.map((s) => (
                      <tr key={s.semester}>
                        <td className="px-3 py-2 font-medium">Sem {s.semester} {s.semester_name ? `(${s.semester_name})` : ""}</td>
                        <td className="px-3 py-2 text-center font-bold">{Number(s.sgpa).toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">{s.credits}</td>
                        <td className="px-3 py-2 text-center">{s.total_subjects || "—"}</td>
                        <td className="px-3 py-2 text-center">{s.failed_subjects > 0 ? <span className="text-red-600 font-medium">{s.failed_subjects}</span> : "0"}</td>
                        <td className="px-3 py-2">
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(s.sgpa / 10) * 100}%`, backgroundColor: s.sgpa >= 8 ? "#059669" : s.sgpa >= 6 ? "#2563eb" : "#dc2626" }} />
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

      {/* ═══ TOOLS TAB ═══ */}
      {activeTab === "tools" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Grade Converter */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Grade ↔ Points Converter</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Grade</label>
                  <select className="input-field" value={gradeInput} onChange={(e) => setGradeInput(e.target.value)}>
                    {Object.keys(GRADE_POINTS).map((g) => <option key={g} value={g}>{g} ({GRADE_POINTS[g]} pts)</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Marks (%)</label>
                  <input type="number" min={0} max={100} className="input-field" placeholder="Enter marks" value={marksInput} onChange={(e) => setMarksInput(e.target.value)} />
                </div>
              </div>
              <button onClick={convertGrade} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800">Convert</button>
              {gradeResult && (
                <div className="p-4 rounded-xl bg-primary-50 border border-primary-100 space-y-2">
                  {gradeResult.grade && <p className="text-sm text-slate-700">Grade <span className="font-bold text-primary-700">{gradeResult.grade}</span> = <span className="font-bold">{gradeResult.grade_point}</span> points</p>}
                  {gradeResult.grade_from_marks && <p className="text-sm text-slate-700">{gradeResult.marks}% → Grade <span className="font-bold text-primary-700">{gradeResult.grade_from_marks}</span> = <span className="font-bold">{gradeResult.grade_point_from_marks}</span> points</p>}
                </div>
              )}
            </div>
            {/* Grade table */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-600 mb-2">Grade Scale Reference</p>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(GRADE_POINTS).map(([g, p]) => (
                  <div key={g} className="text-center p-2 rounded-lg bg-slate-50">
                    <span className="text-sm font-bold" style={{ color: GRADE_COLORS[g] }}>{g}</span>
                    <p className="text-[10px] text-slate-500">{p} pts</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Target Predictor */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Target CGPA Predictor</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Target CGPA</label>
                <input className="input-field" type="number" step="0.01" min="0" max="10" placeholder="e.g. 8.5" value={target.target_cgpa} onChange={(e) => setTarget((t) => ({ ...t, target_cgpa: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Remaining Semesters</label>
                  <input className="input-field" type="number" min="1" max="12" value={target.remaining_semesters} onChange={(e) => setTarget((t) => ({ ...t, remaining_semesters: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Avg Credits/Semester</label>
                  <input className="input-field" type="number" min="1" max="40" value={target.avg_credits_per_semester} onChange={(e) => setTarget((t) => ({ ...t, avg_credits_per_semester: e.target.value }))} />
                </div>
              </div>
              <button onClick={predictTarget} className="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700">Predict Required SGPA</button>

              {prediction && (
                <div className="p-4 rounded-xl border space-y-3 bg-gradient-to-br from-primary-50 to-blue-50 border-primary-100">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-700">Required Avg SGPA:</p>
                    <p className="text-xl font-bold text-primary-700">{prediction.required_avg_sgpa}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-700">Difficulty:</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      prediction.difficulty === "easy" ? "bg-emerald-100 text-emerald-700" :
                      prediction.difficulty === "moderate" ? "bg-blue-100 text-blue-700" :
                      prediction.difficulty === "hard" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {prediction.difficulty}
                    </span>
                  </div>
                  <p className={`text-sm font-semibold ${prediction.is_possible ? "text-emerald-600" : "text-red-600"}`}>
                    {prediction.is_possible ? "✓ Target is achievable!" : "✗ Target is not feasible with current assumptions."}
                  </p>
                  {prediction.semester_plan?.length > 0 && (
                    <div className="pt-2 border-t border-primary-100">
                      <p className="text-xs font-medium text-slate-600 mb-1">Semester Plan:</p>
                      <div className="flex flex-wrap gap-2">
                        {prediction.semester_plan.map((sp) => (
                          <div key={sp.semester} className="px-2 py-1 rounded-lg bg-white border border-primary-100 text-xs">
                            <span className="font-medium">S{sp.semester}:</span> {sp.required_sgpa} SGPA · {sp.credits} cr
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {activeTab === "history" && (
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">Calculation History</h3>
          {history.length === 0 ? (
            <EmptyState icon="generic" title="No history yet" desc="Your calculation history will appear here after you save semesters." />
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      h.action === "semester_added" ? "bg-emerald-50 text-emerald-600" :
                      h.action === "semester_updated" ? "bg-blue-50 text-blue-600" :
                      h.action === "semester_deleted" ? "bg-red-50 text-red-600" :
                      "bg-purple-50 text-purple-600"
                    }`}>
                      {h.action === "semester_added" ? "+" : h.action === "semester_deleted" ? "−" : "↻"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 capitalize">{h.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-slate-500">{new Date(h.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{Number(h.cgpa_at_time).toFixed(2)} CGPA</p>
                    <p className="text-xs text-slate-500">{h.total_credits_at_time} credits · {h.total_semesters_at_time} sem</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Semester Form Modal */}
      {showForm && (
        <SemesterForm
          initial={editing}
          onSave={saveSemester}
          onClose={() => { setShowForm(false); setEditing(null); }}
          existingSemesters={record?.semesters || []}
        />
      )}
    </div>
  );
}
