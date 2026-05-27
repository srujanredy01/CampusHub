import { useState, useEffect } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await api.get("/admin/questions/"); setQuestions(Array.isArray(res.data) ? res.data : res.data.results || []); }
      catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetch();
  }, []);

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="page-title">Manage Coding Problems</h1><p className="page-subtitle">Add and manage coding challenges</p></div></div>
      <div className="table-container">
        <table className="w-full">
          <thead className="table-head"><tr><th className="th">Title</th><th className="th">Difficulty</th><th className="th">Category</th><th className="th">Submissions</th></tr></thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => <tr key={i} className="tr"><td colSpan={4} className="td"><div className="skeleton h-8 rounded-md" /></td></tr>) :
            questions.length === 0 ? <tr><td colSpan={4} className="td text-center py-12 text-surface-400">No questions</td></tr> :
            questions.map((q) => (
              <tr key={q.id} className="tr">
                <td className="td text-sm font-medium text-surface-800">{q.title}</td>
                <td className="td"><span className={`badge-${q.difficulty === "Easy" ? "easy" : q.difficulty === "Medium" ? "medium" : "hard"}`}>{q.difficulty}</span></td>
                <td className="td"><span className="badge-neutral">{q.category || "—"}</span></td>
                <td className="td text-sm text-surface-500 tabular-nums">{q.submissions_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
