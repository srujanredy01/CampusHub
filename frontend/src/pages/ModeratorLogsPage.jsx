import React, { useState, useEffect } from "react";
import moderationService from "../services/moderationService";

export default function ModeratorLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ action: "" });

  useEffect(() => { fetchLogs(); }, [filter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await moderationService.getLogs(filter);
      setLogs(res.data.results || res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const actionColors = {
    channel_approved: "text-green-600", channel_rejected: "text-red-600",
    user_warned: "text-yellow-600", user_banned: "text-red-700",
    user_muted: "text-orange-600", message_deleted: "text-gray-600",
    note_approved: "text-green-600", note_rejected: "text-red-600",
    report_resolved: "text-blue-600",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Logs</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-sm">
        <select value={filter.action} onChange={(e) => setFilter({ action: e.target.value })}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Actions</option>
          <option value="channel_approved">Channel Approved</option>
          <option value="channel_rejected">Channel Rejected</option>
          <option value="user_warned">User Warned</option>
          <option value="user_banned">User Banned</option>
          <option value="user_muted">User Muted</option>
          <option value="message_deleted">Message Deleted</option>
          <option value="note_approved">Note Approved</option>
          <option value="note_rejected">Note Rejected</option>
          <option value="report_resolved">Report Resolved</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No logs found</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log.id} className="px-5 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${actionColors[log.action] || "text-gray-700"}`}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm text-gray-500">by {log.moderator_name || "System"}</span>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                </div>
                {log.reason && <p className="text-xs text-gray-500 mt-1">Reason: {log.reason}</p>}
                {log.target_user_name && <p className="text-xs text-gray-400 mt-0.5">Target: {log.target_user_name}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
