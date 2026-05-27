import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function RoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/roadmaps/");
        setRoadmaps(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const colors = ["from-primary-500 to-primary-700", "from-accent-violet to-purple-700", "from-accent-cyan to-blue-700", "from-success-500 to-emerald-700", "from-warning-500 to-orange-700", "from-danger-500 to-rose-700"];

  return (
    <div className="page-container space-y-6">
      <div>
        <h1 className="page-title">Career Roadmaps</h1>
        <p className="page-subtitle">Structured learning paths for your career goals</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-44 rounded-xl" />)}
        </div>
      ) : roadmaps.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 6-6"/></svg>
          </div>
          <p className="empty-state-title">No roadmaps available</p>
          <p className="empty-state-desc">Career roadmaps will be added soon</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roadmaps.map((roadmap, idx) => (
            <Link key={roadmap.id || roadmap.slug} to={`/roadmaps/${roadmap.slug || roadmap.id}`} className="card-interactive overflow-hidden">
              <div className={`h-24 bg-gradient-to-br ${colors[idx % colors.length]} flex items-center justify-center`}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="opacity-60"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 6-6"/></svg>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-surface-800">{roadmap.title}</h3>
                <p className="text-xs text-surface-400 mt-1 line-clamp-2">{roadmap.description}</p>
                {roadmap.steps_count && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-surface-400">{roadmap.steps_count} steps</span>
                    {roadmap.progress !== undefined && (
                      <>
                        <span className="text-xs text-surface-300">•</span>
                        <span className="text-xs text-primary-600 font-medium">{roadmap.progress}% complete</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
