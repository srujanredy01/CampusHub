import React, { useState, useEffect } from "react";
import facultyService from "../services/facultyService";

export default function FacultyStudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ section: "", branch: "", semester: "", search: "" });
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, [filters]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.section) params.section = filters.section;
      if (filters.branch) params.branch = filters.branch;
      if (filters.semester) params.semester = filters.semester;
      if (filters.search) params.search = filters.search;
      const res = await facultyService.getStudents(params);
      setStudents(res.data.results || res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const viewStudent = async (id) => {
    try {
      const res = await facultyService.getStudentDetail(id);
      setStudentDetail(res.data.data);
      setSelectedStudent(id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Student Management</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input type="text" placeholder="Search students..." value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="Section" value={filters.section}
            onChange={(e) => setFilters({ ...filters, section: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="Branch" value={filters.branch}
            onChange={(e) => setFilters({ ...filters, branch: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={filters.semester} onChange={(e) => setFilters({ ...filters, semester: e.target.value })}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : students.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No students found</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Section</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Attendance</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{s.student_id || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{s.section} ({s.branch})</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${s.attendance_percentage < 75 ? "text-red-600" : "text-green-600"}`}>
                          {s.attendance_percentage != null ? `${s.attendance_percentage}%` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => viewStudent(s.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Student Detail Panel */}
        <div className="lg:col-span-1">
          {studentDetail ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-3">{studentDetail.student.full_name}</h3>
              <p className="text-sm text-gray-500 mb-1">{studentDetail.student.email}</p>
              <p className="text-sm text-gray-500 mb-4">{studentDetail.student.branch} — Sem {studentDetail.student.semester}, Sec {studentDetail.student.section}</p>

              {studentDetail.academic && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">CGPA: {studentDetail.academic.cgpa}</p>
                  <p className="text-xs text-blue-600">Standing: {studentDetail.academic.standing}</p>
                </div>
              )}

              <h4 className="text-sm font-semibold text-gray-700 mb-2">Attendance</h4>
              <div className="space-y-1 mb-4">
                {studentDetail.attendance?.slice(0, 5).map((a, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-600">{a.subject}</span>
                    <span className={a.is_shortage ? "text-red-600 font-medium" : "text-green-600"}>{a.percentage}%</span>
                  </div>
                ))}
              </div>

              <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent Submissions</h4>
              <div className="space-y-1">
                {studentDetail.submissions?.slice(0, 5).map((s, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-600 truncate max-w-[150px]">{s.assignment}</span>
                    <span className={`font-medium ${s.status === "graded" ? "text-green-600" : "text-orange-600"}`}>{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
              Select a student to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
