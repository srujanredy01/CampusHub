import { useNavigate } from "react-router-dom";
import NoteUploadForm from "../components/notes/NoteUploadForm";

export default function NoteUploadPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-up">
      <button onClick={() => navigate("/notes")} className="text-sm text-slate-500 hover:text-slate-700">
        Back to Notes
      </button>
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Upload Notes</h1>
        <p className="text-sm text-slate-500 mt-1 mb-5">All uploads go through moderation before public visibility.</p>
        <NoteUploadForm onSuccess={() => navigate("/notes?tab=mine")} />
      </div>
    </div>
  );
}
