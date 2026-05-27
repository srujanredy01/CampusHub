import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

export default function RoadmapDetailPage() {
  const { slug } = useParams();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await api.get(`/roadmaps/${slug}/`); setRoadmap(res.data); }
      catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [slug]);

  if (loading) return <div className="page-container"><div className="skeleton h-64 rounded-xl" /></div>;
  if (!roadmap) return <div className="page-container empty-state"><p className="empty-state-title">Roadmap not found</p><Link to="/roadmaps" className="btn-primary mt-4">Back to Roadmaps</Link></div>;

  return (
    <div className="page-container max-w-3xl space-y-6">
      <Link to="/roadmaps" className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Roadmaps
      </Link>

      <div>
        <h1 className="text-2xl font-display font-bold text-surface-900">{roadmap.title}</h1>
        <p className="text-sm text-surface-500 mt-1">{roadmap.description}</p>
      </div>

      {/* Steps */}
      {roadmap.steps && roadmap.steps.length > 0 && (
        <div className="space-y-3">
          {roadmap.steps.map((step, idx) => (
            <div key={step.id || idx} className="card-padded flex items-start gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${step.completed ? "bg-success-100 text-success-700" : "bg-surface-100 text-surface-500"}`}>
                {step.completed ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : idx + 1}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-surface-800">{step.title}</h4>
                {step.description && <p className="text-xs text-surface-400 mt-1">{step.description}</p>}
                {step.resources && step.resources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {step.resources.map((r, i) => (
                      <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="badge-info hover:bg-info-100 transition-colors">{r.title || "Resource"}</a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
