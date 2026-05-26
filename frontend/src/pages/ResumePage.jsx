import { useState, useEffect } from "react";
import { resumeService } from "../services/resumeService";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function ResumePage() {
  const [resumes, setResumes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: "My Resume", full_name: "", email: "", phone: "", branch: "", graduation_year: "", summary: "", skills: [], projects: [], education: [], internships: [], certifications: [], achievements: [], linkedin_url: "", github_url: "", coding_profiles: {} });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [resRes, tplRes] = await Promise.all([resumeService.getResumes(), resumeService.getTemplates()]);
      setResumes(resRes.data.data || []);
      setTemplates(tplRes.data.data || []);
    } catch { toast.error("Failed to load resumes"); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const payload = { ...form, skills: typeof form.skills === "string" ? form.skills.split(",").map(s => s.trim()).filter(Boolean) : form.skills };
      if (editing) {
        await resumeService.updateResume(editing, payload);
        toast.success("Resume updated!");
      } else {
        await resumeService.createResume(payload);
        toast.success("Resume created!");
      }
      setShowForm(false); setEditing(null); fetchData();
    } catch (e) { toast.error(e.response?.data?.errors ? JSON.stringify(e.response.data.errors) : "Failed"); }
  };

  const handleEdit = (resume) => { setForm({ ...resume, skills: Array.isArray(resume.skills) ? resume.skills.join(", ") : resume.skills }); setEditing(resume.id); setShowForm(true); };
  const handleDelete = async (id) => { if (window.confirm("Delete this resume?")) { await resumeService.deleteResume(id); toast.success("Deleted"); fetchData(); } };
  const handleExport = async (id) => { try { const res = await resumeService.exportResume(id); toast.success("Export data ready — use browser print for PDF"); } catch { toast.error("Export failed"); } };

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Resume Builder</h1><p className="text-sm text-gray-500">Create ATS-ready professional resumes</p></div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ title: "My Resume", full_name: "", email: "", phone: "", branch: "", graduation_year: "", summary: "", skills: "", projects: [], education: [], internships: [], certifications: [], achievements: [], linkedin_url: "", github_url: "", coding_profiles: {} }); }} className="btn-primary">+ New Resume</button>
      </div>

      {showForm && (
        <div className="card space-y-4">
          <h2 className="font-semibold text-lg">{editing ? "Edit Resume" : "Create Resume"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="input-field" placeholder="Resume Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            <input className="input-field" placeholder="Full Name" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} />
            <input className="input-field" placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <input className="input-field" placeholder="Phone" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            <input className="input-field" placeholder="Branch" value={form.branch} onChange={e => setForm({...form, branch: e.target.value})} />
            <input className="input-field" placeholder="Graduation Year" type="number" value={form.graduation_year} onChange={e => setForm({...form, graduation_year: e.target.value})} />
            <input className="input-field" placeholder="LinkedIn URL" value={form.linkedin_url} onChange={e => setForm({...form, linkedin_url: e.target.value})} />
            <input className="input-field" placeholder="GitHub URL" value={form.github_url} onChange={e => setForm({...form, github_url: e.target.value})} />
          </div>
          <textarea className="input-field" rows={3} placeholder="Professional Summary" value={form.summary} onChange={e => setForm({...form, summary: e.target.value})} />
          <input className="input-field" placeholder="Skills (comma-separated)" value={typeof form.skills === "string" ? form.skills : form.skills?.join(", ")} onChange={e => setForm({...form, skills: e.target.value})} />
          <div className="flex gap-3">
            <button onClick={handleSave} className="btn-primary">Save Resume</button>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {resumes.map(resume => (
          <div key={resume.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{resume.title}</h3>
                <p className="text-sm text-gray-500">{resume.full_name} • {resume.email}</p>
              </div>
              <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-full">{resume.completion_score}% complete</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1">
              {(resume.skills || []).slice(0, 5).map((s, i) => <span key={i} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{s}</span>)}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => handleEdit(resume)} className="btn-secondary text-xs">Edit</button>
              <button onClick={() => handleExport(resume.id)} className="btn-secondary text-xs">Export PDF</button>
              <button onClick={() => handleDelete(resume.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
            </div>
          </div>
        ))}
      </div>
      {resumes.length === 0 && !showForm && <div className="text-center py-12 text-gray-500">No resumes yet. Create your first one!</div>}
    </div>
  );
}
