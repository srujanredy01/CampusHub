import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import adminService from "../services/adminService";

export default function AdminChannelsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await adminService.getChannelsOverview();
      setData(res.data?.data || res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = async (channelId, action) => {
    try {
      await adminService.channelAction(channelId, action);
      toast.success(`Channel ${action}ed`);
      fetchData();
    } catch (err) { toast.error("Action failed"); }
  };

  if (loading) return (
    <div className="page-container space-y-6">
      <div className="skeleton h-10 w-64 rounded-lg" />
      <div className="skeleton h-64 rounded-xl" />
    </div>
  );

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title">Channel Overview</h1>
        <p className="page-subtitle">Monitor and manage communication channels</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-primary-600">{data?.total ?? 0}</p>
          <p className="text-xs text-surface-500">Total</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-success-600">{data?.active ?? 0}</p>
          <p className="text-xs text-surface-500">Active</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-warning-600">{data?.locked ?? 0}</p>
          <p className="text-xs text-surface-500">Locked</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-surface-400">{data?.archived ?? 0}</p>
          <p className="text-xs text-surface-500">Archived</p>
        </div>
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead className="table-head">
            <tr>
              <th className="th">Channel</th>
              <th className="th">Type</th>
              <th className="th">Members</th>
              <th className="th">Messages</th>
              <th className="th">Visibility</th>
              <th className="th">Status</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.channels || []).map((ch) => (
              <tr key={ch.id} className="tr">
                <td className="td font-medium text-surface-800">#{ch.name}</td>
                <td className="td"><span className="badge-neutral text-xs">{ch.channel_type}</span></td>
                <td className="td text-sm text-surface-600">{ch.member_count}</td>
                <td className="td text-sm text-surface-600">{ch.message_count}</td>
                <td className="td text-sm text-surface-600">{ch.visibility}</td>
                <td className="td">
                  <div className="flex gap-1">
                    {ch.is_locked && <span className="text-xs px-1.5 py-0.5 rounded bg-warning-50 text-warning-700">Locked</span>}
                    {ch.is_archived && <span className="text-xs px-1.5 py-0.5 rounded bg-surface-100 text-surface-500">Archived</span>}
                    {ch.is_active && !ch.is_locked && !ch.is_archived && <span className="status-online" />}
                  </div>
                </td>
                <td className="td">
                  <div className="flex gap-1">
                    {!ch.is_locked && ch.is_active && (
                      <button onClick={() => handleAction(ch.id, "lock")}
                        className="text-xs px-2 py-1 rounded bg-warning-50 text-warning-700 hover:bg-warning-100">Lock</button>
                    )}
                    {ch.is_locked && (
                      <button onClick={() => handleAction(ch.id, "unlock")}
                        className="text-xs px-2 py-1 rounded bg-success-50 text-success-700 hover:bg-success-100">Unlock</button>
                    )}
                    {ch.is_active && (
                      <button onClick={() => handleAction(ch.id, "archive")}
                        className="text-xs px-2 py-1 rounded bg-surface-100 text-surface-600 hover:bg-surface-200">Archive</button>
                    )}
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
