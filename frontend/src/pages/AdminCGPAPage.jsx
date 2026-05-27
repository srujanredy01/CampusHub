import { useState, useEffect } from "react";
import api from "../services/api";

export default function AdminCGPAPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try { const params = search ? { search } : {}; const res = await api.get("/admin/cgpa/", { params }); setRecords(Array.isArray(res.data) ? res.data : res.data.results || []); }
      catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, [search]);

  return (
    <div className="page-container space-y-6">
      <div><h1 className="page-title">Academic Records</h1><p className="page-subtitle">Manage student CGPA and grades</p></div>
      <div className="search-container max-w-md">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" className="search-input" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="table-container">
        <table className="w-full">
          <thead className="table-head"><tr><th className="th">Student</th><th className="th">Department</th><th className="th">CGPA</th><th className="th">Semester</th></tr></thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => <tr key={i} className="tr"><td colSpan={4} className="td"><div className="skeleton h-8 rounded-md" /></td></tr>) :
            records.length === 0 ? <tr><td colSpan={4} className="td text-center py-12 text-surface-400">No records</td></tr> :
            records.map((r) => (
              <tr key={r.id} className="tr">
                <td className="td"><div className="flex items-center gap-2"><div className="avatar-xs text-2xs">{(r.student?.first_name || "S")[0]}</div><span className="text-sm text-surface-700">{r.student?.first_name || r.student?.username || "—"}</span></div></td>
                <td className="td text-sm text-surface-500">{r.department || "—"}</td>
                <td className="td text-sm font-semibold text-surface-800 tabular-nums">{r.cgpa?.toFixed(2) || "—"}</td>
                <td className="td text-sm text-surface-500">{r.current_semester || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
