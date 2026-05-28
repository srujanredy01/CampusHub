import React, { useState, useEffect } from "react";
import facultyService from "../services/facultyService";

export default function FacultyAttendancePage() {
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMarkForm, setShowMarkForm] = useState(false);
  const [markData, setMarkData] = useState({
    subject: "", branch: "", semester: "", section: "", date: new Date().toISOString().split("T")[0], records: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sessRes, analyticsRes] = await Promise.all([
        facultyService.getAttendanceSessions({}),
        facultyService.getAttendanceAnalytics({}),
      ]);
      setSessions(sessRes.data.results || sessRes.data.data || []);
      setAnalytics(analyticsRes.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMark = async () => {
    try {
      await facultyService.bulkMarkAttendance(markData);
      setShowMarkForm(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const exportAttendance = async () => {
    try {
      const res = await facultyService.exportAttendance({});
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "attendance_export.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
        <div className="flex gap-2">
          <button onClick={exportAttendance} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Export CSV</button>
          <button onClick={() => setShowMarkForm(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Mark Attendance</button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Records</p>
            <p className="text-xl font-bold text-gray-900">{analytics.total_records}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Low Attendance</p>
            <p className="text-xl font-bold text-red-600">{analytics.low_attendance_count}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-sm text-gray-500">Subjects Tracked</p>
            <p className="text-xl font-bold text-blue-600">{analytics.subject_breakdown?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Subject Breakdown */}
      {analytics?.subject_breakdown && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Subject-wise Attendance</h2>
          <div className="space-y-3">
            {analytics.subject_breakdown.map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{s.subject_name}</p>
                  <p className="text-xs text-gray-500">{s.student_count} students • {s.low_count} below 75%</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(s.avg_attendance || 0, 100)}%` }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{Math.round(s.avg_attendance || 0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Recent Sessions</h2>
        </div>
        {sessions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No sessions yet</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Section</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Present</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Absent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sessions.slice(0, 15).map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{s.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{s.subject}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{s.section}</td>
                  <td className="px-4 py-3 text-sm text-green-600 font-medium">{s.present_count}</td>
                  <td className="px-4 py-3 text-sm text-red-600 font-medium">{s.absent_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mark Attendance Modal */}
      {showMarkForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Mark Attendance</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Subject" value={markData.subject} onChange={(e) => setMarkData({...markData, subject: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Branch" value={markData.branch} onChange={(e) => setMarkData({...markData, branch: e.target.value})}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="text" placeholder="Section" value={markData.section} onChange={(e) => setMarkData({...markData, section: e.target.value})}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Semester" value={markData.semester} onChange={(e) => setMarkData({...markData, semester: e.target.value})}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="date" value={markData.date} onChange={(e) => setMarkData({...markData, date: e.target.value})}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowMarkForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleBulkMark} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
