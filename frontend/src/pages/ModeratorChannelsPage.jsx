import React, { useState, useEffect } from "react";
import moderationService from "../services/moderationService";

export default function ModeratorChannelsPage() {
  const [data, setData] = useState({ pending_requests: [], channels: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const res = await moderationService.getChannelModeration();
      setData(res.data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleAction = async (action, targetId, reason = "") => {
    try {
      await moderationService.channelAction({ action, target_id: targetId, reason });
      fetchData();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Channel Moderation</h1>

      {/* Pending Requests */}
      {data.pending_requests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Pending Channel Requests</h2>
          <div className="space-y-3">
            {data.pending_requests.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">#{r.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{r.description}</p>
                    <div className="flex gap-3 mt-2 text-xs text-gray-400">
                      <span>Type: {r.channel_type}</span>
                      <span>By: {r.requested_by}</span>
                      {r.section && <span>Section: {r.section}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAction("approve_request", r.id)}
                      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button>
                    <button onClick={() => handleAction("reject_request", r.id, "Does not meet guidelines")}
                      className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700">Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Channels */}
      <h2 className="text-lg font-semibold text-gray-800 mb-3">Active Channels</h2>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Channel</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Members</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.channels.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">#{c.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.channel_type}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{c.member_count}</td>
                <td className="px-4 py-3">
                  {c.is_locked && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Locked</span>}
                  {c.is_archived && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Archived</span>}
                  {!c.is_locked && !c.is_archived && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {!c.is_locked ? (
                      <button onClick={() => handleAction("lock", c.id)} className="text-xs px-2 py-1 text-orange-600 hover:bg-orange-50 rounded">Lock</button>
                    ) : (
                      <button onClick={() => handleAction("unlock", c.id)} className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded">Unlock</button>
                    )}
                    <button onClick={() => handleAction("archive", c.id)} className="text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded">Archive</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
