import { useState, useEffect } from "react";
import { assignmentService } from "../services/assignmentService";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState("");

  useEffect(() => { fetchAssignments(); }, []);

  const fetchAssignments = async () => {
    try {
      const res = await assignmentService.getAssignments();
      setAssignments(res.data.data?.results || res.data.data || []);
    } catch { toast.error("Failed to load assignments"); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (id) => {
    try {
      setSubmitting(true);
      const fd = new FormData();
      fd.append("content", content);
      await assignmentService.submitAssignment(id, fd);
      toast.success("Assignment submitted!");
      setSelectedAssignment(null); setContent(""); fetchAssignments();
    } catch (e) { toast.error(e.response?.data?.error?.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const getStatusColor = (status) => {
    const colors = { pending: "bg-yellow-50 text-yellow-700", submitted: "bg-blue-50 text-blue-700", late: "bg-orange-50 text-orange-700", graded: "bg-green-50 text-green-700" };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  if (loading) return <LoadingSpinner size="lg" className="mt-20" />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">Assignments</h1><p className="text-sm text-gray-500">View and submit your homework</p></div>

      <div className="space-y-4">
        {assignments.map(a => (
          <div key={a.id} className="card">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{a.title}</h3>
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{a.description}</p>
                <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{a.subject}</span>
                  <span>Max: {a.max_marks} marks</span>
                  <span>Due: {new Date(a.deadline).toLocaleDateString()}</span>
                  <span>By: {a.created_by_name}</span>
                </div>
              </div>
              {a.my_submission ? (
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(a.my_submission.status)}`}>{a.my_submission.status}</span>
                  {a.my_submission.marks !== null && <p className="text-sm font-bold text-green-600 mt-1">{a.my_submission.marks}/{a.max_marks}</p>}
                </div>
              ) : (
                <button onClick={() => setSelectedAssignment(a)} className="btn-primary text-sm">Submit</button>
              )}
            </div>

            {selectedAssignment?.id === a.id && (
              <div className="mt-4 pt-4 border-t space-y-3">
                <textarea className="input-field" rows={4} placeholder="Your answer / notes..." value={content} onChange={e => setContent(e.target.value)} />
                <div className="flex gap-2">
                  <button onClick={() => handleSubmit(a.id)} disabled={submitting} className="btn-primary text-sm">{submitting ? "Submitting..." : "Submit"}</button>
                  <button onClick={() => setSelectedAssignment(null)} className="btn-secondary text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {assignments.length === 0 && <div className="text-center py-12 text-gray-500">No assignments available.</div>}
    </div>
  );
}
