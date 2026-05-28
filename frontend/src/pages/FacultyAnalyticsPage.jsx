import React, { useState, useEffect } from "react";
import facultyService from "../services/facultyService";

export default function FacultyAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await facultyService.getAcademicAnalytics();
        setData(res.data.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Academic Analytics</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">🏆 Top Performers</h2>
          <div className="space-y-2">
            {data?.top_performers?.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{s.student__full_name}</p>
                    <p className="text-xs text-gray-500">{s.student__student_id}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-green-600">{Math.round(s.avg_marks)}%</span>
              </div>
            ))}
            {(!data?.top_performers || data.top_performers.length === 0) && <p className="text-sm text-gray-400">No data yet</p>}
          </div>
        </div>

        {/* Weak Students */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">⚠️ Students at Risk</h2>
          <div className="space-y-2">
            {data?.weak_students?.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.student__full_name}</p>
                  <p className="text-xs text-gray-500">{s.student__student_id}</p>
                </div>
                <span className="text-sm font-bold text-red-600">{Math.round(s.avg_marks)}%</span>
              </div>
            ))}
            {(!data?.weak_students || data.weak_students.length === 0) && <p className="text-sm text-gray-400">No at-risk students</p>}
          </div>
        </div>

        {/* Subject Performance */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📊 Subject Performance</h2>
          <div className="space-y-3">
            {data?.subject_performance?.map((s, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-900">{s.subject}</span>
                  <span className="text-gray-500">{s.total_students} students</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(s.avg_marks || 0, 100)}%` }}></div>
                  </div>
                  <span className="text-xs font-medium text-gray-700">{Math.round(s.avg_marks || 0)}%</span>
                </div>
                <div className="flex gap-3 text-xs text-gray-400 mt-1">
                  <span className="text-green-600">Pass: {s.pass_count}</span>
                  <span className="text-red-600">Fail: {s.fail_count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section Comparison */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📈 Section Comparison</h2>
          <div className="space-y-3">
            {data?.section_comparison?.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Section {s.section}</p>
                  <p className="text-xs text-gray-500">{s.student_count} students</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(s.avg_marks || 0, 100)}%` }}></div>
                  </div>
                  <span className="text-sm font-bold text-purple-600">{Math.round(s.avg_marks || 0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
