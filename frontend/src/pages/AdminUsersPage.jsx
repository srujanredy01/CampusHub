import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter !== "all") params.role = roleFilter;
      const res = await api.get("/admin/students", { params });
      const data = res.data?.data?.results || res.data?.results || res.data?.data || [];
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to delete "${user.full_name}" (${user.email})? This action cannot be undone.`)) return;
    try {
      await api.delete(`/admin/students/${user.id}`);
      setUsers(users.filter((u) => u.id !== user.id));
      toast.success("User deleted successfully");
    } catch (err) {
      const msg = err.response?.data?.error?.message || "Failed to delete user";
      toast.error(msg);
    }
  };

  const handleToggleActive = async (user) => {
    const action = user.is_active ? "deactivate" : "activate";
    try {
      await api.post(`/admin/students/${user.id}/${action}`);
      setUsers(users.map((u) => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
      toast.success(`User ${action}d successfully`);
    } catch (err) {
      const msg = err.response?.data?.error?.message || `Failed to ${action} user`;
      toast.error(msg);
    }
  };

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
              <th className="th">Branch</th>
              <th className="th">Joined</th>
              <th className="th">Status</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i} className="tr"><td colSpan={7} className="td"><div className="skeleton h-8 rounded-md" /></td></tr>
              ))
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="td text-center py-12 text-surface-400">No users found</td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="tr">
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <div className="avatar-sm text-xs">{(u.full_name || "U")[0]}</div>
                      <div>
                        <p className="text-sm font-medium text-surface-800">{u.full_name}</p>
                        <p className="text-xs text-surface-400">{u.student_id || "—"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td text-sm text-surface-600">{u.email}</td>
                  <td className="td">
                    <span className={`badge-${u.role === "admin" || u.role === "super_admin" ? "primary" : u.role === "faculty" ? "warning" : "neutral"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="td text-sm text-surface-600">{u.branch || "—"}</td>
                  <td className="td text-xs text-surface-400">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                  </td>
                  <td className="td">
                    <span className={u.is_active ? "status-online" : "status-offline"} />
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`text-xs px-2 py-1 rounded font-medium ${u.is_active ? "bg-warning-50 text-warning-700 hover:bg-warning-100" : "bg-success-50 text-success-700 hover:bg-success-100"}`}
                        title={u.is_active ? "Deactivate" : "Activate"}
                      >
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="text-xs px-2 py-1 rounded font-medium bg-danger-50 text-danger-700 hover:bg-danger-100"
                        title="Delete user"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
