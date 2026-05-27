import { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import { toast } from "react-toastify";

// ── Progress Bar ─────────────────────────────────────────────────────────────
function AttendanceBar({ percentage, required = 75 }) {
  const safe = Math.min(Math.max(percentage, 0), 100);
  const color = safe >= required ? "bg-success-500" : safe >= required - 10 ? "bg-warning-500" : "bg-danger-500";
  return (
    <div className="relative h-2 bg-surface-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ease-smooth ${color}`} style={{ width: `${safe}%` }} />
      <div className="absolute top-0 h-full w-px bg-surface-400/60" style={{ left: `${required}%` }} title={`Required: ${required}%`} />
    </div>
  );
}

// ── Subject Card ─────────────────────────────────────────────────────────────
function SubjectCard({ subject, onMark, onDelete }) {
  const pct = subject.attendance_percentage || 0;
  const statusColor = pct >= 75 ? "text-success-600" : pct >= 65 ? "text-warning-600" : "text-danger-600";
  const statusBg = pct >= 75 ? "bg-success-50" : pct >= 65 ? "bg-warning-50" : "bg-danger-50";

  return (
    <div className="card-padded group hover:shadow-card-hover transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-surface-800 truncate">{subject.subject_name}</h4>
          <div className="flex items-center gap-2 mt-0.5">
            {subject.subject_code && (
              <span className="text-xs text-surface-400">{subject.subject_code}</span>
            )}
            <span className="text-xs text-surface-400">Sem {subject.semester}</span>
          </div>
        </div>
        <div className={`px-2.5 py-1 rounded-lg ${statusBg}`}>
          <span className={`text-lg font-bold tabular-nums ${statusColor}`}>{pct}%</span>
        </div>
      </div>

      <AttendanceBar percentage={pct} required={parseFloat(subject.required_percentage) || 75} />

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-3 text-xs text-surface-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success-400" />
            {subject.attended_classes} attended
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-danger-400" />
            {subject.missed_classes} missed
          </span>
          <span>/ {subject.total_classes} total</span>
        </div>
      </div>

      {/* Shortage info */}
      {subject.is_shortage && (
        <div className="mt-3 p-2.5 rounded-lg bg-danger-50 border border-danger-100">
          <p className="text-xs text-danger-700 font-medium">
            ⚠️ Shortage! Need {subject.classes_needed_75} more classes to reach 75%
          </p>
        </div>
      )}

      {/* Safe to miss info */}
      {!subject.is_shortage && subject.classes_can_miss > 0 && (
        <div className="mt-3 p-2.5 rounded-lg bg-success-50 border border-success-100">
          <p className="text-xs text-success-700 font-medium">
            ✓ Safe — can miss {subject.classes_can_miss} more class{subject.classes_can_miss > 1 ? "es" : ""}
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-100">
        <button
          onClick={() => onMark(subject.id, true)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-success-700 bg-success-50 hover:bg-success-100 rounded-lg transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Present
        </button>
        <button
          onClick={() => onMark(subject.id, false)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-danger-700 bg-danger-50 hover:bg-danger-100 rounded-lg transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          Absent
        </button>
        <button
          onClick={() => onDelete(subject.id)}
          className="p-1.5 text-surface-300 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
          title="Remove subject"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── Add Subject Modal ────────────────────────────────────────────────────────
function AddSubjectModal({ isOpen, onClose, onAdd }) {
  const [form, setForm] = useState({
    subject_name: "",
    subject_code: "",
    semester: "",
    total_classes: "",
    attended_classes: "",
    required_percentage: "75",
  });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject_name || !form.semester) {
      toast.error("Subject name and semester are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        subject_name: form.subject_name.trim(),
        subject_code: form.subject_code.trim(),
        semester: parseInt(form.semester),
        total_classes: parseInt(form.total_classes) || 0,
        attended_classes: parseInt(form.attended_classes) || 0,
        required_percentage: parseFloat(form.required_percentage) || 75,
      };
      await onAdd(payload);
      setForm({ subject_name: "", subject_code: "", semester: "", total_classes: "", attended_classes: "", required_percentage: "75" });
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.errors?.non_field_errors?.[0] || "Failed to add subject");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-surface-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-float w-full max-w-md p-6 animate-fade-up">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Add Subject</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Subject Name *</label>
            <input type="text" value={form.subject_name} onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none"
              placeholder="e.g., Data Structures" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Subject Code</label>
              <input type="text" value={form.subject_code} onChange={(e) => setForm({ ...form, subject_code: e.target.value })}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none"
                placeholder="CS301" />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Semester *</label>
              <select value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none">
                <option value="">Select</option>
                {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Total Classes</label>
              <input type="number" min="0" value={form.total_classes} onChange={(e) => setForm({ ...form, total_classes: e.target.value })}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none"
                placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Attended</label>
              <input type="number" min="0" value={form.attended_classes} onChange={(e) => setForm({ ...form, attended_classes: e.target.value })}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none"
                placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Required %</label>
              <input type="number" min="0" max="100" value={form.required_percentage} onChange={(e) => setForm({ ...form, required_percentage: e.target.value })}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none"
                placeholder="75" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50">
              {submitting ? "Adding..." : "Add Subject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const { user } = useSelector((s) => s.auth);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [semesterFilter, setSemesterFilter] = useState("");
  const [overview, setOverview] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      if (semesterFilter) params.semester = semesterFilter;

      const [listRes, overviewRes] = await Promise.allSettled([
        api.get("/attendance/", { params }),
        api.get("/attendance/overview", { params }),
      ]);

      if (listRes.status === "fulfilled") {
        const data = listRes.value.data;
        const items = data?.data?.subjects || data?.data || data?.results || (Array.isArray(data) ? data : []);
        setSubjects(items);
      }

      if (overviewRes.status === "fulfilled") {
        setOverview(overviewRes.value.data?.data || null);
      }
    } catch (err) {
      console.error("Failed to fetch attendance:", err);
    } finally {
      setLoading(false);
    }
  }, [semesterFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMark = async (id, attended) => {
    try {
      const res = await api.post(`/attendance/${id}/mark`, { attended });
      if (res.data?.success) {
        toast.success(attended ? "Marked present" : "Marked absent");
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to mark attendance");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this subject from tracking?")) return;
    try {
      await api.delete(`/attendance/${id}`);
      toast.success("Subject removed");
      fetchData();
    } catch (err) {
      toast.error("Failed to remove subject");
    }
  };

  const handleAdd = async (payload) => {
    const res = await api.post("/attendance/create", payload);
    if (res.data?.success) {
      toast.success("Subject added");
      fetchData();
    }
  };

  // Calculate summary from subjects
  const totalAttended = subjects.reduce((s, sub) => s + (sub.attended_classes || 0), 0);
  const totalClasses = subjects.reduce((s, sub) => s + (sub.total_classes || 0), 0);
  const overallPct = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;
  const shortageCount = subjects.filter((s) => s.is_shortage).length;

  // Get unique semesters
  const semesters = [...new Set(subjects.map((s) => s.semester))].sort();

  if (loading) {
    return (
      <div className="page-container space-y-6">
        <div className="skeleton h-12 w-48 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">Track your class attendance across subjects</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Subject
        </button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-padded text-center">
          <p className={`text-2xl font-bold tabular-nums ${overallPct >= 75 ? "text-success-600" : overallPct >= 60 ? "text-warning-600" : "text-danger-600"}`}>
            {overallPct}%
          </p>
          <p className="text-xs text-surface-500 mt-1">Overall Attendance</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-surface-900 tabular-nums">{subjects.length}</p>
          <p className="text-xs text-surface-500 mt-1">Subjects</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-success-600 tabular-nums">{totalAttended}</p>
          <p className="text-xs text-surface-500 mt-1">Classes Attended</p>
        </div>
        <div className="card-padded text-center">
          <p className={`text-2xl font-bold tabular-nums ${shortageCount > 0 ? "text-danger-600" : "text-surface-900"}`}>
            {shortageCount}
          </p>
          <p className="text-xs text-surface-500 mt-1">Below Required</p>
        </div>
      </div>

      {/* Semester Filter */}
      {semesters.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-surface-500">Filter:</span>
          <div className="flex bg-surface-100 rounded-lg p-0.5">
            <button
              onClick={() => setSemesterFilter("")}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${!semesterFilter ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"}`}
            >
              All
            </button>
            {semesters.map((sem) => (
              <button
                key={sem}
                onClick={() => setSemesterFilter(String(sem))}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${semesterFilter === String(sem) ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"}`}
              >
                Sem {sem}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Subject Cards */}
      {subjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
          </div>
          <p className="text-base font-medium text-surface-700">No subjects tracked yet</p>
          <p className="text-sm text-surface-400 mt-1 mb-4">Add your subjects to start tracking attendance</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Your First Subject
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {subjects.map((subject) => (
            <SubjectCard
              key={subject.id}
              subject={subject}
              onMark={handleMark}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Low Attendance Alert */}
      {shortageCount > 0 && (
        <div className="p-4 rounded-xl bg-danger-50 border border-danger-100">
          <div className="flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <h4 className="text-sm font-semibold text-danger-800">Low Attendance Alert</h4>
              <p className="text-xs text-danger-600 mt-1">
                You have {shortageCount} subject{shortageCount > 1 ? "s" : ""} below the required attendance percentage.
                Attend all upcoming classes to improve your standing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      <AddSubjectModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAdd}
      />
    </div>
  );
}
