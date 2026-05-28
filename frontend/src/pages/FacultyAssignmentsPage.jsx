import React, { useState, useEffect } from "react";
import facultyService from "../services/facultyService";

export default function FacultyAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [newAssignment, setNewAssignment] = useState({
    title: "", description: "", subject: "computer_science", branch: "", semester: "", section: "", deadline: "", max_marks: 100
  });

  useEffect(() => { fetchAssignments(); }, []);

  const fetchAssignments = async () => {
    try {
      const res = await facultyService.getAssignments();
      setAssignments(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const createAssignment = async () => {
    try {
      const formData = new FormData();
      Object.entries(newAssignment).forEach(([k, v]) => { if (v) formData.append(k, v); });
      await facultyService.createAssignment(formData);
      setShowCreate(false);
      fetchAssignments();
    } catch (err) { console.error(err); }
  };

  const viewSubmissions = async (id) => {
    try {
      const res = await facultyService.getSubmissions(id);
      setSubmissions(res.data.data || []);
      setSelectedAssignment(id);
    } catch (err) { console.error(err); }
  };

  const gradeSubmission = async (subId, marks, feedback, action = "grade") => {
    try {
      await facultyService.gradeSubmission(subId, { marks, feedback, action });
      viewSubmissions(selectedAssignment);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assignment Management</h1>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Assignment</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment List */}
        <div className="space-y-3">
          {assignments.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => viewSubmissions(a.id)}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium text-gray-900">{a.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{a.subject} • {a.section}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${a.pending_count > 0 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}>
                  {a.pending_count > 0 ? `${a.pending_count} pending` : "All graded"}
                </span>
              </div>
              <div className="flex gap-4 mt-3 text-xs text-gray-500">
                <span>📤 {a.total_submissions} submissions</span>
                <span>✅ {a.graded_count} graded</span>
                <span>📅 Due: {new Date(a.deadline).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {assignments.length === 0 && <div className="text-center text-gray-400 py-8">No assignments created yet</div>}
        </div>

        {/* Submissions Panel */}
        <div>
          {selectedAssignment && submissions.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-800">Submissions</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {submissions.map((s) => (
                  <div key={s.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{s.student_name}</p>
                        <p className="text-xs text-gray-500">{s.student_id} • {s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "Not submitted"}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        s.status === "graded" ? "bg-green-100 text-green-700" :
                        s.status === "submitted" ? "bg-blue-100 text-blue-700" :
                        s.status === "returned" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"
                      }`}>{s.status}</span>
                    </div>
                    {s.content && <p className="text-xs text-gray-600 mt-2 line-clamp-2">{s.content}</p>}
                    {s.status === "submitted" && (
                      <div className="flex gap-2 mt-3">
                        <button onClick={() => {
                          const marks = prompt("Enter marks:");
                          if (marks) gradeSubmission(s.id, parseFloat(marks), "", "grade");
                        }} className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700">Grade</button>
                        <button onClick={() => gradeSubmission(s.id, null, "Please revise", "return")}
                          className="text-xs px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700">Return</button>
                      </div>
                    )}
                    {s.marks && <p className="text-xs text-green-700 mt-2 font-medium">Marks: {s.marks}</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center text-gray-400">
              Select an assignment to view submissions
            </div>
          )}
        </div>
      </div>

      {/* Create Assignment Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create Assignment</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Title" value={newAssignment.title} onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <textarea placeholder="Description" value={newAssignment.description} onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-24 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Branch" value={newAssignment.branch} onChange={(e) => setNewAssignment({...newAssignment, branch: e.target.value})}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="text" placeholder="Section" value={newAssignment.section} onChange={(e) => setNewAssignment({...newAssignment, section: e.target.value})}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input type="number" placeholder="Semester" value={newAssignment.semester} onChange={(e) => setNewAssignment({...newAssignment, semester: e.target.value})}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="number" placeholder="Max Marks" value={newAssignment.max_marks} onChange={(e) => setNewAssignment({...newAssignment, max_marks: e.target.value})}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="datetime-local" value={newAssignment.deadline} onChange={(e) => setNewAssignment({...newAssignment, deadline: e.target.value})}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={createAssignment} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
