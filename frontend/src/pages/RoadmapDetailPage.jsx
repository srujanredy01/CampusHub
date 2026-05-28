import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../services/api";
import { toast } from "react-toastify";

const DIFFICULTY_COLORS = {
  beginner: "bg-green-100 text-green-700",
  intermediate: "bg-amber-100 text-amber-700",
  advanced: "bg-red-100 text-red-700",
};

const STEP_TYPE_ICONS = {
  learn: "📖", practice: "💪", project: "🛠️",
  quiz: "❓", resource: "🔗", video: "🎬", article: "📄",
};

function MilestoneSection({ milestone, onStepToggle, completedSteps }) {
  const [expanded, setExpanded] = useState(true);
  const stepsCompleted = milestone.steps.filter((s) => completedSteps.has(s.id)).length;
  const totalSteps = milestone.steps.length;
  const pct = totalSteps > 0 ? Math.round((stepsCompleted / totalSteps) * 100) : 0;

  return (
    <div className="border border-surface-200/60 rounded-xl overflow-hidden">
      {/* Milestone Header */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 bg-surface-50/50 hover:bg-surface-100/50 transition-colors text-left">
        <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
          {milestone.order + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-surface-800">{milestone.title}</h3>
          {milestone.description && (
            <p className="text-xs text-surface-500 mt-0.5 truncate">{milestone.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-surface-400">{stepsCompleted}/{totalSteps}</span>
          <div className="w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className={`text-surface-400 transition-transform ${expanded ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {/* Steps */}
      {expanded && (
        <div className="divide-y divide-surface-100">
          {milestone.steps.map((step) => {
            const isCompleted = completedSteps.has(step.id);
            return (
              <div key={step.id} className={`flex items-start gap-3 p-4 ${isCompleted ? "bg-success-50/30" : ""}`}>
                <button onClick={() => onStepToggle(step.id, !isCompleted)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${isCompleted ? "bg-success-500 border-success-500 text-white" : "border-surface-300 hover:border-primary-400"}`}>
                  {isCompleted && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{STEP_TYPE_ICONS[step.step_type] || "📌"}</span>
                    <h4 className={`text-sm font-medium ${isCompleted ? "text-surface-500 line-through" : "text-surface-800"}`}>
                      {step.title}
                    </h4>
                    {step.is_optional && (
                      <span className="text-2xs text-surface-400 bg-surface-100 px-1.5 py-0.5 rounded">optional</span>
                    )}
                  </div>
                  {step.description && (
                    <p className="text-xs text-surface-500 mt-1">{step.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2">
                    {step.estimated_minutes > 0 && (
                      <span className="text-2xs text-surface-400">~{step.estimated_minutes}min</span>
                    )}
                    {step.resource_url && (
                      <a href={step.resource_url} target="_blank" rel="noopener noreferrer"
                        className="text-2xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        {step.resource_title || "Resource"}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function RoadmapDetailPage() {
  const { slug } = useParams();
  const { user } = useSelector((s) => s.auth);
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [enrolling, setEnrolling] = useState(false);

  const fetchRoadmap = useCallback(async () => {
    try {
      const res = await api.get(`/roadmaps/${slug}`);
      const data = res.data?.data || res.data;
      setRoadmap(data);

      // Build completed steps set from milestones
      const completed = new Set();
      if (data.milestones) {
        data.milestones.forEach((m) => {
          m.steps?.forEach((s) => {
            if (s.is_completed) completed.add(s.id);
          });
        });
      }
      setCompletedSteps(completed);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [slug]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await api.get(`/roadmaps/${slug}/comments`);
      setComments(res.data?.data || []);
    } catch { /* ignore */ }
  }, [slug]);

  useEffect(() => { fetchRoadmap(); fetchComments(); }, [fetchRoadmap, fetchComments]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      await api.post(`/roadmaps/${slug}/enroll`);
      toast.success("Enrolled! Start completing steps.");
      fetchRoadmap();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to enroll");
    } finally { setEnrolling(false); }
  };

  const handleStepToggle = async (stepId, complete) => {
    try {
      if (complete) {
        await api.post(`/roadmaps/steps/${stepId}/complete`);
        setCompletedSteps((prev) => new Set([...prev, stepId]));
      } else {
        await api.delete(`/roadmaps/steps/${stepId}/uncomplete`);
        setCompletedSteps((prev) => { const s = new Set(prev); s.delete(stepId); return s; });
      }
      fetchRoadmap(); // Refresh progress
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to update step");
    }
  };

  const handleLike = async () => {
    try {
      const res = await api.post(`/roadmaps/${slug}/like`);
      setRoadmap((prev) => prev ? { ...prev, is_liked: res.data?.data?.is_liked, like_count: res.data?.data?.like_count } : prev);
    } catch { /* ignore */ }
  };

  const handleBookmark = async () => {
    try {
      const res = await api.post(`/roadmaps/${slug}/bookmark`);
      setRoadmap((prev) => prev ? { ...prev, is_bookmarked: res.data?.data?.is_bookmarked } : prev);
      toast.success(res.data?.data?.is_bookmarked ? "Bookmarked!" : "Bookmark removed");
    } catch { /* ignore */ }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      await api.post(`/roadmaps/${slug}/comments`, { content: newComment.trim() });
      setNewComment("");
      fetchComments();
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to add comment");
    }
  };

  if (loading) return <div className="page-container max-w-4xl"><div className="skeleton h-64 rounded-xl" /><div className="skeleton h-96 rounded-xl mt-4" /></div>;
  if (!roadmap) return <div className="page-container"><div className="flex flex-col items-center py-16"><p className="text-base font-medium text-surface-700">Roadmap not found</p><Link to="/roadmaps" className="mt-4 text-sm text-primary-600 hover:text-primary-700">← Back to Roadmaps</Link></div></div>;

  const progress = roadmap.progress;
  const isEnrolled = !!progress;

  return (
    <div className="page-container max-w-4xl space-y-6">
      {/* Back */}
      <Link to="/roadmaps" className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Roadmaps
      </Link>

      {/* Header Card */}
      <div className="card-padded">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: `${roadmap.color}15` }}>
            {roadmap.icon || "🗺️"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-display font-bold text-surface-900">{roadmap.title}</h1>
              {roadmap.is_faculty_verified && (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">✓ Faculty Verified</span>
              )}
              {roadmap.status !== "approved" && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{roadmap.status}</span>
              )}
            </div>
            <p className="text-sm text-surface-500 mt-1">{roadmap.description}</p>

            {/* Meta row */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DIFFICULTY_COLORS[roadmap.difficulty]}`}>{roadmap.difficulty}</span>
              <span className="text-xs text-surface-400">{roadmap.total_steps} steps</span>
              <span className="text-xs text-surface-400">~{roadmap.estimated_weeks} weeks</span>
              <span className="text-xs text-surface-400">{roadmap.enrolled_count} enrolled</span>
              {roadmap.creator_name && <span className="text-xs text-surface-400">by {roadmap.creator_name}</span>}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-surface-100">
          {!isEnrolled ? (
            <button onClick={handleEnroll} disabled={enrolling}
              className="px-5 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50">
              {enrolling ? "Enrolling..." : "Start This Roadmap"}
            </button>
          ) : (
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-primary-600">{progress.percentage}% complete</span>
                  <span className="text-xs text-surface-400">{progress.completed_steps}/{progress.total_steps} steps</span>
                </div>
                <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${progress.percentage}%` }} />
                </div>
              </div>
            </div>
          )}

          <button onClick={handleLike}
            className={`p-2 rounded-lg transition-colors ${roadmap.is_liked ? "text-red-500 bg-red-50" : "text-surface-400 hover:text-red-500 hover:bg-red-50"}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={roadmap.is_liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          <button onClick={handleBookmark}
            className={`p-2 rounded-lg transition-colors ${roadmap.is_bookmarked ? "text-primary-600 bg-primary-50" : "text-surface-400 hover:text-primary-600 hover:bg-primary-50"}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={roadmap.is_bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Milestones & Steps */}
      {roadmap.milestones && roadmap.milestones.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-surface-800">Learning Path</h2>
          {roadmap.milestones.map((milestone) => (
            <MilestoneSection
              key={milestone.id}
              milestone={milestone}
              onStepToggle={handleStepToggle}
              completedSteps={completedSteps}
            />
          ))}
        </div>
      )}

      {/* Comments */}
      <div className="card-padded">
        <h3 className="text-sm font-semibold text-surface-800 mb-4">
          Discussion ({comments.length})
        </h3>
        <form onSubmit={handleComment} className="flex gap-2 mb-4">
          <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            className="flex-1 px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none" />
          <button type="submit" disabled={!newComment.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-40 transition-colors">
            Post
          </button>
        </form>
        {comments.length === 0 ? (
          <p className="text-xs text-surface-400 text-center py-4">No comments yet. Be the first!</p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <div className="w-7 h-7 rounded-full bg-surface-200 flex items-center justify-center text-xs font-medium text-surface-600 flex-shrink-0">
                  {(c.user_name || "U")[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-surface-700">{c.user_name}</span>
                    <span className="text-2xs text-surface-400">{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-surface-600 mt-0.5">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
