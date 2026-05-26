import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { roadmapService } from "../services/roadmapService";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/common/LoadingSpinner";

const CATEGORIES = [
  { value: "", label: "All Paths" },
  { value: "web_development", label: "Web Development" },
  { value: "ai_ml", label: "AI / Machine Learning" },
  { value: "devops", label: "DevOps" },
  { value: "cybersecurity", label: "Cybersecurity" },
  { value: "dsa_placements", label: "DSA + Placements" },
];

export default function RoadmapsPage() {
  const [roadmaps, setRoadmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const navigate = useNavigate();

  useEffect(() => { fetchRoadmaps(); }, [category]);

  const fetchRoadmaps = async () => {
    try {
      setLoading(true);
      const params = {};
      if (category) params.category = category;
      const res = await roadmapService.getRoadmaps(params);
      setRoadmaps(res.data.data?.results || res.data.data || []);
    } catch { toast.error("Failed to load roadmaps"); }
    finally { setLoading(false); }
  };

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Career Roadmaps</h1>
          <p className="text-gray-500 text-sm mt-1">Choose your path and track progress</p>
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="input-field w-48">
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {roadmaps.map((roadmap) => (
          <div key={roadmap.id} onClick={() => navigate(`/roadmaps/${roadmap.slug}`)}
            className="card cursor-pointer hover:shadow-lg transition-all group">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{roadmap.icon}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">{roadmap.title}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{roadmap.description}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 text-xs text-gray-500">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">{roadmap.difficulty}</span>
              <span>{roadmap.estimated_weeks} weeks</span>
              <span>{roadmap.enrolled_count} enrolled</span>
            </div>
            {roadmap.progress && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{roadmap.progress.status}</span>
                  <span>{roadmap.progress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-primary-500 h-2 rounded-full transition-all"
                    style={{ width: `${roadmap.progress.percentage}%` }} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {roadmaps.length === 0 && (
        <div className="text-center py-12 text-gray-500">No roadmaps available yet.</div>
      )}
    </div>
  );
}
