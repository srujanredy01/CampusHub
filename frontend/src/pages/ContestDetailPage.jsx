import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { contestService } from "../services/contestService";
import { toast } from "react-toastify";

function ContestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contest, setContest] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("problems");

  useEffect(() => {
    loadContest();
  }, [id]);

  const loadContest = async () => {
    setLoading(true);
    try {
      const [contestRes, lbRes] = await Promise.all([
        contestService.getContest(id),
        contestService.getLeaderboard(id).catch(() => null),
      ]);
      setContest(contestRes.data.data);
      if (lbRes) setLeaderboard(lbRes.data.data);
    } catch {
      toast.error("Failed to load contest");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      await contestService.register(id);
      toast.success("Registered!");
      loadContest();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || "Registration failed");
    }
  };

  const getTimeRemaining = () => {
    if (!contest) return "";
    const now = new Date();
    const end = new Date(contest.ends_at);
    const start = new Date(contest.starts_at);

    if (now < start) {
      const diff = start - now;
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `Starts in ${h}h ${m}m`;
    }
    if (now >= start && now <= end) {
      const diff = end - now;
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${h}h ${m}m remaining`;
    }
    return "Contest ended";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!contest) return <div className="text-center py-12 text-gray-500">Contest not found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contest.title}</h1>
            <p className="text-gray-600 mt-2">{contest.description}</p>
            <div className="flex gap-4 mt-3 text-sm text-gray-500">
              <span>📅 {new Date(contest.starts_at).toLocaleString()}</span>
              <span>⏱️ {getTimeRemaining()}</span>
              <span>👥 {contest.registered_count} participants</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {contest.phase === "live" && contest.is_registered && (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                🔴 LIVE
              </span>
            )}
            {!contest.is_registered && contest.phase !== "ended" && (
              <button onClick={handleRegister}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-medium text-sm">
                Register
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {["problems", "leaderboard"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition ${
              activeTab === tab
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Problems */}
      {activeTab === "problems" && (
        <div className="space-y-3">
          {contest.problems?.length > 0 ? (
            contest.problems.map((problem, idx) => (
              <div key={problem.id} className="bg-white rounded-xl p-4 shadow-card border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-sm">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="font-medium text-gray-900">{problem.question_title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      problem.question_difficulty === "easy" ? "bg-green-100 text-green-700" :
                      problem.question_difficulty === "medium" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {problem.question_difficulty}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600">{problem.points} pts</span>
                  {contest.phase === "live" && contest.is_registered && (
                    <button
                      onClick={() => navigate(`/coding/${problem.question_id}?contest=${id}&problem=${problem.id}`)}
                      className="px-3 py-1 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition"
                    >
                      Solve
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              {contest.is_registered
                ? "Problems will be visible when the contest starts"
                : "Register to see problems when the contest starts"}
            </div>
          )}
        </div>
      )}

      {/* Leaderboard */}
      {activeTab === "leaderboard" && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          {leaderboard?.leaderboard?.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Solved</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Penalty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaderboard.leaderboard.map((entry) => (
                  <tr key={entry.user_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`font-bold ${
                        entry.rank === 1 ? "text-amber-500" :
                        entry.rank === 2 ? "text-gray-400" :
                        entry.rank === 3 ? "text-orange-400" : "text-gray-600"
                      }`}>
                        {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : `#${entry.rank}`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{entry.full_name}</p>
                      <p className="text-xs text-gray-500">{entry.student_id}</p>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{entry.problems_solved}</td>
                    <td className="px-4 py-3 text-center font-bold text-primary-600">{entry.total_score}</td>
                    <td className="px-4 py-3 text-center text-sm text-gray-500">
                      {Math.floor(entry.total_penalty / 60)}m
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No submissions yet
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ContestDetailPage;
