/**
 * LiveActivityFeed — Real-time activity timeline for admin dashboard.
 * Shows live user activities pushed via WebSocket.
 */
import React from "react";
import { useSelector } from "react-redux";

const ACTION_CONFIG = {
  login: { icon: "🔑", label: "Login", color: "text-green-600" },
  login_failed: { icon: "🚫", label: "Failed Login", color: "text-red-600" },
  logout: { icon: "👋", label: "Logout", color: "text-gray-500" },
  signup: { icon: "👤", label: "Signup", color: "text-blue-600" },
  password_change: { icon: "🔒", label: "Password Change", color: "text-orange-600" },
  password_reset_request: { icon: "🔑", label: "Password Reset", color: "text-orange-500" },
  page_visit: { icon: "📄", label: "Page Visit", color: "text-gray-500" },
  profile_view: { icon: "👁️", label: "Profile View", color: "text-gray-500" },
  profile_update: { icon: "✏️", label: "Profile Update", color: "text-blue-500" },
  resource_view: { icon: "📚", label: "Resource View", color: "text-indigo-500" },
  resource_download: { icon: "⬇️", label: "Download", color: "text-indigo-600" },
  news_view: { icon: "📰", label: "News View", color: "text-gray-500" },
  question_view: { icon: "❓", label: "Question View", color: "text-purple-500" },
  code_run: { icon: "▶️", label: "Code Run", color: "text-green-500" },
  code_submit: { icon: "💻", label: "Code Submit", color: "text-emerald-600" },
  notification_view: { icon: "🔔", label: "Notifications", color: "text-gray-500" },
  admin_action: { icon: "⚡", label: "Admin Action", color: "text-amber-600" },
  api_request: { icon: "🌐", label: "API Request", color: "text-gray-400" },
};

function LiveActivityFeed() {
  const { liveActivities, wsConnected } = useSelector((s) => s.notifications);

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 5) return "Just now";
    if (diff < 60) return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-900">Live Activity</h2>
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
            wsConnected
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
            {wsConnected ? "Live" : "Polling"}
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {liveActivities.length} recent events
        </span>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {liveActivities.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-2xl mb-2">📡</p>
            <p className="text-sm text-slate-500">Waiting for activity...</p>
            <p className="text-xs text-slate-400 mt-1">User actions will appear here in real-time</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {liveActivities.map((activity, idx) => {
              const config = ACTION_CONFIG[activity.action] || {
                icon: "🔹",
                label: activity.action,
                color: "text-gray-500",
              };
              return (
                <div
                  key={activity.id || idx}
                  className="flex items-start gap-3 px-6 py-3 hover:bg-slate-50/60 transition-colors animate-fade-up"
                >
                  <span className="text-base flex-shrink-0 mt-0.5">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${config.color}`}>
                        {config.label}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        activity.status === "success" ? "bg-green-400" :
                        activity.status === "failed" ? "bg-red-400" : "bg-gray-300"
                      }`} />
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5 truncate">
                      {activity.username || "Anonymous"}
                      {activity.student_id && (
                        <span className="text-slate-400 ml-1">({activity.student_id})</span>
                      )}
                    </p>
                    {activity.endpoint && (
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate font-mono">
                        {activity.endpoint}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">
                    {formatTime(activity.created_at)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveActivityFeed;
