import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-toastify";

export default function NoteUploadPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", subject: "", description: "" });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { toast.error("Please select a file"); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("subject", form.subject);
      formData.append("description", form.description);
      formData.append("file", file);
      await api.post("/notes/", formData, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Note uploaded successfully");
      navigate("/notes");
    } catch { toast.error("Upload failed"); }
    finally { setUploading(false); }
  };

  return (
    <div className="page-container max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/notes" className="btn-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <div>
          <h1 className="page-title">Upload Note</h1>
          <p className="page-subtitle">Share study materials with your peers</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card-padded space-y-5">
        <div className="form-group">
          <label className="input-label">Title</label>
          <input type="text" className="input" placeholder="e.g. Data Structures - Unit 3 Notes"
            value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="form-group">
          <label className="input-label">Subject</label>
          <input type="text" className="input" placeholder="e.g. Data Structures"
            value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="input-label">Description</label>
          <textarea className="input min-h-[80px] resize-none" placeholder="Brief description of the content..."
            value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="input-label">File</label>
          <div className="border-2 border-dashed border-surface-200 rounded-xl p-6 text-center hover:border-primary-300 transition-colors">
            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="hidden" id="file-upload" accept=".pdf,.doc,.docx,.ppt,.pptx,.txt" />
            <label htmlFor="file-upload" className="cursor-pointer">
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/></svg>
                  <span className="text-sm font-medium text-surface-700">{file.name}</span>
                </div>
              ) : (
                <div>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-surface-300 mb-2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <p className="text-sm text-surface-500">Click to upload or drag and drop</p>
                  <p className="text-xs text-surface-400 mt-1">PDF, DOC, PPT up to 10MB</p>
                </div>
              )}
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Link to="/notes" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={uploading} className="btn-primary">
            {uploading ? "Uploading..." : "Upload Note"}
          </button>
        </div>
      </form>
    </div>
  );
}
