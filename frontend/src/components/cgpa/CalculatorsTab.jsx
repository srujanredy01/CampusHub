import { useState } from "react";
import cgpaService from "../../services/cgpaService";
import { toast } from "react-toastify";

const GRADE_OPTIONS = ["O", "A+", "A", "B+", "B", "C", "P", "F"];
const GRADE_POINTS = { O: 10, "A+": 9, A: 8, "B+": 7, B: 6, C: 5, P: 4, F: 0 };

export default function CalculatorsTab({ profile }) {
  const [activeCalc, setActiveCalc] = useState("cgpa");

  return (
    <div className="space-y-6">
      {/* Calculator Selector */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "cgpa", label: "CGPA Calculator" },
          { id: "sgpa", label: "SGPA Calculator" },
          { id: "grade", label: "Grade Predictor" },
          { id: "target", label: "Target Predictor" },
        ].map((calc) => (
          <button
            key={calc.id}
            onClick={() => setActiveCalc(calc.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeCalc === calc.id
                ? "bg-primary-600 text-white"
                : "bg-surface-100 text-surface-600 hover:bg-surface-200"
            }`}
          >
            {calc.label}
          </button>
        ))}
      </div>

      {/* Calculator Content */}
      {activeCalc === "cgpa" && <CGPACalculator />}
      {activeCalc === "sgpa" && <SGPACalculator />}
      {activeCalc === "grade" && <GradePredictor profile={profile} />}
      {activeCalc === "target" && <TargetPredictor profile={profile} />}
    </div>
  );
}

// ── CGPA Calculator ───────────────────────────────────────────────────────────

function CGPACalculator() {
  const [semesters, setSemesters] = useState([
    { sgpa: "", credits: "" },
    { sgpa: "", credits: "" },
  ]);

  const addSemester = () => setSemesters([...semesters, { sgpa: "", credits: "" }]);
  const removeSemester = (idx) => {
    if (semesters.length <= 1) return;
    setSemesters(semesters.filter((_, i) => i !== idx));
  };

  const updateSemester = (idx, field, value) => {
    const updated = [...semesters];
    updated[idx] = { ...updated[idx], [field]: value };
    setSemesters(updated);
  };

  // Live calculation
  const result = (() => {
    let totalCredits = 0;
    let weighted = 0;
    for (const sem of semesters) {
      const sgpa = parseFloat(sem.sgpa);
      const credits = parseInt(sem.credits);
      if (!isNaN(sgpa) && !isNaN(credits) && credits > 0) {
        totalCredits += credits;
        weighted += sgpa * credits;
      }
    }
    return {
      cgpa: totalCredits > 0 ? (weighted / totalCredits).toFixed(2) : "0.00",
      totalCredits,
      percentage: totalCredits > 0 ? (((weighted / totalCredits) - 0.75) * 10).toFixed(1) : "0.0",
    };
  })();

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-surface-800">CGPA Calculator</h3>
          <p className="text-xs text-surface-500 mt-0.5">Enter SGPA and credits for each semester</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-primary-600 tabular-nums">{result.cgpa}</p>
          <p className="text-xs text-surface-400">≈ {result.percentage}%</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {semesters.map((sem, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <span className="text-xs text-surface-400 w-12">Sem {idx + 1}</span>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              placeholder="SGPA"
              value={sem.sgpa}
              onChange={(e) => updateSemester(idx, "sgpa", e.target.value)}
              className="flex-1 px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="number"
              min="1"
              max="40"
              placeholder="Credits"
              value={sem.credits}
              onChange={(e) => updateSemester(idx, "credits", e.target.value)}
              className="w-24 px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
            {semesters.length > 1 && (
              <button onClick={() => removeSemester(idx)} className="p-1 text-red-400 hover:text-red-600">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addSemester}
        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        + Add Semester
      </button>

      <div className="mt-4 p-3 bg-primary-50 rounded-lg">
        <p className="text-xs text-primary-700">
          <strong>Formula:</strong> CGPA = Σ(SGPA × Credits) ÷ Σ(Credits) = {result.cgpa}
        </p>
        <p className="text-xs text-primary-600 mt-1">
          Total Credits: {result.totalCredits}
        </p>
      </div>
    </div>
  );
}

// ── SGPA Calculator ───────────────────────────────────────────────────────────

function SGPACalculator() {
  const [subjects, setSubjects] = useState([
    { name: "", credits: 3, grade: "O" },
    { name: "", credits: 3, grade: "O" },
    { name: "", credits: 3, grade: "O" },
  ]);

  const addSubject = () => setSubjects([...subjects, { name: "", credits: 3, grade: "O" }]);
  const removeSubject = (idx) => {
    if (subjects.length <= 1) return;
    setSubjects(subjects.filter((_, i) => i !== idx));
  };

  const updateSubject = (idx, field, value) => {
    const updated = [...subjects];
    updated[idx] = { ...updated[idx], [field]: value };
    setSubjects(updated);
  };

  // Live calculation
  const result = (() => {
    let totalCredits = 0;
    let weighted = 0;
    for (const sub of subjects) {
      const credits = parseInt(sub.credits);
      if (!isNaN(credits) && credits > 0 && sub.grade) {
        totalCredits += credits;
        weighted += credits * (GRADE_POINTS[sub.grade] || 0);
      }
    }
    return {
      sgpa: totalCredits > 0 ? (weighted / totalCredits).toFixed(2) : "0.00",
      totalCredits,
      totalPoints: weighted,
    };
  })();

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-surface-800">SGPA Calculator</h3>
          <p className="text-xs text-surface-500 mt-0.5">Enter subjects, credits, and grades for one semester</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-primary-600 tabular-nums">{result.sgpa}</p>
          <p className="text-xs text-surface-400">{result.totalCredits} credits</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {subjects.map((sub, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Subject name"
              value={sub.name}
              onChange={(e) => updateSubject(idx, "name", e.target.value)}
              className="flex-1 px-3 py-2 border border-surface-300 rounded-lg text-sm"
            />
            <input
              type="number"
              min="1"
              max="10"
              value={sub.credits}
              onChange={(e) => updateSubject(idx, "credits", e.target.value)}
              className="w-20 px-3 py-2 border border-surface-300 rounded-lg text-sm text-center"
            />
            <select
              value={sub.grade}
              onChange={(e) => updateSubject(idx, "grade", e.target.value)}
              className="w-24 px-2 py-2 border border-surface-300 rounded-lg text-sm"
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>{g} ({GRADE_POINTS[g]})</option>
              ))}
            </select>
            {subjects.length > 1 && (
              <button onClick={() => removeSubject(idx)} className="p-1 text-red-400 hover:text-red-600">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addSubject}
        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        + Add Subject
      </button>

      <div className="mt-4 p-3 bg-primary-50 rounded-lg">
        <p className="text-xs text-primary-700">
          <strong>Formula:</strong> SGPA = Σ(Grade Points × Credits) ÷ Σ(Credits) = {result.totalPoints} ÷ {result.totalCredits} = {result.sgpa}
        </p>
      </div>
    </div>
  );
}

// ── Grade Predictor ───────────────────────────────────────────────────────────

function GradePredictor({ profile }) {
  const [form, setForm] = useState({
    internal_marks: "",
    assignment_marks: "",
    attendance_marks: "",
    mid_exam_marks: "",
    lab_marks: "",
    project_marks: "",
    expected_final_marks: "",
    credits: 3,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const payload = {};
      Object.entries(form).forEach(([key, val]) => {
        if (val !== "" && val !== null) {
          payload[key] = Number(val);
        }
      });
      const res = await cgpaService.predictGrade(payload);
      setResult(res.data?.data || res.data);
    } catch (err) {
      toast.error("Prediction failed. Enter at least one component mark.");
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: "internal_marks", label: "Internal Marks", placeholder: "0-100" },
    { key: "assignment_marks", label: "Assignment Marks", placeholder: "0-100" },
    { key: "mid_exam_marks", label: "Mid Exam Marks", placeholder: "0-100" },
    { key: "lab_marks", label: "Lab Marks", placeholder: "0-100" },
    { key: "project_marks", label: "Project Marks", placeholder: "0-100" },
    { key: "attendance_marks", label: "Attendance Marks", placeholder: "0-100" },
    { key: "expected_final_marks", label: "Expected Final Exam", placeholder: "0-100" },
  ];

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <h3 className="text-base font-semibold text-surface-800 mb-1">Grade Predictor</h3>
      <p className="text-xs text-surface-500 mb-4">
        Enter your component marks to predict your final grade and CGPA impact
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-[10px] text-surface-500 mb-0.5">{f.label}</label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder={f.placeholder}
              value={form[f.key]}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>
        ))}
        <div>
          <label className="block text-[10px] text-surface-500 mb-0.5">Credits</label>
          <input
            type="number"
            min="1"
            max="10"
            value={form.credits}
            onChange={(e) => setForm({ ...form, credits: e.target.value })}
            className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <button
        onClick={handlePredict}
        disabled={loading}
        className="px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Predicting..." : "Predict Grade"}
      </button>

      {result && (
        <div className="mt-5 p-4 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-surface-500">Predicted Grade</p>
              <p className="text-2xl font-bold text-primary-700">{result.predicted_grade}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Percentage</p>
              <p className="text-2xl font-bold text-surface-800">{result.predicted_percentage}%</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Grade Points</p>
              <p className="text-2xl font-bold text-surface-800">{result.predicted_grade_point}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">CGPA Impact</p>
              <p className="text-2xl font-bold text-emerald-600">{result.predicted_cgpa_impact}</p>
            </div>
          </div>

          {result.breakdown && result.breakdown.length > 0 && (
            <div className="mt-4 pt-3 border-t border-primary-200">
              <p className="text-xs font-medium text-surface-600 mb-2">Component Breakdown</p>
              <div className="space-y-1">
                {result.breakdown.map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-surface-600 capitalize">{b.component.replace(/_/g, " ")}</span>
                    <span className="tabular-nums text-surface-800">
                      {b.marks}/100 × {b.weightage}% = {b.weighted_score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Target Predictor ──────────────────────────────────────────────────────────

function TargetPredictor({ profile }) {
  const [form, setForm] = useState({
    target_cgpa: "8.5",
    remaining_semesters: "2",
    avg_credits_per_semester: "20",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePredict = async () => {
    setLoading(true);
    try {
      const payload = {
        target_cgpa: parseFloat(form.target_cgpa),
        remaining_semesters: parseInt(form.remaining_semesters),
        avg_credits_per_semester: parseInt(form.avg_credits_per_semester),
      };
      const res = await cgpaService.predictTarget(payload);
      setResult(res.data?.data || res.data);
    } catch (err) {
      toast.error("Prediction failed. Check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-surface-200 p-6">
      <h3 className="text-base font-semibold text-surface-800 mb-1">Target CGPA Predictor</h3>
      <p className="text-xs text-surface-500 mb-4">
        Find out what SGPA you need in remaining semesters to achieve your target CGPA
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-xs font-medium text-surface-600 mb-1">Target CGPA</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={form.target_cgpa}
            onChange={(e) => setForm({ ...form, target_cgpa: e.target.value })}
            className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-600 mb-1">Remaining Semesters</label>
          <input
            type="number"
            min="1"
            max="12"
            value={form.remaining_semesters}
            onChange={(e) => setForm({ ...form, remaining_semesters: e.target.value })}
            className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-600 mb-1">Avg Credits/Semester</label>
          <input
            type="number"
            min="1"
            max="40"
            value={form.avg_credits_per_semester}
            onChange={(e) => setForm({ ...form, avg_credits_per_semester: e.target.value })}
            className="w-full px-3 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <button
        onClick={handlePredict}
        disabled={loading}
        className="px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Calculating..." : "Calculate Required SGPA"}
      </button>

      {result && (
        <div className="mt-5 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-surface-500">Current CGPA</p>
              <p className="text-xl font-bold text-surface-800">{result.current_cgpa}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Target CGPA</p>
              <p className="text-xl font-bold text-emerald-700">{result.target_cgpa}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Required Avg SGPA</p>
              <p className="text-xl font-bold text-primary-700">{result.required_avg_sgpa}</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Difficulty</p>
              <p className={`text-xl font-bold ${getDifficultyColor(result.difficulty)}`}>
                {capitalize(result.difficulty)}
              </p>
            </div>
          </div>

          {!result.is_possible && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-3">
              <p className="text-xs text-red-700 font-medium">
                This target is not achievable with the given parameters. Consider adjusting your target or remaining semesters.
              </p>
            </div>
          )}

          {result.semester_plan && result.semester_plan.length > 0 && (
            <div className="pt-3 border-t border-emerald-200">
              <p className="text-xs font-medium text-surface-600 mb-2">Semester Plan</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {result.semester_plan.map((plan, i) => (
                  <div key={i} className="p-2 bg-white rounded-lg border border-surface-200 text-center">
                    <p className="text-[10px] text-surface-400">Sem {plan.semester}</p>
                    <p className="text-sm font-bold text-primary-600">{plan.required_sgpa}</p>
                    <p className="text-[10px] text-surface-400">{plan.credits} cr</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getDifficultyColor(difficulty) {
  const map = {
    easy: "text-green-600",
    moderate: "text-yellow-600",
    hard: "text-orange-600",
    impossible: "text-red-600",
  };
  return map[difficulty] || "text-surface-600";
}
