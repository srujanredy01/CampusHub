import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function NotesPage() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = search ? { search } : {};
        const res = await api.get("/notes/", { params });
        setNotes(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [search]);

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Notes</h1>
          <p className="page-subtitle">Shared notes from your community</p>
        </div>
        <Link to="/notes/upload" className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Upload Note
        </Link>
      </div>

      <div className="search-container max-w-md">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" className="search-input" placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-36 rounded-xl" />)}
        </div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <p className="empty-state-title">No notes found</p>
          <p className="empty-state-desc">Be the first to share notes with your peers</p>
          <Link to="/notes/upload" className="btn-primary mt-4">Upload Note</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <Link key={note.id} to={`/notes/${note.id}`} className="card-interactive p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                {note.subject && <span className="badge-neutral">{note.subject}</span>}
              </div>
              <h3 className="text-sm font-semibold text-surface-800 line-clamp-2">{note.title}</h3>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-100">
                <span className="text-xs text-surface-400">{note.uploaded_by?.username || "Unknown"}</span>
                <span className="text-xs text-surface-300">•</span>
                <span className="text-xs text-surface-400">{note.downloads || 0} downloads</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
