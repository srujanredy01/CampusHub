import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { notesService } from "../services/notesService";

const FILE_ICONS = {
  pdf:   { icon: "📄", cls: "bg-red-50 text-red-600" },
  docx:  { icon: "📝", cls: "bg-blue-50 text-blue-600" },
  ppt:   { icon: "📊", cls: "bg-orange-50 text-orange-600" },
  image: { icon: "🖼", cls: "bg-purple-50 text-purple-600" },
  other: { icon: "📁", cls: "bg-slate-50 text-slate-600" },
};

export default function NoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [note,      setNote]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  useEffect(() => {
    notesService.getById(id)
      .then(r => setNote(r.data.data))
      .catch(() => toast.error("Note not found."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const r = await notesService.download(id);
      const url = r.data.data.download_url;
      const a = document.createElement("a");
      a.href = url;
      a.download = r.data.data.file_name || note.title;
      a.target = "_blank";
      a.click();
    } catch { toast.error("Download failed."); }
    finally { setDownloading(false); }
  };

  const handleVote = async (vote) => {
    try {
      const r = await notesService.vote(id, vote);
      setNote(prev => ({ ...prev, ...r.data.data }));
    } catch { toast.error("Vote failed."); }
  };

  const handleBookmark = async () => {
    try {
      await notesService.bookmark(id);
      setNote(prev => ({ ...prev, is_bookmarked: !prev.is_bookmarked }));
      toast.success(note.is_bookmarked ? "Bookmark removed." : "Bookmarked.");
    } catch { toast.error("Failed."); }
  };

  const handleRate = async (rating) => {
    setRatingSubmitting(true);
    try {
      const r = await notesService.rate(id, rating);
      setNote((prev) => ({
        ...prev,
        average_rating: r.data.data.average_rating,
        rating_count: r.data.data.rating_count,
        user_rating: r.data.data.user_rating,
      }));
    } catch {
      toast.error("Rating failed.");
    } finally {
      setRatingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Note not found.</p>
        <button onClick={() => navigate("/notes")} className="mt-3 text-sm text-primary-600 hover:underline">Back to Notes</button>
      </div>
    );
  }

  const ft = FILE_ICONS[note.file_type] || FILE_ICONS.other;

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-up">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Notes
      </button>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 ${ft.cls}`}>
            {ft.icon}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-slate-900">{note.title}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{note.subject} · Semester {note.semester} · {note.branch}</p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium uppercase">{note.file_type}</span>
              {note.tags_list?.map(t => (
                <span key={t} className="text-xs bg-primary-50 text-primary-600 px-2.5 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          </div>
          <button onClick={handleBookmark}
            className={`p-2 rounded-xl transition-colors ${note.is_bookmarked ? "text-amber-500 bg-amber-50" : "text-slate-300 hover:text-amber-400 hover:bg-amber-50"}`}>
            <svg viewBox="0 0 24 24" fill={note.is_bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>

        {/* Description */}
        {note.description && (
          <p className="text-sm text-slate-600 leading-relaxed">{note.description}</p>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 py-4 border-t border-b border-slate-100">
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">{note.download_count}</p>
            <p className="text-xs text-slate-500">Downloads</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">{note.view_count}</p>
            <p className="text-xs text-slate-500">Views</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">★ {Number(note.average_rating || 0).toFixed(1)}</p>
            <p className="text-xs text-slate-500">{note.rating_count || 0} ratings</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">Rate this note</div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                disabled={ratingSubmitting}
                onClick={() => handleRate(star)}
                className={`text-xl leading-none ${star <= (note.user_rating || 0) ? "text-amber-500" : "text-slate-300"} hover:text-amber-500`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        {/* Vote + Download */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={() => handleVote("up")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${note.user_vote === "up" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-white"}`}>
              ▲ {note.upvotes}
            </button>
            <button onClick={() => handleVote("down")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${note.user_vote === "down" ? "bg-red-600 text-white" : "text-slate-600 hover:bg-white"}`}>
              ▼ {note.downvotes}
            </button>
          </div>
          <button onClick={handleDownload} disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 text-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {downloading ? "Downloading..." : "Download"}
          </button>
          {(note.file_type === "pdf" || note.file_type === "image") && note.file_url && (
            <button onClick={() => setPreviewUrl(previewUrl ? null : note.file_url)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors text-sm">
              {previewUrl ? "Close Preview" : "Preview"}
            </button>
          )}
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="rounded-2xl overflow-hidden border border-slate-200 h-[500px] bg-slate-50">
            {note.file_type === "image" ? (
              <img src={previewUrl} alt={note.title} className="w-full h-full object-contain" />
            ) : (
              <iframe src={previewUrl} title="Note Preview" className="w-full h-full border-0" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
