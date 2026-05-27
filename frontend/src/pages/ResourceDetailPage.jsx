import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

export default function ResourceDetailPage() {
  const { id } = useParams();
  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await api.get(`/resources/${id}/`); setResource(res.data); }
      catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  if (loading) return <div className="page-container"><div className="skeleton h-64 rounded-xl" /></div>;
  if (!resource) return <div className="page-container empty-state"><p className="empty-state-title">Resource not found</p><Link to="/resources" className="btn-primary mt-4">Back to Resources</Link></div>;

  return (
    <div className="page-container max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/resources" className="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></Link>
        <div className="flex-1">
          <h1 className="page-title">{resource.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            {resource.category && <span className="badge-primary">{resource.category}</span>}
            <span className="text-xs text-surface-400">by {resource.uploaded_by?.username || "Unknown"}</span>
          </div>
        </div>
        {resource.file && (
          <a href={resource.file} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </a>
        )}
      </div>
      <div className="card-padded">
        <h3 className="text-base font-semibold text-surface-900 mb-3">Description</h3>
        <p className="text-sm text-surface-600 leading-relaxed">{resource.description || "No description provided."}</p>
      </div>
      <div className="card-padded">
        <h3 className="text-base font-semibold text-surface-900 mb-3">Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><p className="text-xs text-surface-400">Downloads</p><p className="text-sm font-medium text-surface-700">{resource.downloads || 0}</p></div>
          <div><p className="text-xs text-surface-400">Uploaded</p><p className="text-sm font-medium text-surface-700">{resource.created_at ? new Date(resource.created_at).toLocaleDateString() : "—"}</p></div>
        </div>
      </div>
    </div>
  );
}
