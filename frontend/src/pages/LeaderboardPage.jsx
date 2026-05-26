import { useState, useEffect } from "react";
import { leaderboardService } from "../services/leaderboardService";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myXP, setMyXP] = useState(null);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("leaderboard");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [lbRes, xpRes, badgeRes] = await Promise.all([
        leaderboardService.getLeaderboard(),
        leaderboardService.getMyXP(),
        leaderboardService.getBadges(),
      ]);
      setLeaderboard(lbRes.data.data || []);
      setMyXP(xpRes.data.data || null);
      setBadges(badgeRes.data.data || []);
    } catch { toast.error("Failed to load leaderboard"); }
    finally { setLoading(false); }
  };

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Leaderboard & Achievements</h1></div>

      {myXP && (
        <div className="card bg-gradient-to-r from-primary-50 to-purple-50">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary-600">{myXP.xp?.total_xp || 0}</p>
              <p className="text-xs text-gray-500">Total XP</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">Lv.{myXP.xp?.level || 1}</p>
              <p className="text-xs text-gray-500">Level</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">#{myXP.xp?.rank || "-"}</p>
              <p className="text-xs text-gray-500">Rank</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{myXP.xp?.streak_days || 0}🔥</p>
              <p className="text-xs text-gray-500">Streak</p>
            </div>
            <div className="flex-1 flex flex-wrap gap-1 justify-end">
              {(myXP.badges || []).map(b => (
                <span key={b.id} className="text-xl" title={b.badge?.name}>{b.badge?.icon}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b">
        {["leaderboard", "badges"].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary-500 text-primary-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>{t === "leaderboard" ? "Rankings" : "Badges"}</button>
        ))}
      </div>

      {tab === "leaderboard" && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left">#</th><th className="px-4 py-3 text-left">Student</th><th className="px-4 py-3 text-left">Branch</th><th className="px-4 py-3 text-right">XP</th><th className="px-4 py-3 text-right">Level</th><th className="px-4 py-3 text-right">Streak</th></tr></thead>
            <tbody className="divide-y">
              {leaderboard.map((entry, idx) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-bold">{idx < 3 ? ["🥇", "🥈", "🥉"][idx] : idx + 1}</td>
                  <td className="px-4 py-3 font-medium">{entry.student_name}</td>
                  <td className="px-4 py-3 text-gray-500">{entry.branch}</td>
                  <td className="px-4 py-3 text-right font-bold text-primary-600">{entry.total_xp}</td>
                  <td className="px-4 py-3 text-right">{entry.level}</td>
                  <td className="px-4 py-3 text-right">{entry.streak_days}🔥</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "badges" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map(badge => (
            <div key={badge.id} className={`card ${badge.earned ? "ring-2 ring-yellow-400" : "opacity-60"}`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{badge.icon}</span>
                <div>
                  <h3 className="font-semibold text-gray-900">{badge.name}</h3>
                  <p className="text-xs text-gray-500">{badge.description}</p>
                  <p className="text-xs text-primary-600 mt-1">+{badge.xp_reward} XP</p>
                </div>
              </div>
              {badge.earned && <span className="text-xs text-green-600 font-medium mt-2 block">✓ Earned</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
