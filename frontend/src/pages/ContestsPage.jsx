import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { contestService } from "../services/contestService";
import { toast } from "react-toastify";

function ContestsPage() {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    loadContests();
  }, [activeFilter]);

  const loadContests = async () => {
    setLoading(true);
    try {
      const params = activeFilter !== "all" ? { phase: activeFilter } : {};
      const res = await contestService.getContests(params);
      setContests(res.data.results || res.data.data || []);
    } catch {
      toast.error("Failed to load contests");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (contestId) => {
    try {
      await contestService.register(contestId);
      toast.success("Registered successfully!");
      loadContests();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || "Registration failed");
    }
  };

  const getPhaseStyle = (phase) => {
    switch (phase) {
      case "live": return "bg-green-100 text-green-700 animate-pulse-soft";
      case "upcoming": return "bg-blue-100 text-blue-700";
      case "ended": return "bg-gray-100 text-gray-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString("en-IN", {
      dateStyle: "medium", timeStyle: "short",
    });
  };

  const getTimeRemaining = (startsAt) => {
    const diff = new Date(startsAt) - new Date();
    if (diff <= 0) return null;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coding Contests</h1>
          <p className="text-gray-500 mt-1">Compete, learn, and climb the leaderboard</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: "all", label: "All" },
          { value: "live", label: "🔴 Live" },
          { value: "upcoming", label: "📅 Upcoming" },
          { value: "ended", label: "✅ Ended" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              activeFilter === f.value
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Contest Cards */}
      {contests.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-lg">No contests found</p>
          <p className="text-sm mt-1">Check back later for upcoming contests</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contests.map((contest) => (
            <div key={contest.id} className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 hover:shadow-card-hover transition">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-lg">{contest.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPhaseStyle(contest.phase)}`}>
                  {contest.phase === "live" ? "🔴 LIVE" : contest.phase.toUpperCase()}
                </span>
              </div>
              {contest.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">{contest.description}</p>
              )}
              <div className="space-y-2 text-sm text-gray-500 mb-4">
                <div className="flex justify-between">
                  <span>Starts:</span>
                  <span className="font-medium text-gray-700">{formatDate(contest.starts_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ends:</span>
                  <span className="font-medium text-gray-700">{formatDate(contest.ends_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Problems:</span>
                  <span className="font-medium text-gray-700">{contest.problems_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Participants:</span>
                  <span className="font-medium text-gray-700">{contest.registered_count}</span>
                </div>
              </div>

              {contest.phase === "upcoming" && (
                <div className="text-center text-sm text-blue-600 mb-3">
                  Starts in {getTimeRemaining(contest.starts_at)}
                </div>
              )}

              <div className="flex gap-2">
                {contest.phase === "live" && (
                  <button
                    onClick={() => navigate(`/contests/${contest.id}`)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium text-sm"
                  >
                    Enter Contest
                  </button>
                )}
                {contest.phase === "upcoming" && (
                  <button
                    onClick={() => handleRegister(contest.id)}
                    className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-medium text-sm"
                  >
                    Register
                  </button>
                )}
                {contest.phase === "ended" && (
                  <button
                    onClick={() => navigate(`/contests/${contest.id}`)}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium text-sm"
                  >
                    View Results
                  </button>
                )}
                <button
                  onClick={() => navigate(`/contests/${contest.id}`)}
                  className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-sm"
                >
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ContestsPage;
