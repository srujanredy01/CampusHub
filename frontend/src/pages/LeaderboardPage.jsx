import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";

export default function LeaderboardPage() {
  const { user } = useSelector((s) => s.auth);
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/leaderboard/", { params: { period } });
        setLeaders(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [period]);

  const getMedal = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Leaderboard</h1>
          <p className="page-subtitle">Top coders on CampusHub</p>
        </div>
        <div className="tab-pills">
          {[{ id: "all", label: "All Time" }, { id: "month", label: "This Month" }, { id: "week", label: "This Week" }].map((t) => (
            <button key={t.id} onClick={() => setPeriod(t.id)}
              className={period === t.id ? "tab-pill-active" : "tab-pill-inactive"}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="card-flush">
        <div className="table-head">
          <div className="flex items-center px-4 py-3">
            <span className="th w-16">Rank</span>
            <span className="th flex-1">User</span>
            <span className="th w-24 text-right">Solved</span>
            <span className="th w-24 text-right">Score</span>
          </div>
        </div>
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(10)].map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}
          </div>
        ) : leaders.length === 0 ? (
          <div className="empty-state py-12">
            <p className="empty-state-title">No data yet</p>
            <p className="empty-state-desc">Start solving problems to appear on the leaderboard</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {leaders.map((entry, idx) => {
              const rank = idx + 1;
              const isMe = entry.user?.id === user?.id || entry.username === user?.username;
              return (
                <div key={entry.id || idx} className={`flex items-center px-4 py-3 ${isMe ? "bg-primary-50/50" : "hover:bg-surface-50"} transition-colors`}>
                  <div className="w-16 flex items-center gap-1">
                    {getMedal(rank) ? (
                      <span className="text-lg">{getMedal(rank)}</span>
                    ) : (
                      <span className="text-sm font-semibold text-surface-500 tabular-nums">{rank}</span>
                    )}
                  </div>
                  <div className="flex-1 flex items-center gap-2.5 min-w-0">
                    <div className="avatar-sm text-xs">{(entry.user?.first_name || entry.username || "U")[0]}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-800 truncate">
                        {entry.user?.first_name || entry.username || "User"} {isMe && <span className="text-xs text-primary-600">(You)</span>}
                      </p>
                    </div>
                  </div>
                  <span className="w-24 text-right text-sm text-surface-600 tabular-nums">{entry.problems_solved || 0}</span>
                  <span className="w-24 text-right text-sm font-semibold text-surface-800 tabular-nums">{entry.score || 0}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
