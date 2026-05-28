import { useMemo } from "react";

export default function AnalyticsTab({ analytics, profile }) {
  const semesterSeries = analytics?.semester_sgpa_series || [];
  const cgpaProgress = analytics?.cgpa_progress_series || [];
  const gradeDistribution = analytics?.grade_distribution || {};
  const subjectPerformance = analytics?.subject_performance || [];
  const attendanceCorrelation = analytics?.attendance_correlation || [];
  const insights = analytics?.insights || {};

  const gradeData = useMemo(() => {
    return Object.entries(gradeDistribution)
      .filter(([_, count]) => count > 0)
      .map(([grade, count]) => ({ grade, count }));
  }, [gradeDistribution]);

  const totalGrades = gradeData.reduce((sum, d) => sum + d.count, 0);

  if (!analytics || semesterSeries.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-surface-200">
        <p className="text-surface-500">Add semester data to see analytics and performance trends.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SGPA Trend Chart */}
      <div className="bg-white rounded-xl border border-surface-200 p-5">
        <h3 className="text-sm font-semibold text-surface-700 mb-1">Semester Performance Trend</h3>
        <p className="text-xs text-surface-400 mb-4">SGPA and cumulative CGPA across semesters</p>
        <DualLineChart sgpaData={semesterSeries} cgpaData={cgpaProgress} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-4">Grade Distribution</h3>
          {gradeData.length > 0 ? (
            <div className="space-y-2">
              {gradeData.map(({ grade, count }) => (
                <div key={grade} className="flex items-center gap-3">
                  <span className={`w-8 text-center text-xs font-bold rounded py-0.5 ${getGradeColor(grade)}`}>
                    {grade}
                  </span>
                  <div className="flex-1 h-5 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getGradeBarColor(grade)}`}
                      style={{ width: `${(count / totalGrades) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-surface-500 w-8 text-right tabular-nums">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-surface-400">No grade data available</p>
          )}
        </div>

        {/* Performance Insights */}
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-4">Performance Insights</h3>
          <div className="space-y-4">
            {insights.best_semester && (
              <InsightRow
                label="Best Semester"
                value={`Semester ${insights.best_semester.semester} — SGPA ${insights.best_semester.sgpa}`}
                icon="🏆"
              />
            )}
            {insights.worst_semester && (
              <InsightRow
                label="Needs Improvement"
                value={`Semester ${insights.worst_semester.semester} — SGPA ${insights.worst_semester.sgpa}`}
                icon="📉"
              />
            )}
            {insights.average_sgpa && (
              <InsightRow
                label="Average SGPA"
                value={insights.average_sgpa.toFixed(2)}
                icon="📊"
              />
            )}
            {insights.trend && (
              <InsightRow
                label="Current Trend"
                value={capitalize(insights.trend)}
                icon={insights.trend === "improving" ? "📈" : insights.trend === "declining" ? "⚠️" : "➡️"}
              />
            )}
            {profile?.improvement_percentage !== undefined && (
              <InsightRow
                label="Overall Improvement"
                value={`${profile.improvement_percentage}%`}
                icon={profile.improvement_percentage >= 0 ? "✅" : "❌"}
              />
            )}
          </div>
        </div>
      </div>

      {/* Attendance vs Performance Correlation */}
      {attendanceCorrelation.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-1">Attendance vs Performance</h3>
          <p className="text-xs text-surface-400 mb-4">How attendance correlates with grade points</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-surface-500 border-b border-surface-100">
                  <th className="pb-2 font-medium">Subject</th>
                  <th className="pb-2 font-medium text-center">Semester</th>
                  <th className="pb-2 font-medium text-center">Attendance</th>
                  <th className="pb-2 font-medium text-center">Grade Points</th>
                  <th className="pb-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceCorrelation.slice(0, 15).map((item, i) => (
                  <tr key={i} className="border-b border-surface-50 last:border-0">
                    <td className="py-2 text-surface-800">{item.subject}</td>
                    <td className="py-2 text-center text-surface-500">S{item.semester}</td>
                    <td className="py-2 text-center">
                      <span className={`text-xs font-medium ${item.attendance_pct >= 75 ? "text-green-600" : "text-red-600"}`}>
                        {item.attendance_pct}%
                      </span>
                    </td>
                    <td className="py-2 text-center tabular-nums font-medium">{item.grade_points}</td>
                    <td className="py-2 text-center">
                      {item.attendance_pct >= 75 && item.grade_points >= 7 ? (
                        <span className="text-xs text-green-600">Good</span>
                      ) : item.attendance_pct < 75 ? (
                        <span className="text-xs text-red-600">Low Attendance</span>
                      ) : (
                        <span className="text-xs text-orange-600">Needs Work</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subject Performance Heatmap */}
      {subjectPerformance.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-1">Subject Performance</h3>
          <p className="text-xs text-surface-400 mb-4">Grade points across all subjects</p>
          <div className="flex flex-wrap gap-2">
            {subjectPerformance.slice(0, 30).map((sub, i) => (
              <div
                key={i}
                className={`px-3 py-2 rounded-lg border text-xs ${getSubjectBg(sub.grade_points)}`}
                title={`S${sub.semester} — ${sub.grade} (${sub.grade_points} pts)`}
              >
                <span className="font-medium">{sub.subject_name}</span>
                <span className="ml-2 opacity-70">{sub.grade}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Chart Component ───────────────────────────────────────────────────────────

function DualLineChart({ sgpaData, cgpaData }) {
  const allValues = [...sgpaData.map((d) => Number(d.sgpa)), ...cgpaData.map((d) => d.cgpa)];
  const max = Math.min(Math.max(...allValues) + 0.5, 10);
  const min = Math.max(Math.min(...allValues) - 0.5, 0);
  const range = max - min || 1;
  const width = 100;
  const height = 50;
  const pad = 5;

  const sgpaPoints = sgpaData.map((d, i) => {
    const x = pad + (i / (sgpaData.length - 1 || 1)) * (width - 2 * pad);
    const y = height - pad - ((Number(d.sgpa) - min) / range) * (height - 2 * pad);
    return { x, y, val: Number(d.sgpa) };
  });

  const cgpaPoints = cgpaData.map((d, i) => {
    const x = pad + (i / (cgpaData.length - 1 || 1)) * (width - 2 * pad);
    const y = height - pad - ((d.cgpa - min) / range) * (height - 2 * pad);
    return { x, y, val: d.cgpa };
  });

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48" preserveAspectRatio="none">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1={pad} y1={pad + pct * (height - 2 * pad)}
            x2={width - pad} y2={pad + pct * (height - 2 * pad)}
            stroke="#f3f4f6" strokeWidth="0.3"
          />
        ))}
        {/* CGPA line */}
        <polyline
          points={cgpaPoints.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none" stroke="#10b981" strokeWidth="1.2" strokeDasharray="2,1"
        />
        {/* SGPA line */}
        <polyline
          points={sgpaPoints.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none" stroke="#6366f1" strokeWidth="1.5"
        />
        {/* SGPA dots */}
        {sgpaPoints.map((p, i) => (
          <circle key={`s${i}`} cx={p.x} cy={p.y} r="1.5" fill="#6366f1" />
        ))}
        {/* CGPA dots */}
        {cgpaPoints.map((p, i) => (
          <circle key={`c${i}`} cx={p.x} cy={p.y} r="1.2" fill="#10b981" />
        ))}
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 justify-center">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-indigo-500 rounded" />
          <span className="text-xs text-surface-500">SGPA</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-emerald-500 rounded border-dashed" />
          <span className="text-xs text-surface-500">CGPA</span>
        </div>
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between px-2 mt-1">
        {sgpaData.map((d, i) => (
          <span key={i} className="text-[10px] text-surface-400">S{d.semester}</span>
        ))}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InsightRow({ label, value, icon }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-50">
      <span className="text-lg">{icon}</span>
      <div className="flex-1">
        <p className="text-xs text-surface-500">{label}</p>
        <p className="text-sm font-semibold text-surface-800">{value}</p>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

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

function getGradeBarColor(grade) {
  const map = {
    O: "bg-emerald-500",
    "A+": "bg-green-500",
    A: "bg-blue-500",
    "B+": "bg-sky-500",
    B: "bg-yellow-500",
    C: "bg-orange-500",
    P: "bg-amber-500",
    F: "bg-red-500",
  };
  return map[grade] || "bg-surface-400";
}

function getSubjectBg(gradePoints) {
  const gp = Number(gradePoints);
  if (gp >= 9) return "bg-emerald-50 border-emerald-200 text-emerald-800";
  if (gp >= 7) return "bg-blue-50 border-blue-200 text-blue-800";
  if (gp >= 5) return "bg-yellow-50 border-yellow-200 text-yellow-800";
  return "bg-red-50 border-red-200 text-red-800";
}
