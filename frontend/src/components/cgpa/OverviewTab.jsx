import { useMemo } from "react";

export default function OverviewTab({ profile, analytics }) {
  const summary = analytics?.summary || {};
  const semesters = profile?.semesters || [];
  const cgpaProgress = analytics?.cgpa_progress_series || [];
  const warnings = analytics?.warnings || [];
  const insights = analytics?.insights || {};

  const cards = useMemo(() => [
    {
      label: "Current CGPA",
      value: Number(summary.current_cgpa || profile?.current_cgpa || 0).toFixed(2),
      sub: `out of 10.0`,
      color: "primary",
      icon: GpaIcon,
    },
    {
      label: "Latest SGPA",
      value: semesters.length > 0
        ? Number(semesters[semesters.length - 1]?.sgpa || 0).toFixed(2)
        : "—",
      sub: semesters.length > 0 ? `Semester ${semesters[semesters.length - 1]?.semester}` : "No data",
      color: "blue",
      icon: SgpaIcon,
    },
    {
      label: "Credits Earned",
      value: summary.total_credits || profile?.total_credits_earned || 0,
      sub: `across ${summary.semester_count || profile?.total_semesters || 0} semesters`,
      color: "emerald",
      icon: CreditIcon,
    },
    {
      label: "Backlogs",
      value: summary.total_backlogs || profile?.total_backlogs || 0,
      sub: (summary.total_backlogs || 0) === 0 ? "All clear" : "Needs attention",
      color: (summary.total_backlogs || 0) === 0 ? "green" : "red",
      icon: BacklogIcon,
    },
    {
      label: "Academic Standing",
      value: capitalize(summary.academic_standing || profile?.academic_standing || "good"),
      sub: getStandingDescription(summary.academic_standing || profile?.academic_standing),
      color: getStandingColor(summary.academic_standing || profile?.academic_standing),
      icon: StandingIcon,
    },
    {
      label: "Improvement",
      value: `${profile?.improvement_percentage || 0}%`,
      sub: (profile?.improvement_percentage || 0) >= 0 ? "Since first semester" : "Declining trend",
      color: (profile?.improvement_percentage || 0) >= 0 ? "teal" : "orange",
      icon: TrendIcon,
    },
  ], [summary, profile, semesters]);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <StatCard key={i} {...card} />
        ))}
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 5v4h2v-4h-2zm0 6v2h2v-2h-2z" />
              </svg>
              <p className="text-sm text-amber-800">{w.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* CGPA Progress Chart */}
      {cgpaProgress.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-4">CGPA Progress</h3>
          <MiniLineChart data={cgpaProgress} />
        </div>
      )}

      {/* Quick Insights */}
      {insights.best_semester && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightCard
            title="Best Semester"
            value={`Sem ${insights.best_semester.semester}`}
            sub={`SGPA: ${insights.best_semester.sgpa}`}
            icon="🏆"
          />
          <InsightCard
            title="Average SGPA"
            value={insights.average_sgpa?.toFixed(2) || "—"}
            sub="Across all semesters"
            icon="📊"
          />
          <InsightCard
            title="Performance Trend"
            value={capitalize(insights.trend || "stable")}
            sub={getTrendDescription(insights.trend)}
            icon={insights.trend === "improving" ? "📈" : insights.trend === "declining" ? "📉" : "➡️"}
          />
        </div>
      )}

      {/* Semester SGPA Bars */}
      {semesters.length > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 p-5">
          <h3 className="text-sm font-semibold text-surface-700 mb-4">Semester-wise SGPA</h3>
          <div className="flex items-end gap-3 h-40">
            {semesters.map((sem, idx) => {
              const sgpa = Number(sem.sgpa || 0);
              const height = Math.max((sgpa / 10) * 100, 5);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-surface-700 tabular-nums">
                    {sgpa.toFixed(1)}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-primary-600 to-primary-400 transition-all duration-500"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-surface-500">S{sem.semester}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {semesters.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-surface-200">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-surface-800">No Academic Records Yet</h3>
          <p className="text-sm text-surface-500 mt-1 max-w-sm mx-auto">
            Go to the Semesters tab to add your semester data and start tracking your academic performance.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon: Icon }) {
  const colorMap = {
    primary: "bg-primary-50 text-primary-700 border-primary-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    teal: "bg-teal-50 text-teal-700 border-teal-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.primary}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-75">{label}</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
          <p className="text-xs opacity-60 mt-0.5">{sub}</p>
        </div>
        <Icon className="w-8 h-8 opacity-40" />
      </div>
    </div>
  );
}

function InsightCard({ title, value, sub, icon }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-4 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-surface-500">{title}</p>
        <p className="text-lg font-bold text-surface-800">{value}</p>
        <p className="text-xs text-surface-400">{sub}</p>
      </div>
    </div>
  );
}

function MiniLineChart({ data }) {
  if (!data || data.length === 0) return null;

  const values = data.map((d) => d.cgpa);
  const max = Math.max(...values, 10);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const width = 100;
  const height = 60;
  const padding = 5;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - ((d.cgpa - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
          <line
            key={pct}
            x1={padding}
            y1={padding + pct * (height - 2 * padding)}
            x2={width - padding}
            y2={padding + pct * (height - 2 * padding)}
            stroke="#e5e7eb"
            strokeWidth="0.3"
          />
        ))}
        {/* Line */}
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="#6366f1"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Dots */}
        {data.map((d, i) => {
          const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
          const y = height - padding - ((d.cgpa - min) / range) * (height - 2 * padding);
          return <circle key={i} cx={x} cy={y} r="1.5" fill="#6366f1" />;
        })}
      </svg>
      <div className="flex justify-between px-1 mt-1">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-surface-400">S{d.semester}</span>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

function getStandingColor(standing) {
  const map = { excellent: "emerald", good: "blue", average: "orange", at_risk: "red", critical: "red" };
  return map[standing] || "blue";
}

function getStandingDescription(standing) {
  const map = {
    excellent: "CGPA ≥ 9.0",
    good: "CGPA ≥ 7.5",
    average: "CGPA ≥ 6.0",
    at_risk: "CGPA < 6.0",
    critical: "CGPA < 4.0",
  };
  return map[standing] || "";
}

function getTrendDescription(trend) {
  const map = {
    improving: "Consistent upward trend",
    declining: "Performance dropping",
    stable: "Steady performance",
  };
  return map[trend] || "Not enough data";
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function GpaIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function SgpaIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 20V10M18 20V4M6 20v-4" />
    </svg>
  );
}

function CreditIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function BacklogIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );
}

function StandingIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  );
}

function TrendIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
