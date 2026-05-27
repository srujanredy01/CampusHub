import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

const difficulties = ["All", "Easy", "Medium", "Hard"];
const categories = ["All", "Arrays", "Strings", "Trees", "Graphs", "DP", "Math", "Sorting"];

function DifficultyBadge({ level }) {
  const cls = { Easy: "badge-easy", Medium: "badge-medium", Hard: "badge-hard" };
  return <span className={cls[level] || "badge-neutral"}>{level}</span>;
}

function ProblemRow({ problem }) {
  return (
    <Link to={`/coding/${problem.id}`} className="tr flex items-center px-4 py-3 hover:bg-surface-50 transition-colors cursor-pointer">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {problem.solved && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" className="flex-shrink-0">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
          <span className="text-sm font-medium text-surface-800 truncate">{problem.title}</span>
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <DifficultyBadge level={problem.difficulty} />
        <span className="text-xs text-surface-400 w-16 text-right">{problem.acceptance}%</span>
      </div>
    </Link>
  );
}

export default function CodingPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState("All");
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ solved: 0, easy: 0, medium: 0, hard: 0 });

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const params = {};
        if (difficulty !== "All") params.difficulty = difficulty.toLowerCase();
        if (category !== "All") params.category = category.toLowerCase();
        if (search) params.search = search;
        const res = await api.get("/questions/", { params });
        const data = Array.isArray(res.data) ? res.data : res.data.results || [];
        setProblems(data);
        setStats({
          solved: data.filter(p => p.solved).length,
          easy: data.filter(p => p.difficulty === "Easy").length,
          medium: data.filter(p => p.difficulty === "Medium").length,
          hard: data.filter(p => p.difficulty === "Hard").length,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProblems();
  }, [difficulty, category, search]);

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Coding Hub</h1>
          <p className="page-subtitle">Practice problems and sharpen your skills</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/contests" className="btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Contests
          </Link>
          <Link to="/leaderboard" className="btn-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            Leaderboard
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-surface-900 tabular-nums">{stats.solved}</p>
          <p className="text-xs text-surface-500 mt-0.5">Solved</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-emerald-600 tabular-nums">{stats.easy}</p>
          <p className="text-xs text-surface-500 mt-0.5">Easy</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-amber-600 tabular-nums">{stats.medium}</p>
          <p className="text-xs text-surface-500 mt-0.5">Medium</p>
        </div>
        <div className="card-padded text-center">
          <p className="text-2xl font-bold text-red-600 tabular-nums">{stats.hard}</p>
          <p className="text-xs text-surface-500 mt-0.5">Hard</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="search-container flex-1">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search problems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {difficulties.map((d) => (
            <button key={d} onClick={() => setDifficulty(d)}
              className={difficulty === d ? "filter-pill-active" : "filter-pill-inactive"}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {categories.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${category === c ? "bg-surface-900 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Problem List */}
      <div className="card-flush">
        {/* Table header */}
        <div className="flex items-center px-4 py-2.5 bg-surface-50 border-b border-surface-200/60">
          <span className="flex-1 text-xs font-semibold text-surface-500 uppercase tracking-wide">Problem</span>
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide w-20 text-center">Difficulty</span>
          <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide w-16 text-right">Accept.</span>
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="skeleton h-10 rounded-lg" />)}
          </div>
        ) : problems.length === 0 ? (
          <div className="empty-state py-12">
            <div className="empty-state-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
            </div>
            <p className="empty-state-title">No problems found</p>
            <p className="empty-state-desc">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {problems.map((p) => <ProblemRow key={p.id} problem={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
