import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import adminService from "../services/adminService";

export default function AdminStudyGroupsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await adminService.getStudyGroupsOverview();
      setData(res.data?.data || res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = async (groupId, action) => {
    try {
      await adminService.studyGroupAction(groupId, action);
      toast.success(`Group ${action}d`);
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
        <h1 className="page-title">Study Groups Overview</h1>
        <p className="page-subtitle">Monitor and manage all study groups</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-primary-600">{data?.total ?? 0}</p>
          <p className="text-xs text-surface-500">Total Groups</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-success-600">{data?.active ?? 0}</p>
          <p className="text-xs text-surface-500">Active</p>
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
              <th className="th">Group</th>
              <th className="th">Subject</th>
              <th className="th">Branch</th>
              <th className="th">Members</th>
              <th className="th">Visibility</th>
              <th className="th">Status</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.groups || []).map((g) => (
              <tr key={g.id} className="tr">
                <td className="td font-medium text-surface-800">{g.name}</td>
                <td className="td text-sm text-surface-600">{g.subject || "—"}</td>
                <td className="td text-sm text-surface-600">{g.branch || "—"}</td>
                <td className="td text-sm text-surface-600">{g.member_count ?? 0}</td>
                <td className="td"><span className="badge-neutral">{g.visibility}</span></td>
                <td className="td"><span className={g.is_active ? "status-online" : "status-offline"} /></td>
                <td className="td">
                  {g.is_active ? (
                    <button onClick={() => handleAction(g.id, "archive")}
                      className="text-xs px-2 py-1 rounded bg-warning-50 text-warning-700 hover:bg-warning-100 font-medium">Archive</button>
                  ) : (
                    <button onClick={() => handleAction(g.id, "activate")}
                      className="text-xs px-2 py-1 rounded bg-success-50 text-success-700 hover:bg-success-100 font-medium">Activate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
