import React, { useState, useEffect } from "react";
import moderationService from "../services/moderationService";

export default function ModeratorReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: "pending", priority: "", content_type: "" });
  const [selectedReport, setSelectedReport] = useState(null);

  useEffect(() => { fetchReports(); }, [filters]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await moderationService.getReports(filters);
      setReports(res.data.results || res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const resolveReport = async (id, status, note = "") => {
    try {
      await moderationService.resolveReport(id, { status, resolution_note: note });
      fetchReports();
      setSelectedReport(null);
    } catch (err) { console.error(err); }
  };

  const priorityColors = { critical: "bg-red-100 text-red-700", high: "bg-orange-100 text-orange-700", medium: "bg-yellow-100 text-yellow-700", low: "bg-gray-100 text-gray-600" };
  const statusColors = { pending: "bg-yellow-100 text-yellow-700", investigating: "bg-blue-100 text-blue-700", resolved: "bg-green-100 text-green-700", rejected: "bg-gray-100 text-gray-600" };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Content Reports</h1>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select value={filters.priority} onChange={(e) => setFilters({...filters, priority: e.target.value})}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select value={filters.content_type} onChange={(e) => setFilters({...filters, content_type: e.target.value})}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">All Types</option>
            <option value="message">Message</option>
            <option value="note">Note</option>
            <option value="roadmap">Roadmap</option>
            <option value="study_group">Study Group</option>
            <option value="profile">Profile</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Report List */}
          <div className="lg:col-span-2 space-y-3">
            {reports.map((r) => (
              <div key={r.id} onClick={() => setSelectedReport(r)}
                className={`bg-white rounded-xl border p-4 shadow-sm cursor-pointer transition-all hover:shadow-md ${selectedReport?.id === r.id ? "border-blue-300 ring-1 ring-blue-200" : "border-gray-100"}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[r.priority]}`}>{r.priority}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[r.status]}`}>{r.status}</span>
                      <span className="text-xs text-gray-400">{r.content_type}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{r.reason}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{r.content_preview || r.description}</p>
                  </div>
                  <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-3 mt-2 text-xs text-gray-400">
                  <span>Reporter: {r.reporter_name}</span>
                  {r.reported_user_name && <span>Target: {r.reported_user_name}</span>}
                </div>
              </div>
            ))}
            {reports.length === 0 && <div className="text-center text-gray-400 py-8">No reports found</div>}
          </div>

          {/* Detail Panel */}
          <div>
            {selectedReport ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 sticky top-6">
                <h3 className="font-semibold text-gray-900 mb-3">Report Details</h3>
                <div className="space-y-3 text-sm">
                  <div><span className="text-gray-500">Type:</span> <span className="font-medium">{selectedReport.content_type}</span></div>
                  <div><span className="text-gray-500">Reason:</span> <span className="font-medium">{selectedReport.reason}</span></div>
                  <div><span className="text-gray-500">Reporter:</span> <span>{selectedReport.reporter_name}</span></div>
                  <div><span className="text-gray-500">Reported User:</span> <span>{selectedReport.reported_user_name || "N/A"}</span></div>
                  {selectedReport.description && <div><span className="text-gray-500">Description:</span><p className="mt-1 text-gray-700">{selectedReport.description}</p></div>}
                  {selectedReport.content_preview && (
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 border">
                      <p className="font-medium text-gray-500 mb-1">Content Preview:</p>
                      {selectedReport.content_preview}
                    </div>
                  )}
                </div>

                {selectedReport.status === "pending" || selectedReport.status === "investigating" ? (
                  <div className="mt-4 space-y-2">
                    <button onClick={() => resolveReport(selectedReport.id, "investigating")}
                      className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Mark Investigating</button>
                    <button onClick={() => resolveReport(selectedReport.id, "resolved", "Action taken")}
                      className="w-full px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Resolve</button>
                    <button onClick={() => resolveReport(selectedReport.id, "rejected", "Not a violation")}
                      className="w-full px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">Reject</button>
                  </div>
                ) : (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
                    <p className="text-gray-500">Status: <span className="font-medium">{selectedReport.status}</span></p>
                    {selectedReport.resolution_note && <p className="text-gray-600 mt-1">{selectedReport.resolution_note}</p>}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
                Select a report to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
