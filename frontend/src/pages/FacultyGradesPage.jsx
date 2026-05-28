import React, { useState, useEffect } from "react";
import facultyService from "../services/facultyService";

export default function FacultyGradesPage() {
  const [grades, setGrades] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ subject: "", section: "", exam_type: "" });

  useEffect(() => { fetchData(); }, [filters]);

  const fetchData = async () => {
    try {
      const [gradesRes, analyticsRes] = await Promise.all([
        facultyService.getGrades(filters),
        facultyService.getGradeAnalytics(filters),
      ]);
      setGrades(gradesRes.data.results || gradesRes.data.data || []);
      setAnalytics(analyticsRes.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Grading System</h1>

      {/* Analytics */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Average Marks</p>
            <p className="text-xl font-bold text-blue-600">{analytics.average_marks}%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Entries</p>
            <p className="text-xl font-bold text-gray-900">{analytics.total_entries}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Pass Count</p>
            <p className="text-xl font-bold text-green-600">{analytics.pass_count}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Fail Count</p>
            <p className="text-xl font-bold text-red-600">{analytics.fail_count}</p>
          </div>
        </div>
      )}

      {/* Top Performers */}
      {analytics?.top_performers?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Top Performers</h2>
          <div className="space-y-2">
            {analytics.top_performers.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  <span className="text-sm font-medium text-gray-900">{s.student__full_name}</span>
                </div>
                <span className="text-sm font-bold text-green-600">{Math.round(s.marks_obtained)}/{s.max_marks}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="text" placeholder="Subject" value={filters.subject} onChange={(e) => setFilters({...filters, subject: e.target.value})}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <input type="text" placeholder="Section" value={filters.section} onChange={(e) => setFilters({...filters, section: e.target.value})}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          <select value={filters.exam_type} onChange={(e) => setFilters({...filters, exam_type: e.target.value})}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Exam Types</option>
            <option value="internal_1">Internal 1</option>
            <option value="internal_2">Internal 2</option>
            <option value="mid_term">Mid Term</option>
            <option value="end_term">End Term</option>
            <option value="assignment">Assignment</option>
          </select>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Student</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Subject</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Exam</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Marks</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {grades.slice(0, 20).map((g) => (
              <tr key={g.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{g.student_name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{g.subject}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{g.exam_type}</td>
                <td className="px-4 py-3 text-sm">{g.marks_obtained}/{g.max_marks}</td>
                <td className="px-4 py-3"><span className={`text-sm font-medium ${g.percentage >= 40 ? "text-green-600" : "text-red-600"}`}>{g.percentage}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
