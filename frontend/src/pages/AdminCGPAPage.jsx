import { useState, useEffect } from "react";
import cgpaService from "../services/cgpaService";
import { toast } from "react-toastify";

export default function AdminCGPAPage() {
  const [activeView, setActiveView] = useState("analytics");
  const [analytics, setAnalytics] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    if (activeView === "records") loadRecords();
  }, [activeView, search, page]);

  const loadAnalytics = async () => {
    try {
      const res = await cgpaService.adminGetAnalytics();
      setAnalytics(res.data?.data || res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    try {
      const params = { page, page_size: 20 };
      if (search) params.search = search;
      const res = await cgpaService.adminGetRecords(params);
      const data = res.data?.data || res.data;
      setRecords(data.results || []);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExport = async () => {
    try {
      const res = await cgpaService.adminExport();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "academic_records.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export downloaded");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  if (loading) {
    return (
      <div className="page-container space-y-6">
        <div className="h-10 w-64 bg-surface-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const overview = analytics?.overview || {};

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Academic Analytics</h1>
          <p className="text-sm text-surface-500">Institution-wide academic performance overview</p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-surface-800 text-white text-sm font-medium rounded-lg hover:bg-surface-900 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        {[
          { id: "analytics", label: "Analytics" },
          { id: "records", label: "Student Records" },
        ].map((v) => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeView === v.id
                ? "bg-primary-600 text-white"
                : "bg-surface-100 text-surface-600 hover:bg-surface-200"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {activeView === "analytics" && analytics && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatCard label="Students with Data" value={overview.total_students_with_data} color="blue" />
            <AdminStatCard label="Average CGPA" value={overview.average_cgpa?.toFixed(2)} color="primary" />
            <AdminStatCard label="At Risk Students" value={overview.total_at_risk} color="red" />
            <AdminStatCard label="Excellent Students" value={overview.total_excellent} color="emerald" />
          </div>

          {/* CGPA Distribution */}
          {analytics.cgpa_distribution && (
            <div className="bg-white rounded-xl border border-surface-200 p-5">
              <h3 className="text-sm font-semibold text-surface-700 mb-4">CGPA Distribution</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(analytics.cgpa_distribution).map(([range, count]) => (
                  <div key={range} className="text-center p-3 bg-surface-50 rounded-lg">
                    <p className="text-lg font-bold text-surface-800">{count}</p>
                    <p className="text-xs text-surface-500">{range}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Branch Stats */}
          {analytics.branch_stats && analytics.branch_stats.length > 0 && (
            <div className="bg-white rounded-xl border border-surface-200 p-5">
              <h3 className="text-sm font-semibold text-surface-700 mb-4">Department Performance</h3>
              <div className="space-y-2">
                {analytics.branch_stats.map((b, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                    <span className="text-sm text-surface-700 font-medium">{b.user__branch || "Unknown"}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-surface-500">{b.count} students</span>
                      <span className="text-sm font-bold text-primary-600 tabular-nums">
                        {Number(b.avg_cgpa).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Semester Stats */}
          {analytics.semester_stats && analytics.semester_stats.length > 0 && (
            <div className="bg-white rounded-xl border border-surface-200 p-5">
              <h3 className="text-sm font-semibold text-surface-700 mb-4">Semester-wise Pass Rates</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-surface-500 border-b border-surface-100">
                      <th className="pb-2 font-medium">Semester</th>
                      <th className="pb-2 font-medium text-center">Students</th>
                      <th className="pb-2 font-medium text-center">Pass Rate</th>
                      <th className="pb-2 font-medium text-center">Avg SGPA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.semester_stats.map((s, i) => (
                      <tr key={i} className="border-b border-surface-50">
                        <td className="py-2 font-medium">Semester {s.semester}</td>
                        <td className="py-2 text-center">{s.total_students}</td>
                        <td className="py-2 text-center">
                          <span className={`font-medium ${s.pass_rate >= 80 ? "text-green-600" : s.pass_rate >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                            {s.pass_rate}%
                          </span>
                        </td>
                        <td className="py-2 text-center tabular-nums font-medium">{s.avg_sgpa}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            {analytics.top_performers && analytics.top_performers.length > 0 && (
              <div className="bg-white rounded-xl border border-surface-200 p-5">
                <h3 className="text-sm font-semibold text-surface-700 mb-3">Top Performers</h3>
                <div className="space-y-2">
                  {analytics.top_performers.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-50">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-surface-800">{s.user__full_name}</p>
                          <p className="text-xs text-surface-400">{s.user__branch}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-primary-600 tabular-nums">
                        {Number(s.current_cgpa).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* At Risk Students */}
            {analytics.at_risk_students && analytics.at_risk_students.length > 0 && (
              <div className="bg-white rounded-xl border border-red-200 p-5">
                <h3 className="text-sm font-semibold text-red-700 mb-3">At Risk Students</h3>
                <div className="space-y-2">
                  {analytics.at_risk_students.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-red-50">
                      <div>
                        <p className="text-sm font-medium text-surface-800">{s.user__full_name}</p>
                        <p className="text-xs text-surface-400">
                          {s.user__branch} · {s.total_backlogs} backlog{s.total_backlogs !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-red-600 tabular-nums">
                        {Number(s.current_cgpa).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeView === "records" && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, or student ID..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-surface-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Records Table */}
          <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-50">
                  <tr className="text-left text-xs text-surface-500 border-b border-surface-100">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Branch</th>
                    <th className="px-4 py-3 font-medium text-center">CGPA</th>
                    <th className="px-4 py-3 font-medium text-center">Credits</th>
                    <th className="px-4 py-3 font-medium text-center">Semesters</th>
                    <th className="px-4 py-3 font-medium text-center">Standing</th>
                    <th className="px-4 py-3 font-medium text-center">Backlogs</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-surface-400">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id} className="border-b border-surface-50 hover:bg-surface-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-surface-800">{r.user_name}</p>
                          <p className="text-xs text-surface-400">{r.student_id || r.user_email}</p>
                        </td>
                        <td className="px-4 py-3 text-surface-600">{r.branch || "—"}</td>
                        <td className="px-4 py-3 text-center font-bold text-primary-600 tabular-nums">
                          {Number(r.current_cgpa).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums">{r.total_credits_earned}</td>
                        <td className="px-4 py-3 text-center">{r.total_semesters}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getStandingBadge(r.academic_standing)}`}>
                            {capitalize(r.academic_standing)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.total_backlogs > 0 ? (
                            <span className="text-red-600 font-medium">{r.total_backlogs}</span>
                          ) : (
                            <span className="text-green-600">0</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm text-surface-600 bg-surface-100 rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-surface-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm text-surface-600 bg-surface-100 rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AdminStatCard({ label, value, color }) {
  const colorMap = {
    primary: "bg-primary-50 text-primary-700 border-primary-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.primary}`}>
      <p className="text-xs font-medium opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value ?? "—"}</p>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, " ");
}

function getStandingBadge(standing) {
  const map = {
    excellent: "bg-emerald-100 text-emerald-700",
    good: "bg-blue-100 text-blue-700",
    average: "bg-yellow-100 text-yellow-700",
    at_risk: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };
  return map[standing] || "bg-surface-100 text-surface-700";
}
