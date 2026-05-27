import { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = {};
        if (search) params.search = search;
        if (roleFilter !== "all") params.role = roleFilter;
        const res = await api.get("/admin/users/", { params });
        setUsers(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [search, roleFilter]);

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage all platform users</p>
        </div>
        <span className="badge-neutral">{users.length} users</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="search-container flex-1">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" className="search-input" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="tab-pills">
          {[{ id: "all", label: "All" }, { id: "student", label: "Students" }, { id: "faculty", label: "Faculty" }, { id: "admin", label: "Admins" }].map((t) => (
            <button key={t.id} onClick={() => setRoleFilter(t.id)}
              className={roleFilter === t.id ? "tab-pill-active" : "tab-pill-inactive"}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="table-container">
        <table className="w-full">
          <thead className="table-head">
            <tr>
              <th className="th">User</th>
              <th className="th">Email</th>
              <th className="th">Role</th>
              <th className="th">Joined</th>
              <th className="th">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="tr"><td colSpan={5} className="td"><div className="skeleton h-8 rounded-md" /></td></tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="td text-center py-12 text-surface-400">No users found</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="tr">
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <div className="avatar-sm text-xs">{(u.first_name || u.username || "U")[0]}</div>
                      <div>
                        <p className="text-sm font-medium text-surface-800">{u.first_name} {u.last_name}</p>
                        <p className="text-xs text-surface-400">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td text-sm text-surface-600">{u.email}</td>
                  <td className="td"><span className={`badge-${u.is_staff ? "primary" : "neutral"}`}>{u.is_staff ? "Admin" : "Student"}</span></td>
                  <td className="td text-xs text-surface-400">{u.date_joined ? new Date(u.date_joined).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
                  <td className="td"><span className={u.is_active ? "status-online" : "status-offline"} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
