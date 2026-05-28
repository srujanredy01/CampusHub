import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../services/api";
import { toast } from "react-toastify";

const CATEGORIES = [
  { id: "", label: "All" },
  { id: "web_development", label: "Web Dev" },
  { id: "ai_ml", label: "AI/ML" },
  { id: "dsa_placements", label: "DSA" },
  { id: "system_design", label: "System Design" },
  { id: "devops", label: "DevOps" },
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "full_stack", label: "Full Stack" },
  { id: "cloud_computing", label: "Cloud" },
  { id: "cybersecurity", label: "Security" },
  { id: "academic", label: "Academic" },
  { id: "placement_prep", label: "Placement" },
];

const DIFFICULTY_COLORS = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-red-100 text-red-700",
};

function RoadmapCard({ roadmap, onLike }) {
  const progress = roadmap.progress;
  return (
    <Link to={`/roadmaps/${roadmap.slug}`} className="card-padded group hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200 block">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${roadmap.color}15` }}>
          {roadmap.icon || "🗺️"}
        </div>
        <div className="flex items-center gap-1.5">
          {roadmap.is_faculty_verified && (
            <span className="text-2xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full border border-blue-100" title="Faculty Verified">✓ Verified</span>
          )}
          {roadmap.is_featured && (
            <span className="text-2xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">⭐ Featured</span>
          )}
        </div>
      </div>

      {/* Title & Description */}
      <h3 className="text-sm font-semibold text-surface-800 group-hover:text-primary-700 transition-colors line-clamp-1">
        {roadmap.title}
      </h3>
      <p className="text-xs text-surface-500 mt-1 line-clamp-2">{roadmap.description}</p>

      {/* Meta */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className={`text-2xs font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[roadmap.difficulty] || "bg-surface-100 text-surface-600"}`}>
          {roadmap.difficulty}
        </span>
        <span className="text-2xs text-surface-400">{roadmap.total_steps} steps</span>
        <span className="text-2xs text-surface-400">~{roadmap.estimated_weeks}w</span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-surface-100 text-xs text-surface-400">
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          {roadmap.enrolled_count}
        </span>
        <span className="flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          {roadmap.like_count}
        </span>
        {roadmap.average_rating > 0 && (
          <span className="flex items-center gap-1">⭐ {parseFloat(roadmap.average_rating).toFixed(1)}</span>
        )}
        {roadmap.creator_name && (
          <span className="ml-auto text-2xs truncate max-w-[100px]">by {roadmap.creator_name}</span>
        )}
      </div>

      {/* Progress bar if enrolled */}
      {progress && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-2xs text-primary-600 font-medium">{progress.percentage}% complete</span>
            <span className="text-2xs text-surface-400">{progress.completed_steps}/{progress.total_steps}</span>
          </div>
          <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${progress.percentage}%` }} />
          </div>
        </div>
      )}
    </Link>
  );
}

export default function RoadmapsPage() {
  const { user } = useSelector((s) => s.auth);
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort] = useState("popular");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("explore"); // explore | my | created

  const fetchRoadmaps = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (tab === "my") {
        res = await api.get("/roadmaps/my");
        const data = res.data?.data || [];
        setRoadmaps(data.map((d) => ({ ...d.roadmap, progress: { status: d.status, completed_steps: d.completed_steps, total_steps: d.total_steps, percentage: d.percentage } })));
      } else if (tab === "created") {
        res = await api.get("/roadmaps/my-created");
        setRoadmaps(res.data?.data || []);
      } else {
        const params = { sort };
        if (category) params.category = category;
        if (difficulty) params.difficulty = difficulty;
        if (search) params.search = search;
        res = await api.get("/roadmaps/", { params });
        setRoadmaps(res.data?.results || res.data?.data || (Array.isArray(res.data) ? res.data : []));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [tab, category, difficulty, sort, search]);

  useEffect(() => { fetchRoadmaps(); }, [fetchRoadmaps]);

  return (
    <div className="page-container space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Career Roadmaps</h1>
          <p className="page-subtitle">Community-driven learning paths for your goals</p>
        </div>
        <Link to="/roadmaps/create" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Roadmap
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-surface-100 pb-0">
        {[
          { id: "explore", label: "Explore" },
          { id: "my", label: "My Progress" },
          { id: "created", label: "My Roadmaps" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? "border-primary-600 text-primary-700" : "border-transparent text-surface-500 hover:text-surface-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters (only for explore tab) */}
      {tab === "explore" && (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input type="text" placeholder="Search roadmaps..."
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none" />
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${category === cat.id ? "bg-primary-600 text-white" : "bg-surface-100 text-surface-600 hover:bg-surface-200"}`}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Sort + Difficulty */}
          <div className="flex items-center gap-3">
            <select value={sort} onChange={(e) => setSort(e.target.value)}
              className="text-xs border border-surface-200 rounded-lg px-2.5 py-1.5 bg-white text-surface-600 outline-none">
              <option value="popular">Most Popular</option>
              <option value="latest">Latest</option>
              <option value="top_rated">Top Rated</option>
              <option value="faculty_verified">Faculty Verified</option>
            </select>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
              className="text-xs border border-surface-200 rounded-lg px-2.5 py-1.5 bg-white text-surface-600 outline-none">
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>
      )}

      {/* Roadmap Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-52 rounded-xl" />)}
        </div>
      ) : roadmaps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400">
              <path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 6-6"/>
            </svg>
          </div>
          <p className="text-base font-medium text-surface-700">
            {tab === "explore" ? "No roadmaps found" : tab === "my" ? "No enrolled roadmaps" : "No roadmaps created yet"}
          </p>
          <p className="text-sm text-surface-400 mt-1">
            {tab === "explore" ? "Try adjusting your filters" : tab === "created" ? "Create your first roadmap to share with the community" : "Explore and enroll in roadmaps to track your progress"}
          </p>
          {tab === "created" && (
            <Link to="/roadmaps/create" className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
              Create Your First Roadmap
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roadmaps.map((roadmap) => (
            <RoadmapCard key={roadmap.id} roadmap={roadmap} />
          ))}
        </div>
      )}
    </div>
  );
}
