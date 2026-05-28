import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-toastify";

const CATEGORIES = [
  { id: "web_development", label: "Web Development" },
  { id: "ai_ml", label: "AI / Machine Learning" },
  { id: "dsa_placements", label: "DSA + Placements" },
  { id: "system_design", label: "System Design" },
  { id: "devops", label: "DevOps" },
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "full_stack", label: "Full Stack" },
  { id: "cloud_computing", label: "Cloud Computing" },
  { id: "cybersecurity", label: "Cybersecurity" },
  { id: "mobile_dev", label: "Mobile Dev" },
  { id: "data_science", label: "Data Science" },
  { id: "academic", label: "Academic Subject" },
  { id: "placement_prep", label: "Placement Prep" },
  { id: "other", label: "Other" },
];

const STEP_TYPES = [
  { id: "learn", label: "📖 Learn" },
  { id: "practice", label: "💪 Practice" },
  { id: "project", label: "🛠️ Project" },
  { id: "video", label: "🎬 Video" },
  { id: "article", label: "📄 Article" },
  { id: "resource", label: "🔗 Resource" },
  { id: "quiz", label: "❓ Quiz" },
];

function MilestoneBuilder({ milestone, index, onChange, onRemove }) {
  const addStep = () => {
    const steps = [...(milestone.steps || []), { title: "", description: "", step_type: "learn", resource_url: "", resource_title: "", estimated_minutes: 30 }];
    onChange({ ...milestone, steps });
  };

  const updateStep = (stepIdx, field, value) => {
    const steps = [...milestone.steps];
    steps[stepIdx] = { ...steps[stepIdx], [field]: value };
    onChange({ ...milestone, steps });
  };

  const removeStep = (stepIdx) => {
    const steps = milestone.steps.filter((_, i) => i !== stepIdx);
    onChange({ ...milestone, steps });
  };

  return (
    <div className="border border-surface-200 rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {index + 1}
        </div>
        <input type="text" value={milestone.title} onChange={(e) => onChange({ ...milestone, title: e.target.value })}
          className="flex-1 px-3 py-2 border border-surface-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none"
          placeholder="Milestone title (e.g., Fundamentals)" />
        <button type="button" onClick={onRemove} className="p-1.5 text-surface-400 hover:text-danger-500 rounded-lg hover:bg-danger-50 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>

      {/* Steps */}
      <div className="space-y-2 pl-11">
        {(milestone.steps || []).map((step, stepIdx) => (
          <div key={stepIdx} className="flex items-start gap-2 p-3 bg-surface-50 rounded-lg">
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <input type="text" value={step.title} onChange={(e) => updateStep(stepIdx, "title", e.target.value)}
                  className="flex-1 px-2.5 py-1.5 border border-surface-200 rounded-md text-xs focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none"
                  placeholder="Step title" />
                <select value={step.step_type} onChange={(e) => updateStep(stepIdx, "step_type", e.target.value)}
                  className="px-2 py-1.5 border border-surface-200 rounded-md text-xs focus:ring-2 focus:ring-primary-100 outline-none">
                  {STEP_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <input type="text" value={step.resource_url || ""} onChange={(e) => updateStep(stepIdx, "resource_url", e.target.value)}
                className="w-full px-2.5 py-1.5 border border-surface-200 rounded-md text-xs focus:ring-2 focus:ring-primary-100 outline-none"
                placeholder="Resource URL (optional)" />
            </div>
            <button type="button" onClick={() => removeStep(stepIdx)} className="p-1 text-surface-300 hover:text-danger-500 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
        <button type="button" onClick={addStep}
          className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 py-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Step
        </button>
      </div>
    </div>
  );
}

export default function RoadmapCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", category: "web_development", description: "",
    difficulty: "beginner", estimated_weeks: 4,
    prerequisites: "", skills_covered: "", target_role: "",
  });
  const [milestones, setMilestones] = useState([
    { title: "", steps: [{ title: "", description: "", step_type: "learn", resource_url: "", estimated_minutes: 30 }] },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addMilestone = () => {
    setMilestones([...milestones, { title: "", steps: [{ title: "", step_type: "learn", resource_url: "", estimated_minutes: 30 }] }]);
  };

  const updateMilestone = (idx, data) => {
    const updated = [...milestones];
    updated[idx] = data;
    setMilestones(updated);
  };

  const removeMilestone = (idx) => {
    if (milestones.length <= 1) { toast.error("At least one milestone is required"); return; }
    setMilestones(milestones.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e, asDraft = true) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.description.trim() || form.description.trim().length < 20) { toast.error("Description must be at least 20 characters"); return; }

    // Validate milestones have titles and steps
    const validMilestones = milestones.filter((m) => m.title.trim());
    if (validMilestones.length === 0) { toast.error("At least one milestone with a title is required"); return; }

    const totalSteps = validMilestones.reduce((sum, m) => sum + (m.steps || []).filter((s) => s.title.trim()).length, 0);
    if (totalSteps < 3) { toast.error("Add at least 3 steps across your milestones"); return; }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        milestones: validMilestones.map((m, idx) => ({
          title: m.title.trim(),
          description: m.description || "",
          order: idx,
          steps: (m.steps || []).filter((s) => s.title.trim()).map((s, sIdx) => ({
            title: s.title.trim(),
            description: s.description || "",
            step_type: s.step_type || "learn",
            order: sIdx,
            resource_url: s.resource_url || "",
            resource_title: s.resource_title || "",
            estimated_minutes: s.estimated_minutes || 30,
          })),
        })),
      };

      const res = await api.post("/roadmaps/create", payload);
      const roadmap = res.data?.data;

      if (!asDraft && roadmap?.slug) {
        // Submit for review immediately
        await api.post(`/roadmaps/${roadmap.slug}/submit`);
        toast.success("Roadmap submitted for review!");
      } else {
        toast.success("Roadmap saved as draft!");
      }

      navigate("/roadmaps");
    } catch (err) {
      const msg = err?.response?.data?.errors
        ? Object.values(err.response.data.errors).flat()[0]
        : err?.response?.data?.error?.message || "Failed to create roadmap";
      toast.error(msg);
    } finally { setSubmitting(false); }
  };

  return (
    <div className="page-container max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/roadmaps" className="p-2 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </Link>
        <div>
          <h1 className="page-title">Create Roadmap</h1>
          <p className="page-subtitle">Build a structured learning path for the community</p>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-6">
        {/* Basic Info */}
        <div className="card-padded space-y-4">
          <h2 className="text-sm font-semibold text-surface-800">Basic Information</h2>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1.5 block">Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none"
              placeholder="e.g., Complete Web Development Roadmap 2024" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1.5 block">Category *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 outline-none">
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1.5 block">Difficulty</label>
              <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 outline-none">
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1.5 block">Description *</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 outline-none min-h-[80px] resize-none"
              placeholder="What will learners achieve? Who is this for?" required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1.5 block">Duration (weeks)</label>
              <input type="number" min="1" max="52" value={form.estimated_weeks}
                onChange={(e) => setForm({ ...form, estimated_weeks: parseInt(e.target.value) || 4 })}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1.5 block">Target Role</label>
              <input type="text" value={form.target_role} onChange={(e) => setForm({ ...form, target_role: e.target.value })}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 outline-none"
                placeholder="e.g., Frontend Dev" />
            </div>
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1.5 block">Skills Covered</label>
              <input type="text" value={form.skills_covered} onChange={(e) => setForm({ ...form, skills_covered: e.target.value })}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 outline-none"
                placeholder="React, Node.js, etc." />
            </div>
          </div>
        </div>

        {/* Milestones Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-surface-800">Learning Path</h2>
            <button type="button" onClick={addMilestone}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Milestone
            </button>
          </div>
          {milestones.map((milestone, idx) => (
            <MilestoneBuilder key={idx} milestone={milestone} index={idx}
              onChange={(data) => updateMilestone(idx, data)}
              onRemove={() => removeMilestone(idx)} />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-surface-100">
          <p className="text-xs text-surface-400">
            {milestones.reduce((sum, m) => sum + (m.steps || []).filter((s) => s.title.trim()).length, 0)} steps total
          </p>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-surface-700 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors disabled:opacity-50">
              {submitting ? "Saving..." : "Save Draft"}
            </button>
            <button type="button" onClick={(e) => handleSubmit(e, false)} disabled={submitting}
              className="px-5 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 shadow-sm">
              {submitting ? "Submitting..." : "Submit for Review"}
            </button>
          </div>
        </div>
      </form>

      {/* Info */}
      <div className="p-4 rounded-xl bg-info-50 border border-info-100">
        <div className="flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" className="flex-shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
          </svg>
          <div>
            <p className="text-xs font-medium text-info-800">Moderation Process</p>
            <p className="text-xs text-info-600 mt-0.5">
              Submitted roadmaps are reviewed by moderators before becoming public.
              You can save as draft and submit later when ready.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
