import React, { useState, useEffect } from "react";
import moderationService from "../services/moderationService";

export default function ModeratorApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ request_type: "", status: "pending" });

  useEffect(() => { fetchApprovals(); }, [filter]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await moderationService.getApprovals(filter);
      setApprovals(res.data.results || res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const reviewApproval = async (id, status, notes = "") => {
    try {
      await moderationService.reviewApproval(id, { status, review_notes: notes });
      fetchApprovals();
    } catch (err) { console.error(err); }
  };

  const typeIcons = { channel: "📺", roadmap: "🗺️", note: "📝", study_group: "👥", event: "🗓️" };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Approval Queue</h1>

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select value={filter.request_type} onChange={(e) => setFilter({...filter, request_type: e.target.value})}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Types</option>
            <option value="channel">Channels</option>
            <option value="roadmap">Roadmaps</option>
            <option value="note">Notes</option>
            <option value="study_group">Study Groups</option>
            <option value="event">Events</option>
          </select>
          <select value={filter.status} onChange={(e) => setFilter({...filter, status: e.target.value})}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="needs_changes">Needs Changes</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {approvals.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <span className="text-2xl">{typeIcons[a.request_type] || "📄"}</span>
                <div>
                  <h3 className="font-medium text-gray-900">{a.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{a.description || "No description"}</p>
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    <span>Type: {a.request_type}</span>
                    <span>By: {a.requested_by_name}</span>
                    <span>{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              {a.status === "pending" && (
                <div className="flex gap-2">
                  <button onClick={() => reviewApproval(a.id, "approved")}
                    className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">Approve</button>
                  <button onClick={() => reviewApproval(a.id, "needs_changes", "Please revise")}
                    className="px-3 py-1.5 text-xs bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">Changes</button>
                  <button onClick={() => reviewApproval(a.id, "rejected", "Does not meet criteria")}
                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700">Reject</button>
                </div>
              )}
              {a.status !== "pending" && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  a.status === "approved" ? "bg-green-100 text-green-700" :
                  a.status === "rejected" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}>{a.status}</span>
              )}
            </div>
          </div>
        ))}
        {approvals.length === 0 && <div className="text-center text-gray-400 py-8">No approval requests</div>}
      </div>
    </div>
  );
}
