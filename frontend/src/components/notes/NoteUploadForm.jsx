import { useState } from "react";
import { toast } from "react-toastify";
import { notesService } from "../../services/notesService";

export default function NoteUploadForm({ onSuccess }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    subject: "",
    branch: "",
    semester: "",
    tags: "",
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a file.");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append("file", file);
      await notesService.upload(fd);
      toast.success("Note submitted for review.");
      if (onSuccess) onSuccess();
      setForm({ title: "", description: "", subject: "", branch: "", semester: "", tags: "" });
      setFile(null);
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs) Object.values(errs).flat().forEach((m) => toast.error(String(m)));
      else toast.error("Upload failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="input-label">Title *</label>
        <input className="input-field" value={form.title} onChange={(e) => set("title", e.target.value)} required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="input-label">Subject *</label>
          <input className="input-field" value={form.subject} onChange={(e) => set("subject", e.target.value)} required />
        </div>
        <div>
          <label className="input-label">Branch *</label>
          <input className="input-field" value={form.branch} onChange={(e) => set("branch", e.target.value)} required />
        </div>
        <div>
          <label className="input-label">Semester *</label>
          <select className="input-field" value={form.semester} onChange={(e) => set("semester", e.target.value)} required>
            <option value="">Select</option>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="input-label">Tags</label>
        <input className="input-field" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="comma,separated,tags" />
      </div>
      <div>
        <label className="input-label">Description</label>
        <textarea className="input-field resize-none" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
      </div>
      <div>
        <label className="input-label">File * (PDF, DOCX, PPT, JPG, PNG)</label>
        <input
          type="file"
          className="input-field"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
          onChange={(e) => setFile(e.target.files[0] || null)}
          required
        />
      </div>
      <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold disabled:opacity-50">
        {saving ? "Uploading..." : "Submit For Approval"}
      </button>
    </form>
  );
}
