import { useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

function Skeleton() {
  return (
    <tr className="border-b border-slate-100">
      {[1,2,3,4,5,6,7].map(i => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${50+i*6}%` }} />
        </td>
      ))}
    </tr>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filters,  setFilters]  = useState({ branch: "", is_active: "" });
  const [selected, setSelected] = useState(null);
  const [total,    setTotal]    = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)                  params.search    = search;
      if (filters.branch)          params.branch    = filters.branch;
      if (filters.is_active !== "") params.is_active = filters.is_active;
      const res = await api.get("/admin/students", { params });
      const data = res.data.results || res.data.data || [];
      setUsers(data);
      setTotal(res.data.count || data.length);
    } catch { toast.error("Failed to load students"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, filters]);

  const action = async (id, endpoint) => {
    try {
      await api.post(`/admin/students/${id}/${endpoint}`);
      toast.success("Done");
      load();
    } catch { toast.error("Action failed"); }
  };

  const active   = users.filter(u => u.is_active).length;
  const inactive = users.filter(u => !u.is_active).length;

  return (
    <div className="space-y-5 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">View, manage, and moderate student accounts</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",    value: total,    cls: "bg-slate-50 border-slate-200 text-slate-700" },
          { label: "Active",   value: active,   cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "Inactive", value: inactive, cls: "bg-red-50 border-red-200 text-red-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.cls}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" className="input-field pl-9" placeholder="Search by name, email, or student ID..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <input type="text" className="input-field w-full sm:w-36" placeholder="Branch..." value={filters.branch} onChange={e => setFilters(f => ({ ...f, branch: e.target.value }))} />
          <select className="input-field w-full sm:w-36" value={filters.is_active} onChange={e => setFilters(f => ({ ...f, is_active: e.target.value }))}>
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Student","ID","Email","Branch","Year","Status","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
                : users.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-slate-200 mx-auto mb-3">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      </svg>
                      <p className="text-slate-500 font-medium">No students found</p>
                    </td>
                  </tr>
                )
                : users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{u.full_name?.[0]?.toUpperCase()}</span>
                        </div>
                        <span className="font-medium text-slate-800">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">{u.student_id}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">{u.email}</td>
                    <td className="px-4 py-3.5">
                      {u.branch && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{u.branch}</span>}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">Year {u.semester}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setSelected(u)} className="text-xs font-medium text-slate-600 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">View</button>
                        {u.is_active
                          ? <button onClick={() => action(u.id, "deactivate")} className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Deactivate</button>
                          : <button onClick={() => action(u.id, "activate")}   className="text-xs font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors">Activate</button>
                        }
                        <button onClick={() => action(u.id, "reset-password")} className="text-xs font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors">Reset</button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        {!loading && users.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            Showing {users.length} of {total} students
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <Modal title="Student Details" onClose={() => setSelected(null)}>
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-100">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center">
              <span className="text-white text-xl font-bold">{selected.full_name?.[0]?.toUpperCase()}</span>
            </div>
            <div>
              <p className="font-bold text-slate-900 text-base">{selected.full_name}</p>
              <p className="text-sm text-slate-500">{selected.email}</p>
              <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${selected.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {selected.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {[
              ["Student ID",     selected.student_id],
              ["Branch",         selected.branch || "—"],
              ["Year",           `Year ${selected.semester}`],
              ["Section",        selected.section || "—"],
              ["Role",           selected.role],
              ["Email Verified", selected.email_verified ? "Yes" : "No"],
              ["Joined",         new Date(selected.created_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-sm text-slate-500">{k}</span>
                <span className="text-sm font-medium text-slate-800">{v}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-5">
            {selected.is_active
              ? <button onClick={() => { action(selected.id, "deactivate"); setSelected(null); }} className="flex-1 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors">Deactivate</button>
              : <button onClick={() => { action(selected.id, "activate");   setSelected(null); }} className="flex-1 py-2 text-sm font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors">Activate</button>
            }
            <button onClick={() => { action(selected.id, "reset-password"); setSelected(null); }} className="flex-1 py-2 text-sm font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors">Reset Password</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
