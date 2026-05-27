import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-toastify";

export default function ContestDetailPage() {
  const { id } = useParams();
  const [contest, setContest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await api.get(`/contests/${id}/`); setContest(res.data); }
      catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  if (loading) return <div className="page-container"><div className="skeleton h-64 rounded-xl" /></div>;
  if (!contest) return <div className="page-container empty-state"><p className="empty-state-title">Contest not found</p><Link to="/contests" className="btn-primary mt-4">Back to Contests</Link></div>;

  return (
    <div className="page-container max-w-4xl space-y-6">
      <Link to="/contests" className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Contests
      </Link>

      <div className="card-padded">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-surface-900">{contest.title}</h1>
            <p className="text-sm text-surface-500 mt-1">{contest.description}</p>
          </div>
          {contest.status === "active" && (
            <button className="btn-primary flex-shrink-0">Enter Contest</button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-surface-100">
          <div><p className="text-xs text-surface-400">Start</p><p className="text-sm font-medium text-surface-700">{contest.start_time ? new Date(contest.start_time).toLocaleString() : "—"}</p></div>
          <div><p className="text-xs text-surface-400">Duration</p><p className="text-sm font-medium text-surface-700">{contest.duration || "—"} min</p></div>
          <div><p className="text-xs text-surface-400">Problems</p><p className="text-sm font-medium text-surface-700">{contest.problems_count || contest.problems?.length || "—"}</p></div>
          <div><p className="text-xs text-surface-400">Participants</p><p className="text-sm font-medium text-surface-700">{contest.participants_count || 0}</p></div>
        </div>
      </div>

      {/* Problems list */}
      {contest.problems && contest.problems.length > 0 && (
        <div className="card-flush">
          <div className="px-5 py-3 border-b border-surface-100">
            <h3 className="text-base font-semibold text-surface-900">Problems</h3>
          </div>
          <div className="divide-y divide-surface-100">
            {contest.problems.map((p, idx) => (
              <div key={p.id || idx} className="flex items-center px-5 py-3 hover:bg-surface-50 transition-colors">
                <span className="text-sm text-surface-400 w-8">{idx + 1}.</span>
                <span className="text-sm font-medium text-surface-800 flex-1">{p.title}</span>
                <span className={`badge-${p.difficulty === "Easy" ? "easy" : p.difficulty === "Medium" ? "medium" : "hard"}`}>{p.difficulty}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
