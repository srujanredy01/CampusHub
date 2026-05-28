import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import moderationService from "../services/moderationService";

const StatCard = ({ title, value, icon, color, urgent }) => (
  <div className={`bg-white rounded-xl border ${urgent ? "border-red-200" : "border-gray-100"} p-5 shadow-sm hover:shadow-md transition-shadow`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className={`text-2xl font-bold mt-1 ${color || "text-gray-900"}`}>{value}</p>
      </div>
      <span className="text-2xl">{icon}</span>
    </div>
  </div>
);

export default function ModeratorDashboardPage() {
  const { user } = useSelector((s) => s.auth);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await moderationService.getDashboard();
      setStats(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Moderation Dashboard</h1>
        <p className="text-gray-500 mt-1">Content quality & community safety</p>
      </div>

      {/* Priority Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard title="Pending Reports" value={stats?.pending_reports || 0} icon="🚨" color="text-red-600" urgent={stats?.pending_reports > 0} />
        <StatCard title="Channel Requests" value={stats?.pending_channel_requests || 0} icon="📺" color="text-blue-600" />
        <StatCard title="Pending Roadmaps" value={stats?.pending_roadmaps || 0} icon="🗺️" color="text-purple-600" />
        <StatCard title="Pending Notes" value={stats?.pending_notes || 0} icon="📝" color="text-orange-600" />
        <StatCard title="Active Bans" value={stats?.active_bans || 0} icon="🚫" color="text-gray-600" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Investigating" value={stats?.investigating_reports || 0} icon="🔍" />
        <StatCard title="Study Groups" value={stats?.pending_study_groups || 0} icon="👥" />
        <StatCard title="Recent Violations" value={stats?.recent_violations || 0} icon="⚡" color="text-yellow-600" />
        <StatCard title="Actions Today" value={stats?.total_actions_today || 0} icon="✅" color="text-green-600" />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Moderation Queue</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <a href="/moderator/reports" className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:bg-red-50 hover:border-red-200 transition-colors">
            <span className="text-2xl block mb-1">🚨</span>
            <span className="text-sm font-medium text-gray-700">Reports</span>
          </a>
          <a href="/moderator/channels" className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:bg-blue-50 hover:border-blue-200 transition-colors">
            <span className="text-2xl block mb-1">📺</span>
            <span className="text-sm font-medium text-gray-700">Channels</span>
          </a>
          <a href="/moderator/approvals" className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:bg-purple-50 hover:border-purple-200 transition-colors">
            <span className="text-2xl block mb-1">✅</span>
            <span className="text-sm font-medium text-gray-700">Approvals</span>
          </a>
          <a href="/moderator/analytics" className="bg-white border border-gray-200 rounded-lg p-4 text-center hover:bg-green-50 hover:border-green-200 transition-colors">
            <span className="text-2xl block mb-1">📊</span>
            <span className="text-sm font-medium text-gray-700">Analytics</span>
          </a>
        </div>
      </div>

      {/* Active Users */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Platform Status</h2>
          <span className="text-sm text-green-600 font-medium">● {stats?.active_users_today || 0} online</span>
        </div>
      </div>
    </div>
  );
}
