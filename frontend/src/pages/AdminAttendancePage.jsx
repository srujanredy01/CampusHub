import { useState, useEffect } from "react";
import api from "../services/api";

export default function AdminAttendancePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try { const params = search ? { search } : {}; const res = await api.get("/admin/attendance/", { params }); setRecords(Array.isArray(res.data) ? res.data : res.data.results || []); }
      catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, [search]);

  return (
    <div className="page-container space-y-6">
      <div><h1 className="page-title">Attendance Management</h1><p className="page-subtitle">Monitor student attendance across sections</p></div>
      <div className="search-container max-w-md">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" className="search-input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="table-container">
        <table className="w-full">
          <thead className="table-head"><tr><th className="th">Student</th><th className="th">Subject</th><th className="th">Attended</th><th className="th">Total</th><th className="th">Percentage</th></tr></thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => <tr key={i} className="tr"><td colSpan={5} className="td"><div className="skeleton h-8 rounded-md" /></td></tr>) :
            records.length === 0 ? <tr><td colSpan={5} className="td text-center py-12 text-surface-400">No records</td></tr> :
            records.map((r, idx) => {
              const pct = r.total > 0 ? Math.round((r.attended / r.total) * 100) : 0;
              return (
                <tr key={r.id || idx} className="tr">
                  <td className="td text-sm text-surface-700">{r.student?.username || "—"}</td>
                  <td className="td text-sm text-surface-500">{r.subject || "—"}</td>
                  <td className="td text-sm text-surface-700 tabular-nums">{r.attended || 0}</td>
                  <td className="td text-sm text-surface-500 tabular-nums">{r.total || 0}</td>
                  <td className="td"><span className={`text-sm font-semibold tabular-nums ${pct >= 75 ? "text-success-600" : "text-danger-600"}`}>{pct}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
