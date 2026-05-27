import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function ResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const fetchResources = async () => {
      try {
        const params = {};
        if (search) params.search = search;
        if (filter !== "All") params.category = filter;
        const res = await api.get("/resources/", { params });
        setResources(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchResources();
  }, [search, filter]);

  const categories = ["All", "Notes", "Books", "Papers", "Videos", "Links"];

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Resources</h1>
          <p className="page-subtitle">Academic materials shared by your community</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="search-container flex-1">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input type="text" className="search-input" placeholder="Search resources..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {categories.map((c) => (
            <button key={c} onClick={() => setFilter(c)}
              className={filter === c ? "filter-pill-active" : "filter-pill-inactive"}>{c}</button>
          ))}
        </div>
      </div>

      {/* Resource Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />)}
        </div>
      ) : resources.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
          </div>
          <p className="empty-state-title">No resources found</p>
          <p className="empty-state-desc">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((r) => (
            <Link key={r.id} to={`/resources/${r.id}`} className="card-interactive p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                {r.category && <span className="badge-neutral">{r.category}</span>}
              </div>
              <h3 className="text-sm font-semibold text-surface-800 line-clamp-2 mb-1">{r.title}</h3>
              <p className="text-xs text-surface-400 line-clamp-2">{r.description}</p>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-100">
                <span className="text-xs text-surface-400">{r.uploaded_by?.username || "Unknown"}</span>
                <span className="text-xs text-surface-300">•</span>
                <span className="text-xs text-surface-400">{r.downloads || 0} downloads</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
