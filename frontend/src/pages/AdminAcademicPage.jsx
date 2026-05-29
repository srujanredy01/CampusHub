import { useState, useEffect } from "react";
import adminService from "../services/adminService";

export default function AdminAcademicPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await adminService.getAcademicOverview();
        setData(res.data?.data || res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return (
    <div className="page-container space-y-6">
      <div className="skeleton h-10 w-64 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-56 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title">Academic Overview</h1>
        <p className="page-subtitle">Department-wise performance, attendance, and CGPA (read-only)</p>
      </div>

      {/* Assignment Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-primary-600">{data?.assignments?.total ?? 0}</p>
          <p className="text-xs text-surface-500 mt-1">Total Assignments</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-success-600">{data?.assignments?.submissions ?? 0}</p>
          <p className="text-xs text-surface-500 mt-1">Total Submissions</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-info-600">{data?.assignments?.graded ?? 0}</p>
          <p className="text-xs text-surface-500 mt-1">Graded</p>
        </div>
      </div>

      {/* Department Attendance */}
      <div className="card-padded">
        <h3 className="text-base font-semibold text-surface-900 mb-4">Department-wise Attendance</h3>
        <div className="table-container">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="th">Department</th>
                <th className="th">Avg Attendance</th>
                <th className="th">Records</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data?.dept_attendance || []).map((dept) => (
                <tr key={dept.department} className="tr">
                  <td className="td font-medium">{dept.name} ({dept.department})</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${dept.avg_attendance >= 75 ? "bg-success-500" : dept.avg_attendance >= 60 ? "bg-warning-500" : "bg-danger-500"}`}
                          style={{ width: `${Math.min(dept.avg_attendance, 100)}%` }} />
                      </div>
                      <span className="text-sm tabular-nums">{dept.avg_attendance}%</span>
                    </div>
                  </td>
                  <td className="td text-sm text-surface-600">{dept.total_records}</td>
                  <td className="td">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${dept.avg_attendance >= 75 ? "bg-success-50 text-success-700" : "bg-danger-50 text-danger-700"}`}>
                      {dept.avg_attendance >= 75 ? "Good" : "Low"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Attendance Students */}
      <div className="card-padded">
        <h3 className="text-base font-semibold text-surface-900 mb-4">Low Attendance Students</h3>
        {(data?.low_attendance_students || []).length > 0 ? (
          <div className="table-container">
            <table className="w-full">
              <thead className="table-head">
                <tr>
                  <th className="th">Student</th>
                  <th className="th">Branch</th>
                  <th className="th">Subject</th>
                  <th className="th">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {data.low_attendance_students.map((s, i) => (
                  <tr key={i} className="tr">
                    <td className="td text-sm font-medium">{s.student__full_name}</td>
                    <td className="td text-sm text-surface-600">{s.student__branch}</td>
                    <td className="td text-sm text-surface-600">{s.subject_name}</td>
                    <td className="td">
                      <span className="text-sm font-medium text-danger-600">{Math.round(s.pct)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-surface-400 text-center py-4">No students with low attendance</p>
        )}
      </div>

      {/* CGPA Distribution */}
      {data?.cgpa_distribution?.length > 0 && (
        <div className="card-padded">
          <h3 className="text-base font-semibold text-surface-900 mb-4">CGPA Distribution by Semester</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.cgpa_distribution.map((item) => (
              <div key={item.semester} className="text-center p-3 rounded-lg bg-surface-50 border border-surface-100">
                <p className="text-lg font-bold text-surface-900">{item.avg_sgpa?.toFixed(2) ?? "—"}</p>
                <p className="text-xs text-surface-500">Semester {item.semester}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-lg bg-info-50 border border-info-200">
        <p className="text-sm text-info-700">
          <strong>Note:</strong> Admin cannot directly modify grades. Only faculty can grade assignments and manage academic records.
        </p>
      </div>
    </div>
  );
}
