import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

export default function NoteDetailPage() {
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await api.get(`/notes/${id}/`); setNote(res.data); }
      catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  if (loading) return <div className="page-container"><div className="skeleton h-64 rounded-xl" /></div>;
  if (!note) return <div className="page-container empty-state"><p className="empty-state-title">Note not found</p><Link to="/notes" className="btn-primary mt-4">Back to Notes</Link></div>;

  return (
    <div className="page-container max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/notes" className="btn-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></Link>
        <div className="flex-1">
          <h1 className="page-title">{note.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            {note.subject && <span className="badge-neutral">{note.subject}</span>}
            <span className="text-xs text-surface-400">by {note.uploaded_by?.username || "Unknown"}</span>
          </div>
        </div>
        {note.file && (
          <a href={note.file} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Download
          </a>
        )}
      </div>
      <div className="card-padded">
        <p className="text-sm text-surface-600 leading-relaxed">{note.description || "No description provided."}</p>
      </div>
    </div>
  );
}
