import { useState, useEffect } from "react";
import cgpaService from "../../services/cgpaService";

export default function WeakSubjectsTab() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [weakRes, historyRes] = await Promise.all([
        cgpaService.getWeakSubjects(),
        cgpaService.getHistory(),
      ]);
      setData(weakRes.data?.data || weakRes.data);
      setHistory(historyRes.data?.data || historyRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-surface-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const weakSubjects = data?.weak_subjects || [];
  const criticalCount = data?.critical_count || 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-xs text-surface-500">Total Weak Subjects</p>
          <p className="text-2xl font-bold text-surface-800">{weakSubjects.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-xs text-red-500">Critical (Backlogs)</p>
          <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-xs text-amber-500">Needs Improvement</p>
          <p className="text-2xl font-bold text-amber-600">{weakSubjects.length - criticalCount}</p>
        </div>
      </div>

      {/* Weak Subjects List */}
      {weakSubjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-surface-200">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-50 flex items-center justify-center">
            <svg className="w-7 h-7 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-surface-700 font-medium">All subjects are on track</p>
          <p className="text-sm text-surface-400 mt-1">No weak subjects detected. Keep up the good work.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-surface-700">Subjects Needing Attention</h3>
          {weakSubjects.map((sub, i) => (
            <div
              key={i}
              className={`bg-white rounded-xl border p-4 ${
                sub.severity === "critical" ? "border-red-200" : "border-amber-200"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    sub.severity === "critical" ? "bg-red-500" : "bg-amber-500"
                  }`} />
                  <div>
                    <h4 className="text-sm font-semibold text-surface-800">{sub.subject_name}</h4>
                    <p className="text-xs text-surface-500">
                      {sub.subject_code && `${sub.subject_code} · `}
                      Semester {sub.semester} · {sub.credits} credits
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                    sub.severity === "critical"
                      ? "bg-red-100 text-red-700"
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {sub.grade} ({sub.grade_points} pts)
                  </span>
                </div>
              </div>

              {/* Issues */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {sub.issues.map((issue, j) => (
                  <span key={j} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-surface-100 text-surface-600">
                    {formatIssue(issue)}
                  </span>
                ))}
              </div>

              {/* Suggestions */}
              {sub.suggestions && sub.suggestions.length > 0 && (
                <div className="mt-3 pt-2 border-t border-surface-100">
                  <p className="text-[10px] font-medium text-surface-500 mb-1">Suggestions</p>
                  <ul className="space-y-0.5">
                    {sub.suggestions.map((s, j) => (
                      <li key={j} className="text-xs text-surface-600 flex items-start gap-1.5">
                        <span className="text-primary-500 mt-0.5">•</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Marks info */}
              {sub.total_marks !== null && (
                <div className="mt-2 text-xs text-surface-500">
                  Total Marks: <span className="font-medium text-surface-700">{sub.total_marks}/100</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Academic History Toggle */}
      <div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <svg className={`w-4 h-4 transition-transform ${showHistory ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 9l-7 7-7-7" />
          </svg>
          Academic History ({history.length} entries)
        </button>

        {showHistory && history.length > 0 && (
          <div className="mt-3 bg-white rounded-xl border border-surface-200 overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-50">
                  <tr className="text-left text-xs text-surface-500 border-b border-surface-100">
                    <th className="px-4 py-2 font-medium">Action</th>
                    <th className="px-4 py-2 font-medium">CGPA</th>
                    <th className="px-4 py-2 font-medium">Credits</th>
                    <th className="px-4 py-2 font-medium">Semesters</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry, i) => (
                    <tr key={i} className="border-b border-surface-50 last:border-0">
                      <td className="px-4 py-2">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-medium ${getActionColor(entry.action)}`}>
                          {formatAction(entry.action)}
                        </span>
                      </td>
                      <td className="px-4 py-2 tabular-nums font-medium">{entry.cgpa_at_time}</td>
                      <td className="px-4 py-2 tabular-nums">{entry.total_credits_at_time}</td>
                      <td className="px-4 py-2 tabular-nums">{entry.total_semesters_at_time}</td>
                      <td className="px-4 py-2 text-surface-500 text-xs">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatIssue(issue) {
  const map = {
    low_grade: "Low Grade",
    backlog: "Backlog",
    low_marks: "Low Marks",
    low_attendance: "Low Attendance",
  };
  return map[issue] || issue;
}

function formatAction(action) {
  const map = {
    semester_added: "Added",
    semester_updated: "Updated",
    semester_deleted: "Deleted",
    bulk_save: "Bulk Save",
  };
  return map[action] || action;
}

function getActionColor(action) {
  const map = {
    semester_added: "bg-green-100 text-green-700",
    semester_updated: "bg-blue-100 text-blue-700",
    semester_deleted: "bg-red-100 text-red-700",
    bulk_save: "bg-purple-100 text-purple-700",
  };
  return map[action] || "bg-surface-100 text-surface-700";
}
