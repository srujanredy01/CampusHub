import { useState, useEffect } from "react";
import api from "../services/api";

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/assignments/");
        setAssignments(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const filtered = assignments.filter((a) => {
    if (tab === "pending") return !a.submitted;
    if (tab === "submitted") return a.submitted;
    return true;
  });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Assignments</h1>
          <p className="page-subtitle">Track and submit your coursework</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-pills">
        {[{ id: "pending", label: "Pending" }, { id: "submitted", label: "Submitted" }, { id: "all", label: "All" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={tab === t.id ? "tab-pill-active" : "tab-pill-inactive"}>{t.label}</button>
        ))}
      </div>

      {/* Assignment List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
          </div>
          <p className="empty-state-title">No {tab} assignments</p>
          <p className="empty-state-desc">{tab === "pending" ? "You're all caught up!" : "Nothing here yet"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <div key={a.id} className="card-padded flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-surface-800">{a.title}</h3>
                <p className="text-xs text-surface-400 mt-0.5">{a.subject || a.course || "General"}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-xs text-surface-500">Due {formatDate(a.due_date)}</p>
                </div>
                {a.submitted ? (
                  <span className="badge-success">Submitted</span>
                ) : (
                  <span className="badge-warning">Pending</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
