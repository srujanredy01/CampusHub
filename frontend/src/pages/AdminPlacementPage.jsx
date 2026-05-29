import { useState, useEffect } from "react";
import adminService from "../services/adminService";

export default function AdminPlacementPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await adminService.getPlacementOverview();
        setData(res.data?.data || res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  if (loading) return (
    <div className="page-container space-y-6">
      <div className="skeleton h-10 w-64 rounded-lg" />
      <div className="skeleton h-64 rounded-xl" />
    </div>
  );

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title">Placement Overview</h1>
        <p className="page-subtitle">View-only placement tracking and trends</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-primary-600">{data?.total_applications ?? 0}</p>
          <p className="text-xs text-surface-500">Total Applications</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-success-600">
            {(data?.by_status || []).find((s) => s.status === "offer")?.count ?? 0}
          </p>
          <p className="text-xs text-surface-500">Offers Received</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-info-600">
            {(data?.by_status || []).find((s) => s.status === "applied")?.count ?? 0}
          </p>
          <p className="text-xs text-surface-500">Active Applications</p>
        </div>
      </div>

      {/* Status Breakdown */}
      {data?.by_status?.length > 0 && (
        <div className="card-padded">
          <h3 className="text-base font-semibold text-surface-900 mb-3">Application Status Breakdown</h3>
          <div className="flex flex-wrap gap-3">
            {data.by_status.map((s) => (
              <div key={s.status} className="px-4 py-2 rounded-lg bg-surface-50 border border-surface-100">
                <p className="text-lg font-bold text-surface-900">{s.count}</p>
                <p className="text-xs text-surface-500 capitalize">{s.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Applications */}
      <div className="card-padded">
        <h3 className="text-base font-semibold text-surface-900 mb-4">Recent Applications</h3>
        <div className="table-container">
          <table className="w-full">
            <thead className="table-head">
              <tr>
                <th className="th">Student</th>
                <th className="th">Company</th>
                <th className="th">Role</th>
                <th className="th">Status</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recent_applications || []).map((app) => (
                <tr key={app.id} className="tr">
                  <td className="td font-medium text-surface-800">{app.student__full_name}</td>
                  <td className="td text-sm text-surface-600">{app.company_name}</td>
                  <td className="td text-sm text-surface-600">{app.role_title}</td>
                  <td className="td"><span className="badge-neutral capitalize">{app.status}</span></td>
                  <td className="td text-xs text-surface-400">{app.created_at ? new Date(app.created_at).toLocaleDateString() : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-info-50 border border-info-200">
        <p className="text-sm text-info-700">
          <strong>Note:</strong> This is a view-only overview. Students manage their own placement tracking.
        </p>
      </div>
    </div>
  );
}
