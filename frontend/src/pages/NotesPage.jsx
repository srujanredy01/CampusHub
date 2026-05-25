import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { notesService } from "../services/notesService";
import { SkeletonGrid } from "../components/common/Skeleton";
import EmptyState from "../components/common/EmptyState";
import PageHeader from "../components/common/PageHeader";

const FILE_ICONS = {
  pdf:   { label: "PDF",  cls: "bg-red-50 text-red-600 border-red-200" },
  docx:  { label: "DOC",  cls: "bg-blue-50 text-blue-600 border-blue-200" },
  ppt:   { label: "PPT",  cls: "bg-orange-50 text-orange-600 border-orange-200" },
  image: { label: "IMG",  cls: "bg-purple-50 text-purple-600 border-purple-200" },
  other: { label: "FILE", cls: "bg-slate-50 text-slate-600 border-slate-200" },
};

const UpIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);
const DownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const BookmarkIcon = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>
);

function NoteCard({ note, onVote, onBookmark }) {
  const ft = FILE_ICONS[note.file_type] || FILE_ICONS.other;
  const [voting, setVoting] = useState(false);

  const handleVote = async (v) => {
    setVoting(true);
    try { await onVote(note.id, v); }
    finally { setVoting(false); }
  };

  return (
    <div className="card-hover flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border flex-shrink-0 ${ft.cls}`}>
          {ft.label}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            to={`/notes/${note.id}`}
            className="font-semibold text-slate-800 hover:text-primary-600 transition-colors line-clamp-2 text-sm leading-snug block"
          >
            {note.title}
          </Link>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{note.subject} · Sem {note.semester}</p>
        </div>
        <button
          onClick={() => onBookmark(note.id)}
          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
            note.is_bookmarked
              ? "text-amber-500 bg-amber-50"
              : "text-slate-300 hover:text-amber-400 hover:bg-amber-50"
          }`}
          title={note.is_bookmarked ? "Remove bookmark" : "Bookmark"}
          aria-label={note.is_bookmarked ? "Remove bookmark" : "Bookmark this note"}
          aria-pressed={note.is_bookmarked}
        >
          <BookmarkIcon filled={note.is_bookmarked} />
        </button>
      </div>

      {/* Description */}
      {note.description && (
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{note.description}</p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1">
        <span className="text-2xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{note.branch}</span>
        {note.tags_list?.slice(0, 2).map((t) => (
          <span key={t} className="text-2xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">{t}</span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-surface-50 mt-auto">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>{note.download_count} dl</span>
          <span>·</span>
          <span>{note.view_count} views</span>
          <span>·</span>
          <span>{Number(note.average_rating || 0).toFixed(1)} ★</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleVote("up")}
            disabled={voting}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              note.user_vote === "up" ? "bg-emerald-100 text-emerald-700" : "text-slate-400 hover:bg-slate-100"
            }`}
            aria-label={`Upvote (${note.upvotes})`}
            aria-pressed={note.user_vote === "up"}
          >
            <UpIcon /> {note.upvotes}
          </button>
          <button
            onClick={() => handleVote("down")}
            disabled={voting}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              note.user_vote === "down" ? "bg-red-100 text-red-700" : "text-slate-400 hover:bg-slate-100"
            }`}
            aria-label={`Downvote (${note.downvotes})`}
            aria-pressed={note.user_vote === "down"}
          >
            <DownIcon /> {note.downvotes}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotesPage() {
  const [searchParams] = useSearchParams();
  const [notes,   setNotes]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filters, setFilters] = useState({
    branch: "", semester: "", file_type: "", subject: "", tag: "", sort: "recent_uploads",
  });
  const [tab, setTab] = useState(searchParams.get("tab") || "all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (search) params.search = search;
      let res;
      if (tab === "bookmarks")     res = await notesService.getBookmarks();
      else if (tab === "mine")     res = await notesService.getMine();
      else                         res = await notesService.getAll(params);
      setNotes(res.data.results || res.data.data || []);
    } catch {
      toast.error("Failed to load notes.");
    } finally {
      setLoading(false);
    }
  }, [search, filters, tab]);

  useEffect(() => { load(); }, [load]);

  const handleVote = async (id, vote) => {
    try {
      await notesService.vote(id, vote);
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          const wasUp   = n.user_vote === "up";
          const wasDown = n.user_vote === "down";
          if (vote === "up")
            return { ...n, upvotes: wasUp ? n.upvotes - 1 : n.upvotes + 1, downvotes: wasDown ? n.downvotes - 1 : n.downvotes, user_vote: wasUp ? null : "up" };
          return { ...n, downvotes: wasDown ? n.downvotes - 1 : n.downvotes + 1, upvotes: wasUp ? n.upvotes - 1 : n.upvotes, user_vote: wasDown ? null : "down" };
        })
      );
    } catch {
      toast.error("Vote failed.");
    }
  };

  const handleBookmark = async (id) => {
    try {
      await notesService.bookmark(id);
      setNotes((prev) => prev.map((n) => n.id === id ? { ...n, is_bookmarked: !n.is_bookmarked } : n));
    } catch {
      toast.error("Bookmark failed.");
    }
  };

  const TABS = [
    { key: "all",       label: "All Notes" },
    { key: "bookmarks", label: "Bookmarks" },
    { key: "mine",      label: "My Uploads" },
  ];

  const emptyMessages = {
    all:       { title: "No notes found",    desc: "Be the first to upload a note for your peers." },
    bookmarks: { title: "No bookmarks yet",  desc: "Bookmark notes to find them quickly later." },
    mine:      { title: "No uploads yet",    desc: "Share your notes with your classmates." },
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader
        title="Notes Sharing"
        subtitle="Browse, upload, and share study notes"
        actions={
          <Link to="/notes/upload" className="btn-primary btn-sm flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Upload Note
          </Link>
        }
      />

      {/* Tabs */}
      <div className="tab-bar w-fit" role="tablist" aria-label="Notes filter">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? "tab-active" : "tab-inactive"}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab === "all" && (
        <div className="card p-4">
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                className="input-field pl-9"
                placeholder="Search notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search notes"
              />
            </div>
            <input type="text" className="input-field w-full sm:w-28" placeholder="Branch" value={filters.branch} onChange={(e) => setFilters((f) => ({ ...f, branch: e.target.value }))} aria-label="Filter by branch" />
            <input type="text" className="input-field w-full sm:w-32" placeholder="Subject" value={filters.subject} onChange={(e) => setFilters((f) => ({ ...f, subject: e.target.value }))} aria-label="Filter by subject" />
            <select className="input-field w-full sm:w-36" value={filters.semester} onChange={(e) => setFilters((f) => ({ ...f, semester: e.target.value }))} aria-label="Filter by semester">
              <option value="">All Semesters</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <select className="input-field w-full sm:w-32" value={filters.file_type} onChange={(e) => setFilters((f) => ({ ...f, file_type: e.target.value }))} aria-label="Filter by file type">
              <option value="">All Types</option>
              <option value="pdf">PDF</option>
              <option value="docx">Word</option>
              <option value="ppt">PPT</option>
              <option value="image">Image</option>
            </select>
            <select className="input-field w-full sm:w-44" value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))} aria-label="Sort notes">
              <option value="recent_uploads">Recent Uploads</option>
              <option value="trending">Trending</option>
              <option value="most_downloaded">Most Downloaded</option>
              <option value="highest_rated">Highest Rated</option>
            </select>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <SkeletonGrid count={6} />
      ) : notes.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="notes"
            title={emptyMessages[tab]?.title}
            desc={emptyMessages[tab]?.desc}
            action={
              tab !== "all" ? null : (
                <Link to="/notes/upload" className="btn-primary btn-sm">Upload a Note</Link>
              )
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} onVote={handleVote} onBookmark={handleBookmark} />
          ))}
        </div>
      )}
    </div>
  );
}
