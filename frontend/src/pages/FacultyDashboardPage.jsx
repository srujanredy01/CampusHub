import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import facultyService from "../services/facultyService";
import WebSocketService from "../services/websocketService";

const facultyWS = new WebSocketService();

const StatCard = ({ title, value, icon, color, subtitle, link }) => {
  const Card = (
    <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all duration-200 group cursor-pointer">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color || "text-gray-900"}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br ${
          color === "text-blue-600" ? "from-blue-50 to-blue-100" :
          color === "text-orange-600" ? "from-orange-50 to-orange-100" :
          color === "text-red-600" ? "from-red-50 to-red-100" :
          color === "text-green-600" ? "from-green-50 to-green-100" :
          color === "text-purple-600" ? "from-purple-50 to-purple-100" :
          "from-gray-50 to-gray-100"
        } group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
      </div>
    </div>
  );
  return link ? <Link to={link}>{Card}</Link> : Card;
};

export default function FacultyDashboardPage() {
  const { user } = useSelector((s) => s.auth);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realtimeAlerts, setRealtimeAlerts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sectionPerformance, setSectionPerformance] = useState([]);
  const [adminAnnouncements, setAdminAnnouncements] = useState([]);

  const fetchDashboard = useCallback(async () => {
    try {
      const [dashRes, alertsRes, sectionRes, annRes] = await Promise.all([
        facultyService.getDashboard(),
        facultyService.getAttendanceAlerts({ acknowledged: "false" }).catch(() => ({ data: { data: [] } })),
        facultyService.getSectionPerformance().catch(() => ({ data: { data: [] } })),
        facultyService.getAdminAnnouncements({}).catch(() => ({ data: { data: [] } })),
      ]);
      setStats(dashRes.data.data || dashRes.data);
      setAlerts(alertsRes.data.data || []);
      setSectionPerformance(sectionRes.data.data || []);
      setAdminAnnouncements(annRes.data.data || []);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // WebSocket for real-time updates
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      facultyWS.connect("/ws/faculty/", token);

      const handleSubmission = (data) => {
        setRealtimeAlerts((prev) => [
          { type: "submission", ...data, id: Date.now(), time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 9),
        ]);
        fetchDashboard();
      };
      const handleAlert = (data) => {
        setRealtimeAlerts((prev) => [
          { type: "alert", ...data, id: Date.now(), time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 9),
        ]);
      };
      const handleChat = (data) => {
        setRealtimeAlerts((prev) => [
          { type: "chat", ...data, id: Date.now(), time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 9),
        ]);
      };
      const handleAnnouncement = (data) => {
        setRealtimeAlerts((prev) => [
          { type: "announcement", ...data, id: Date.now(), time: new Date().toLocaleTimeString() },
          ...prev.slice(0, 9),
        ]);
      };

      facultyWS.on("new_submission", handleSubmission);
      facultyWS.on("attendance_alert", handleAlert);
      facultyWS.on("new_chat_message", handleChat);
      facultyWS.on("announcement_received", handleAnnouncement);
      facultyWS.on("dashboard_update", (data) => setStats(data.data || data));

      return () => {
        facultyWS.off("new_submission", handleSubmission);
        facultyWS.off("attendance_alert", handleAlert);
        facultyWS.off("new_chat_message", handleChat);
        facultyWS.off("announcement_received", handleAnnouncement);
        facultyWS.disconnect();
      };
    }
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faculty Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.full_name || "Faculty"}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Live
          </span>
        </div>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Classes" value={stats?.todays_classes || 0} icon="📚" color="text-blue-600" link="/faculty/attendance" subtitle="Scheduled for today" />
        <StatCard title="Pending Evaluations" value={stats?.pending_evaluations || 0} icon="📝" color="text-orange-600" link="/faculty/assignments" subtitle="Awaiting review" />
        <StatCard title="Low Attendance" value={stats?.low_attendance_students || 0} icon="⚠️" color="text-red-600" link="/faculty/attendance" subtitle="Below 75%" />
        <StatCard title="Total Students" value={stats?.total_students || 0} icon="👥" color="text-green-600" link="/faculty/students" subtitle="In your sections" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Pending Assignments" value={stats?.pending_assignments || 0} icon="📋" color="text-purple-600" link="/faculty/assignments" />
        <StatCard title="Recent Submissions" value={stats?.recent_submissions || 0} icon="📤" link="/faculty/assignments" subtitle="Last 7 days" />
        <StatCard title="Announcements" value={stats?.total_announcements || 0} icon="📢" link="/faculty/announcements" />
        <StatCard title="Unread Messages" value={stats?.unread_messages || 0} icon="💬" link="/faculty/chat" />
        <StatCard title="Upcoming Events" value={stats?.upcoming_events || 0} icon="🗓️" link="/faculty/events" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Activity Feed */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Live Activity</h2>
            <span className="text-xs text-gray-400">{realtimeAlerts.length} updates</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {realtimeAlerts.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <span className="text-3xl block mb-2">📡</span>
                <p className="text-sm">Waiting for real-time updates...</p>
              </div>
            ) : (
              realtimeAlerts.map((alert) => (
                <div key={alert.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <span className="text-lg">
                    {alert.type === "submission" ? "📤" :
                     alert.type === "chat" ? "💬" :
                     alert.type === "announcement" ? "📢" : "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">
                      {alert.data?.message || alert.data?.content || "New activity detected"}
                    </p>
                    <p className="text-xs text-gray-400">{alert.time}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    alert.type === "submission" ? "bg-blue-50 text-blue-700" :
                    alert.type === "chat" ? "bg-green-50 text-green-700" :
                    alert.type === "alert" ? "bg-red-50 text-red-700" :
                    "bg-gray-50 text-gray-700"
                  }`}>
                    {alert.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Attendance Alerts */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="text-lg font-semibold text-gray-800">Attendance Alerts</h2>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                <span className="text-2xl block mb-2">✅</span>
                <p className="text-sm">No critical alerts</p>
              </div>
            ) : (
              alerts.slice(0, 8).map((alert) => (
                <div key={alert.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-800 truncate">{alert.student_name}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      alert.level === "danger" ? "bg-red-100 text-red-700" :
                      alert.level === "critical" ? "bg-orange-100 text-orange-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {Math.round(alert.percentage)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{alert.subject}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { to: "/faculty/attendance", icon: "✅", label: "Mark Attendance" },
            { to: "/faculty/assignments", icon: "📝", label: "Assignments" },
            { to: "/faculty/grades", icon: "📊", label: "Enter Grades" },
            { to: "/faculty/announcements", icon: "📢", label: "Announce" },
            { to: "/faculty/chat", icon: "💬", label: "Messages" },
            { to: "/faculty/events", icon: "🗓️", label: "Events" },
            { to: "/faculty/resources", icon: "📁", label: "Resources" },
            { to: "/faculty/analytics", icon: "📈", label: "Analytics" },
          ].map((action) => (
            <Link key={action.to} to={action.to}
              className="bg-white border border-gray-200 rounded-xl p-4 text-center hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm transition-all duration-200">
              <span className="text-2xl block mb-1.5">{action.icon}</span>
              <span className="text-xs font-medium text-gray-700">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Study Groups & Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Study Groups</h2>
            <Link to="/faculty/groups" className="text-sm text-blue-600 hover:text-blue-700">View all →</Link>
          </div>
          <p className="text-sm text-gray-500">{stats?.study_groups_count || 0} active groups in your scope</p>
          <div className="mt-3 flex gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">Mentor</span>
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">Observer</span>
            <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">Moderator</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Recent Resources</h2>
            <Link to="/faculty/resources" className="text-sm text-blue-600 hover:text-blue-700">Upload →</Link>
          </div>
          <p className="text-sm text-gray-500">{stats?.recent_resources || 0} uploaded this week</p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">PDFs</span>
            <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-xs font-medium">PPTs</span>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">Videos</span>
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">Notes</span>
          </div>
        </div>
      </div>

      {/* Section Performance */}
      {sectionPerformance.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Section Performance</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Section</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Students</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Avg Attendance</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Avg Grade</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">Assignment Completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sectionPerformance.map((s) => (
                  <tr key={s.section}>
                    <td className="py-3 text-sm font-medium text-gray-900">Section {s.section}</td>
                    <td className="py-3 text-sm text-gray-700">{s.student_count}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s.avg_attendance >= 75 ? "bg-green-500" : s.avg_attendance >= 65 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${Math.min(s.avg_attendance, 100)}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-600">{s.avg_attendance}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className={`text-sm font-medium ${s.avg_grade >= 60 ? "text-green-600" : s.avg_grade >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                        {s.avg_grade}%
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(s.assignment_completion, 100)}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-600">{s.assignment_completion}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Announcements */}
      {adminAnnouncements.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">📢 Announcements from Admin</h2>
            <span className="text-xs text-gray-400">{adminAnnouncements.filter((a) => !a.is_read).length} unread</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {adminAnnouncements.slice(0, 5).map((ann) => (
              <div key={ann.id} className={`px-5 py-3 ${!ann.is_read ? "bg-blue-50/50" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      ann.priority === "urgent" ? "bg-red-100 text-red-700" :
                      ann.priority === "high" ? "bg-orange-100 text-orange-700" :
                      "bg-gray-100 text-gray-700"
                    }`}>{ann.priority}</span>
                    <h4 className="text-sm font-medium text-gray-900">{ann.title}</h4>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(ann.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{ann.content}</p>
                <p className="text-xs text-gray-400 mt-1">From: {ann.sender_name}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
