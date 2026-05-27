import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function ContestsPage() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("upcoming");

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/contests/", { params: { status: tab } });
        setContests(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [tab]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Contests</h1>
          <p className="page-subtitle">Competitive programming challenges</p>
        </div>
      </div>

      <div className="tab-pills">
        {[{ id: "upcoming", label: "Upcoming" }, { id: "active", label: "Active" }, { id: "past", label: "Past" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={tab === t.id ? "tab-pill-active" : "tab-pill-inactive"}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
        </div>
      ) : contests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <p className="empty-state-title">No {tab} contests</p>
          <p className="empty-state-desc">Check back later for new challenges</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contests.map((contest) => (
            <Link key={contest.id} to={`/contests/${contest.id}`} className="card-interactive p-5 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-violet flex items-center justify-center text-white flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-surface-800">{contest.title}</h3>
                <p className="text-sm text-surface-400 mt-0.5">{contest.description?.slice(0, 100)}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-surface-400">{formatDate(contest.start_time)}</span>
                  {contest.duration && <span className="text-xs text-surface-400">• {contest.duration} min</span>}
                  {contest.participants_count !== undefined && <span className="text-xs text-surface-400">• {contest.participants_count} participants</span>}
                </div>
              </div>
              <div className="flex-shrink-0">
                {tab === "upcoming" && <span className="badge-primary">Upcoming</span>}
                {tab === "active" && <span className="badge-success">Live</span>}
                {tab === "past" && <span className="badge-neutral">Ended</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
