import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { roadmapService } from "../services/roadmapService";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function RoadmapDetailPage() {
  const { slug } = useParams();
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchRoadmap(); }, [slug]);

  const fetchRoadmap = async () => {
    try {
      const res = await roadmapService.getRoadmap(slug);
      setRoadmap(res.data.data);
    } catch { toast.error("Failed to load roadmap"); }
    finally { setLoading(false); }
  };

  const handleEnroll = async () => {
    try {
      await roadmapService.enrollRoadmap(slug);
      toast.success("Enrolled successfully!");
      fetchRoadmap();
    } catch (e) { toast.error(e.response?.data?.error?.message || "Failed"); }
  };

  const handleToggleStep = async (stepId, isCompleted) => {
    try {
      if (isCompleted) {
        await roadmapService.uncompleteStep(stepId);
      } else {
        await roadmapService.completeStep(stepId);
        toast.success("Step completed! +10 XP");
      }
      fetchRoadmap();
    } catch (e) { toast.error(e.response?.data?.error?.message || "Failed"); }
  };

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;
  if (!roadmap) return <p className="text-gray-500">Roadmap not found.</p>;

  const progress = roadmap.progress;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="card">
        <div className="flex items-start gap-4">
          <span className="text-4xl">{roadmap.icon}</span>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{roadmap.title}</h1>
            <p className="text-gray-600 mt-2">{roadmap.description}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="badge-blue">{roadmap.difficulty}</span>
              <span className="badge-green">{roadmap.estimated_weeks} weeks</span>
              <span className="badge-purple">{roadmap.total_steps} steps</span>
            </div>
          </div>
        </div>

        {progress ? (
          <div className="mt-4 p-4 bg-primary-50 rounded-xl">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-primary-700">{progress.completed_steps}/{progress.total_steps} steps</span>
              <span className="font-bold text-primary-700">{progress.percentage}%</span>
            </div>
            <div className="w-full bg-primary-200 rounded-full h-3">
              <div className="bg-primary-600 h-3 rounded-full transition-all" style={{ width: `${progress.percentage}%` }} />
            </div>
          </div>
        ) : (
          <button onClick={handleEnroll} className="btn-primary mt-4">Enroll in Roadmap</button>
        )}
      </div>

      {roadmap.milestones?.map((milestone, idx) => (
        <div key={milestone.id} className="card">
          <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-bold">{idx + 1}</span>
            {milestone.title}
          </h3>
          {milestone.description && <p className="text-sm text-gray-500 mt-1 ml-9">{milestone.description}</p>}
          <div className="mt-4 space-y-2 ml-9">
            {milestone.steps?.map((step) => (
              <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <button onClick={() => progress && handleToggleStep(step.id, step.is_completed)}
                  disabled={!progress}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                    step.is_completed ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-primary-400"
                  }`}>
                  {step.is_completed && <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${step.is_completed ? "text-gray-400 line-through" : "text-gray-800"}`}>{step.title}</p>
                  {step.description && <p className="text-xs text-gray-500 mt-0.5">{step.description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-400">{step.estimated_minutes} min</span>
                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">{step.step_type}</span>
                    {step.resource_url && <a href={step.resource_url} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline">Resource →</a>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
