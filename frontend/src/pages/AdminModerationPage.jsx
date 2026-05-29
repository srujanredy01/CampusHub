import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import adminService from "../services/adminService";
import { useAdminWebSocket } from "../hooks/useAdminWebSocket";

export default function AdminModerationPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isConnected } = useAdminWebSocket();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await adminService.getModerationOverview();
        setData(res.data?.data || res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div className="page-container space-y-6">
      <div className="skeleton h-10 w-64 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Moderation Overview</h1>
          <p className="page-subtitle">Pending items requiring admin attention</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-success-500 animate-pulse" : "bg-surface-300"}`} />
          <span className="text-xs text-surface-500">Auto-refreshing</span>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard label="Pending Reports" value={data?.pending_reports ?? 0} color="danger" />
        <SummaryCard label="Channel Requests" value={data?.pending_channel_requests ?? 0} color="warning" />
        <SummaryCard label="Roadmap Reviews" value={data?.pending_roadmap_reviews ?? 0} color="info" />
        <SummaryCard label="Content Flags" value={data?.pending_content_flags ?? 0} color="warning" />
        <SummaryCard label="Total Pending" value={data?.total_pending ?? 0} color="primary" />
      </div>

      {/* Recent Reports */}
      <div className="card-padded">
        <h3 className="text-base font-semibold text-surface-900 mb-4">Recent Reports</h3>
        {data?.recent_reports?.length > 0 ? (
          <div className="space-y-3">
            {data.recent_reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between py-3 border-b border-surface-100 last:border-0">
                <div className="flex-1">
                  <p className="text-sm text-surface-700">{report.reason || "Content report"}</p>
                  <p className="text-xs text-surface-400">
                    {report.created_at ? new Date(report.created_at).toLocaleString() : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="text-xs px-3 py-1.5 rounded bg-success-50 text-success-700 hover:bg-success-100 font-medium">
                    Approve
                  </button>
                  <button className="text-xs px-3 py-1.5 rounded bg-danger-50 text-danger-700 hover:bg-danger-100 font-medium">
                    Reject
                  </button>
                  <button className="text-xs px-3 py-1.5 rounded bg-warning-50 text-warning-700 hover:bg-warning-100 font-medium">
                    Escalate
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-surface-400">
            <p className="text-sm">No pending reports</p>
            <p className="text-xs mt-1">All clear! Reports will appear here in real-time.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  const colors = {
    primary: "border-primary-200 bg-primary-50 text-primary-700",
    success: "border-success-200 bg-success-50 text-success-700",
    warning: "border-warning-200 bg-warning-50 text-warning-700",
    danger: "border-danger-200 bg-danger-50 text-danger-700",
    info: "border-info-200 bg-info-50 text-info-700",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs mt-1 opacity-75">{label}</p>
    </div>
  );
}
