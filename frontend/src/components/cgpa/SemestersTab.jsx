import { useState, useEffect } from "react";
import cgpaService from "../../services/cgpaService";
import { toast } from "react-toastify";

const GRADE_OPTIONS = ["O", "A+", "A", "B+", "B", "C", "P", "F"];
const GRADE_POINTS = { O: 10, "A+": 9, A: 8, "B+": 7, B: 6, C: 5, P: 4, F: 0 };

export default function SemestersTab({ profile, onRefresh }) {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSemester, setEditingSemester] = useState(null);
  const [expandedSem, setExpandedSem] = useState(null);

  useEffect(() => {
    loadSemesters();
  }, []);

  const loadSemesters = async () => {
    try {
      const res = await cgpaService.getSemesters();
      setSemesters(res.data?.data || res.data?.results || res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this semester? This cannot be undone.")) return;
    try {
      await cgpaService.deleteSemester(id);
      toast.success("Semester deleted");
      loadSemesters();
      onRefresh();
    } catch (err) {
      toast.error("Failed to delete semester");
    }
  };

  const handleEdit = (sem) => {
    setEditingSemester(sem);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-surface-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Semester Button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-surface-500">
          {semesters.length} semester{semesters.length !== 1 ? "s" : ""} recorded
        </p>
        <button
          onClick={() => { setEditingSemester(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 5v14m-7-7h14" />
          </svg>
          Add Semester
        </button>
      </div>

      {/* Semester Form Modal */}
      {showForm && (
        <SemesterForm
          semester={editingSemester}
          existingSemesters={semesters.map((s) => s.semester)}
          onClose={() => { setShowForm(false); setEditingSemester(null); }}
          onSaved={() => { setShowForm(false); setEditingSemester(null); loadSemesters(); onRefresh(); }}
        />
      )}

      {/* Semester Cards */}
      {semesters.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-surface-200">
          <p className="text-surface-500">No semesters added yet. Click "Add Semester" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {semesters.map((sem) => (
            <div key={sem.id} className="bg-white rounded-xl border border-surface-200 overflow-hidden">
              {/* Semester Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-50 transition-colors"
                onClick={() => setExpandedSem(expandedSem === sem.id ? null : sem.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary-700">{sem.semester}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-surface-800">
                      {sem.semester_name || `Semester ${sem.semester}`}
                    </h4>
                    <p className="text-xs text-surface-500">
                      {sem.total_subjects} subjects · {sem.total_credits} credits
                      {sem.academic_year && ` · ${sem.academic_year}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-600 tabular-nums">
                      {Number(sem.sgpa).toFixed(2)}
                    </p>
                    <p className="text-xs text-surface-400">SGPA</p>
                  </div>
                  {sem.failed_subjects > 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                      {sem.failed_subjects} backlog{sem.failed_subjects > 1 ? "s" : ""}
                    </span>
                  )}
                  <svg
                    className={`w-5 h-5 text-surface-400 transition-transform ${expandedSem === sem.id ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded Subject Details */}
              {expandedSem === sem.id && (
                <div className="border-t border-surface-100 p-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-surface-500 border-b border-surface-100">
                          <th className="pb-2 font-medium">Subject</th>
                          <th className="pb-2 font-medium">Code</th>
                          <th className="pb-2 font-medium text-center">Credits</th>
                          <th className="pb-2 font-medium text-center">Grade</th>
                          <th className="pb-2 font-medium text-center">Points</th>
                          <th className="pb-2 font-medium text-center">Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(sem.subjects || []).map((sub, i) => (
                          <tr key={i} className="border-b border-surface-50 last:border-0">
                            <td className="py-2 text-surface-800 font-medium">{sub.subject_name}</td>
                            <td className="py-2 text-surface-500">{sub.subject_code || "—"}</td>
                            <td className="py-2 text-center">{sub.credits}</td>
                            <td className="py-2 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${getGradeColor(sub.grade)}`}>
                                {sub.grade}
                              </span>
                            </td>
                            <td className="py-2 text-center tabular-nums">{sub.grade_points}</td>
                            <td className="py-2 text-center tabular-nums text-surface-500">
                              {sub.total_marks ? Number(sub.total_marks).toFixed(0) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t border-surface-100">
                    <button
                      onClick={() => handleEdit(sem)}
                      className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(sem.id)}
                      className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Semester Form ─────────────────────────────────────────────────────────────

function SemesterForm({ semester, existingSemesters, onClose, onSaved }) {
  const [semesterNum, setSemesterNum] = useState(semester?.semester || "");
  const [semesterName, setSemesterName] = useState(semester?.semester_name || "");
  const [academicYear, setAcademicYear] = useState(semester?.academic_year || "");
  const [subjects, setSubjects] = useState(
    semester?.subjects?.map((s) => ({
      subject_name: s.subject_name,
      subject_code: s.subject_code || "",
      credits: s.credits,
      grade: s.grade,
      internal_marks: s.internal_marks || "",
      external_marks: s.external_marks || "",
    })) || [{ subject_name: "", subject_code: "", credits: 3, grade: "O", internal_marks: "", external_marks: "" }]
  );
  const [saving, setSaving] = useState(false);

  // Live SGPA calculation
  const calculatedSGPA = (() => {
    let totalCredits = 0;
    let weighted = 0;
    for (const sub of subjects) {
      if (sub.subject_name && sub.credits && sub.grade) {
        const cr = Number(sub.credits);
        totalCredits += cr;
        weighted += cr * (GRADE_POINTS[sub.grade] || 0);
      }
    }
    return totalCredits > 0 ? (weighted / totalCredits).toFixed(2) : "0.00";
  })();

  const addSubject = () => {
    setSubjects([...subjects, { subject_name: "", subject_code: "", credits: 3, grade: "O", internal_marks: "", external_marks: "" }]);
  };

  const removeSubject = (idx) => {
    if (subjects.length <= 1) return;
    setSubjects(subjects.filter((_, i) => i !== idx));
  };

  const updateSubject = (idx, field, value) => {
    const updated = [...subjects];
    updated[idx] = { ...updated[idx], [field]: value };
    setSubjects(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!semesterNum) { toast.error("Semester number is required"); return; }
    if (subjects.some((s) => !s.subject_name.trim())) { toast.error("All subjects need a name"); return; }

    setSaving(true);
    try {
      const payload = {
        semester: Number(semesterNum),
        semester_name: semesterName || `Semester ${semesterNum}`,
        academic_year: academicYear,
        subjects: subjects.map((s) => ({
          subject_name: s.subject_name.trim(),
          subject_code: s.subject_code.trim(),
          credits: Number(s.credits),
          grade: s.grade,
          internal_marks: s.internal_marks ? Number(s.internal_marks) : null,
          external_marks: s.external_marks ? Number(s.external_marks) : null,
        })),
      };

      if (semester?.id) {
        await cgpaService.updateSemester(semester.id, payload);
        toast.success("Semester updated");
      } else {
        await cgpaService.saveSemester(payload);
        toast.success("Semester added");
      }
      onSaved();
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.errors || "Failed to save";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-surface-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="text-lg font-semibold text-surface-900">
              {semester ? "Edit Semester" : "Add Semester"}
            </h3>
            <p className="text-xs text-surface-500 mt-0.5">
              Predicted SGPA: <span className="font-bold text-primary-600">{calculatedSGPA}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-100 text-surface-400">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Semester Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Semester Number *</label>
              <input
                type="number"
                min="1"
                max="12"
                value={semesterNum}
                onChange={(e) => setSemesterNum(e.target.value)}
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Semester Name</label>
              <input
                type="text"
                value={semesterName}
                onChange={(e) => setSemesterName(e.target.value)}
                placeholder="e.g. Fall 2024"
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Academic Year</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2024-25"
                className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Subjects */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-surface-700">Subjects</label>
              <button
                type="button"
                onClick={addSubject}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                + Add Subject
              </button>
            </div>

            <div className="space-y-3">
              {subjects.map((sub, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-surface-50 rounded-lg">
                  <div className="col-span-12 sm:col-span-3">
                    <label className="block text-[10px] text-surface-500 mb-0.5">Subject Name *</label>
                    <input
                      type="text"
                      value={sub.subject_name}
                      onChange={(e) => updateSubject(idx, "subject_name", e.target.value)}
                      className="w-full px-2 py-1.5 border border-surface-300 rounded text-sm"
                      placeholder="Data Structures"
                      required
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-[10px] text-surface-500 mb-0.5">Code</label>
                    <input
                      type="text"
                      value={sub.subject_code}
                      onChange={(e) => updateSubject(idx, "subject_code", e.target.value)}
                      className="w-full px-2 py-1.5 border border-surface-300 rounded text-sm"
                      placeholder="CS301"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <label className="block text-[10px] text-surface-500 mb-0.5">Credits</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={sub.credits}
                      onChange={(e) => updateSubject(idx, "credits", e.target.value)}
                      className="w-full px-2 py-1.5 border border-surface-300 rounded text-sm"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <label className="block text-[10px] text-surface-500 mb-0.5">Grade</label>
                    <select
                      value={sub.grade}
                      onChange={(e) => updateSubject(idx, "grade", e.target.value)}
                      className="w-full px-2 py-1.5 border border-surface-300 rounded text-sm"
                    >
                      {GRADE_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g} ({GRADE_POINTS[g]})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-4 sm:col-span-1">
                    <label className="block text-[10px] text-surface-500 mb-0.5">Internal</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={sub.internal_marks}
                      onChange={(e) => updateSubject(idx, "internal_marks", e.target.value)}
                      className="w-full px-2 py-1.5 border border-surface-300 rounded text-sm"
                    />
                  </div>
                  <div className="col-span-4 sm:col-span-1">
                    <label className="block text-[10px] text-surface-500 mb-0.5">External</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={sub.external_marks}
                      onChange={(e) => updateSubject(idx, "external_marks", e.target.value)}
                      className="w-full px-2 py-1.5 border border-surface-300 rounded text-sm"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-2 flex items-end gap-1">
                    <span className="text-xs font-bold text-primary-600 tabular-nums py-1.5">
                      {GRADE_POINTS[sub.grade] || 0} pts
                    </span>
                    {subjects.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSubject(idx)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 rounded-lg hover:bg-surface-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : semester ? "Update Semester" : "Save Semester"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGradeColor(grade) {
  const map = {
    O: "bg-emerald-100 text-emerald-800",
    "A+": "bg-green-100 text-green-800",
    A: "bg-blue-100 text-blue-800",
    "B+": "bg-sky-100 text-sky-800",
    B: "bg-yellow-100 text-yellow-800",
    C: "bg-orange-100 text-orange-800",
    P: "bg-amber-100 text-amber-800",
    F: "bg-red-100 text-red-800",
  };
  return map[grade] || "bg-surface-100 text-surface-800";
}
