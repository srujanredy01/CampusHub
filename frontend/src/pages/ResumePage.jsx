import { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

export default function ResumePage() {
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("personal");

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get("/resume/");
        setResume(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const sections = [
    { id: "personal", label: "Personal Info" },
    { id: "education", label: "Education" },
    { id: "experience", label: "Experience" },
    { id: "skills", label: "Skills" },
    { id: "projects", label: "Projects" },
    { id: "certifications", label: "Certifications" },
  ];

  if (loading) {
    return (
      <div className="page-container space-y-6">
        <div className="skeleton h-12 w-48 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="skeleton h-96 rounded-xl" />
          <div className="skeleton h-96 rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Resume Builder</h1>
          <p className="page-subtitle">Build and manage your professional resume</p>
        </div>
        <button className="btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Download PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section Nav */}
        <nav className="lg:col-span-1">
          <div className="card-padded space-y-1">
            {sections.map((s) => (
              <button key={s.id} onClick={() => setActiveSection(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeSection === s.id ? "bg-primary-50 text-primary-700" : "text-surface-500 hover:bg-surface-50 hover:text-surface-700"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Form Content */}
        <div className="lg:col-span-3">
          <div className="card-padded space-y-5">
            {activeSection === "personal" && (
              <>
                <h3 className="text-base font-semibold text-surface-900">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="form-group"><label className="input-label">Full Name</label><input type="text" className="input" placeholder="John Doe" defaultValue={resume?.name} /></div>
                  <div className="form-group"><label className="input-label">Email</label><input type="email" className="input" placeholder="john@email.com" defaultValue={resume?.email} /></div>
                  <div className="form-group"><label className="input-label">Phone</label><input type="tel" className="input" placeholder="+91 9876543210" defaultValue={resume?.phone} /></div>
                  <div className="form-group"><label className="input-label">Location</label><input type="text" className="input" placeholder="City, State" defaultValue={resume?.location} /></div>
                  <div className="form-group sm:col-span-2"><label className="input-label">Summary</label><textarea className="input min-h-[80px] resize-none" placeholder="Brief professional summary..." defaultValue={resume?.summary} /></div>
                </div>
              </>
            )}
            {activeSection === "education" && (
              <>
                <h3 className="text-base font-semibold text-surface-900">Education</h3>
                <p className="text-sm text-surface-400">Add your educational background</p>
                <div className="border border-dashed border-surface-200 rounded-xl p-6 text-center">
                  <button className="btn-secondary">+ Add Education</button>
                </div>
              </>
            )}
            {activeSection === "experience" && (
              <>
                <h3 className="text-base font-semibold text-surface-900">Experience</h3>
                <p className="text-sm text-surface-400">Add internships and work experience</p>
                <div className="border border-dashed border-surface-200 rounded-xl p-6 text-center">
                  <button className="btn-secondary">+ Add Experience</button>
                </div>
              </>
            )}
            {activeSection === "skills" && (
              <>
                <h3 className="text-base font-semibold text-surface-900">Skills</h3>
                <p className="text-sm text-surface-400">List your technical and soft skills</p>
                <div className="form-group"><label className="input-label">Skills (comma separated)</label><input type="text" className="input" placeholder="Python, React, Machine Learning..." defaultValue={resume?.skills?.join(", ")} /></div>
              </>
            )}
            {activeSection === "projects" && (
              <>
                <h3 className="text-base font-semibold text-surface-900">Projects</h3>
                <p className="text-sm text-surface-400">Showcase your best work</p>
                <div className="border border-dashed border-surface-200 rounded-xl p-6 text-center">
                  <button className="btn-secondary">+ Add Project</button>
                </div>
              </>
            )}
            {activeSection === "certifications" && (
              <>
                <h3 className="text-base font-semibold text-surface-900">Certifications</h3>
                <p className="text-sm text-surface-400">Add relevant certifications</p>
                <div className="border border-dashed border-surface-200 rounded-xl p-6 text-center">
                  <button className="btn-secondary">+ Add Certification</button>
                </div>
              </>
            )}
            <div className="flex justify-end pt-4 border-t border-surface-100">
              <button className="btn-primary">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
