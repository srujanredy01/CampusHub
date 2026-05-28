import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-toastify";

const FILE_TYPES = [
  { ext: ".pdf", label: "PDF" },
  { ext: ".doc,.docx", label: "Word" },
  { ext: ".ppt,.pptx", label: "PowerPoint" },
  { ext: ".xls,.xlsx", label: "Excel" },
  { ext: ".jpg,.jpeg,.png", label: "Images" },
];

const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp";
const MAX_FILE_SIZE_MB = 20;

export default function NoteUploadPage() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const [form, setForm] = useState({
    title: "",
    subject: "",
    description: "",
    branch: user?.branch || "",
    semester: user?.semester ? String(user.semester) : "",
    tags: "",
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const validateFile = (selectedFile) => {
    if (!selectedFile) return false;

    // Size check
    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      return false;
    }

    // Extension check
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    const allowed = ["pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx", "txt", "jpg", "jpeg", "png", "gif", "webp"];
    if (!allowed.includes(ext)) {
      toast.error(`File type .${ext} is not supported. Allowed: PDF, DOC, PPT, XLS, Images`);
      return false;
    }

    return true;
  };

  const handleFileSelect = (selectedFile) => {
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend validation
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.subject.trim()) { toast.error("Subject is required"); return; }
    if (!form.branch.trim()) { toast.error("Branch is required"); return; }
    if (!form.semester) { toast.error("Semester is required"); return; }
    if (!file) { toast.error("Please select a file to upload"); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      formData.append("subject", form.subject.trim());
      formData.append("description", form.description.trim());
      formData.append("branch", form.branch.trim());
      formData.append("semester", form.semester);
      formData.append("file", file);
      if (form.tags.trim()) {
        formData.append("tags", form.tags.trim());
      }

      await api.post("/notes/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        _skipGlobalErrorToast: true,
        timeout: 60000, // 60s timeout for file uploads
      });

      toast.success("Note uploaded successfully! It will be visible after review.");
      navigate("/notes");
    } catch (err) {
      // Extract real error message from backend response
      const response = err?.response;
      if (response?.status === 401) {
        toast.error("Session expired. Please log in again.");
      } else if (response?.status === 413) {
        toast.error("File too large. Maximum upload size is 20MB.");
      } else if (response?.data?.errors) {
        // Serializer validation errors — show first field error
        const errors = response.data.errors;
        const firstField = Object.keys(errors)[0];
        const firstError = Array.isArray(errors[firstField])
          ? errors[firstField][0]
          : errors[firstField];
        toast.error(`${firstField}: ${firstError}`);
      } else if (response?.data?.error?.message) {
        toast.error(response.data.error.message);
      } else {
        toast.error("Upload failed. Please try again.");
      }
      console.error("Upload error:", response?.data || err.message);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="page-container max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/notes" className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <div>
          <h1 className="page-title">Upload Note</h1>
          <p className="page-subtitle">Share study materials with your peers</p>
        </div>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="card-padded space-y-5">
        {/* Title */}
        <div>
          <label className="text-xs font-medium text-surface-600 mb-1.5 block">
            Title <span className="text-danger-500">*</span>
          </label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all"
            placeholder="e.g., Data Structures - Unit 3 Notes"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>

        {/* Subject + Branch */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1.5 block">
              Subject <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all"
              placeholder="e.g., Data Structures"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1.5 block">
              Branch <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all"
              placeholder="e.g., Computer Science"
              value={form.branch}
              onChange={(e) => setForm({ ...form, branch: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Semester + Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1.5 block">
              Semester <span className="text-danger-500">*</span>
            </label>
            <select
              className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm text-surface-900 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all"
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
              required
            >
              <option value="">Select semester</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1.5 block">Tags</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all"
              placeholder="e.g., unit3, important, exam-prep"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
            <p className="text-2xs text-surface-400 mt-1">Comma-separated, max 15 tags</p>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-surface-600 mb-1.5 block">Description</label>
          <textarea
            className="w-full px-3 py-2 bg-white border border-surface-200 rounded-lg text-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-300 transition-all min-h-[80px] resize-none"
            placeholder="Brief description of the content..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* File Upload */}
        <div>
          <label className="text-xs font-medium text-surface-600 mb-1.5 block">
            File <span className="text-danger-500">*</span>
          </label>
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
              dragOver
                ? "border-primary-400 bg-primary-50"
                : file
                ? "border-success-300 bg-success-50/30"
                : "border-surface-200 hover:border-primary-300 hover:bg-surface-50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              type="file"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
              id="file-upload"
              accept={ACCEPTED_EXTENSIONS}
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-surface-800">{file.name}</p>
                    <p className="text-xs text-surface-500">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); setFile(null); }}
                    className="ml-2 p-1 rounded-md hover:bg-surface-200 text-surface-400 hover:text-danger-500 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ) : (
                <div>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-surface-300 mb-2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p className="text-sm text-surface-600 font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-surface-400 mt-1">
                    PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, Images — up to {MAX_FILE_SIZE_MB}MB
                  </p>
                </div>
              )}
            </label>
          </div>
        </div>

        {/* Supported formats info */}
        <div className="flex flex-wrap gap-2">
          {FILE_TYPES.map((ft) => (
            <span key={ft.ext} className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-100 text-2xs font-medium text-surface-500">
              {ft.label}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2 border-t border-surface-100">
          <Link to="/notes" className="px-4 py-2 text-sm font-medium text-surface-600 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={uploading || !file}
            className="px-5 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Uploading...
              </span>
            ) : (
              "Upload Note"
            )}
          </button>
        </div>
      </form>

      {/* Info box */}
      <div className="p-4 rounded-xl bg-info-50 border border-info-100">
        <div className="flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
          <div>
            <p className="text-xs font-medium text-info-800">Review Process</p>
            <p className="text-xs text-info-600 mt-0.5">
              Uploaded notes are reviewed by moderators before being visible to other students.
              This usually takes less than 24 hours.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
