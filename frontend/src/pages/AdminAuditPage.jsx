import { useState, useEffect } from "react";
import api from "../services/api";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = {};
        if (search) params.search = search;
        if (actionFilter !== "all") params.action = actionFilter;
        const res = await api.get("/admin/audit/", { params });
        setLogs(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [search, actionFilter]);

  const actions = ["all", "login", "create", "update", "delete", "view"];

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">Complete activity trail across the platform</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="search-container flex-1">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" className="search-input" placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {actions.map((a) => (
            <button key={a} onClick={() => setActionFilter(a)}
              className={actionFilter === a ? "filter-pill-active" : "filter-pill-inactive"}>
              {a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead className="table-head">
            <tr>
              <th className="th">User</th>
              <th className="th">Action</th>
              <th className="th">Details</th>
              <th className="th">IP</th>
              <th className="th">Time</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(10)].map((_, i) => <tr key={i} className="tr"><td colSpan={5} className="td"><div className="skeleton h-8 rounded-md" /></td></tr>)
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="td text-center py-12 text-surface-400">No audit logs found</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="tr">
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="avatar-xs text-2xs">{(log.user?.username || "S")[0]}</div>
                      <span className="text-sm text-surface-700">{log.user?.username || "System"}</span>
                    </div>
                  </td>
                  <td className="td"><span className="badge-neutral">{log.action || log.action_type}</span></td>
                  <td className="td text-sm text-surface-500 max-w-xs truncate">{log.details || log.description || "—"}</td>
                  <td className="td text-xs text-surface-400 font-mono">{log.ip_address || "—"}</td>
                  <td className="td text-xs text-surface-400">{log.created_at ? new Date(log.created_at).toLocaleString() : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
