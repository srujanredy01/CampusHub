import React, { useState, useEffect } from "react";
import moderationService from "../services/moderationService";

export default function ModeratorAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await moderationService.getAnalytics();
        setData(res.data.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Moderation Analytics</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Resolution Rate</p>
          <p className="text-3xl font-bold text-green-600">{data?.resolution_rate || 0}%</p>
          <p className="text-xs text-gray-400 mt-1">{data?.resolved_30d || 0} of {data?.total_reports_30d || 0} reports (30d)</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Reports (30d)</p>
          <p className="text-3xl font-bold text-gray-900">{data?.total_reports_30d || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Resolved (30d)</p>
          <p className="text-3xl font-bold text-blue-600">{data?.resolved_30d || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Reported Users */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Most Reported Users</h2>
          <div className="space-y-2">
            {data?.most_reported_users?.map((u, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-900">{u.reported_user__full_name || "Unknown"}</span>
                <span className="text-sm font-bold text-red-600">{u.count} reports</span>
              </div>
            ))}
            {(!data?.most_reported_users || data.most_reported_users.length === 0) && <p className="text-sm text-gray-400">No data</p>}
          </div>
        </div>

        {/* Active Moderators */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Active Moderators (7d)</h2>
          <div className="space-y-2">
            {data?.active_moderators?.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-900">{m.moderator__full_name}</span>
                <span className="text-sm font-bold text-blue-600">{m.count} actions</span>
              </div>
            ))}
          </div>
        </div>

        {/* Reports by Type */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Reports by Content Type</h2>
          <div className="space-y-3">
            {data?.reports_by_type?.map((r, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 capitalize">{r.content_type}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min((r.count / (data.total_reports_30d || 1)) * 100, 100)}%` }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-600">{r.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reports by Reason */}
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Reports by Reason</h2>
          <div className="space-y-3">
            {data?.reports_by_reason?.map((r, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 capitalize">{r.reason.replace("_", " ")}</span>
                <span className="text-sm font-medium text-gray-600">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Actions Trend */}
      {data?.daily_actions?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mt-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Daily Actions (7d)</h2>
          <div className="flex items-end gap-1 h-32">
            {data.daily_actions.map((d, i) => {
              const max = Math.max(...data.daily_actions.map(x => x.count));
              const height = max > 0 ? (d.count / max) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">{d.count}</span>
                  <div className="w-full bg-blue-500 rounded-t" style={{ height: `${height}%`, minHeight: "4px" }}></div>
                  <span className="text-xs text-gray-400">{new Date(d.date).toLocaleDateString(undefined, { weekday: "short" })}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
