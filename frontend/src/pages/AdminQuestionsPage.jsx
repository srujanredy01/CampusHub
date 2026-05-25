import { useEffect, useState } from "react";
import api from "../services/api";
import { toast } from "react-toastify";

const TOPICS = ["arrays","strings","linked_list","trees","graphs","dp","sorting","searching","recursion","math","greedy","backtracking","stack_queue","hashing","bit_manipulation","other"];
const BLANK = { title:"", description:"", topic:"arrays", difficulty:"easy", constraints:"", sample_input:"", sample_output:"", explanation:"", hidden_test_cases:"[]", starter_code:"{}" };

const DIFF = {
  easy:   "bg-emerald-50 text-emerald-700 border border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border border-amber-200",
  hard:   "bg-red-50 text-red-700 border border-red-200",
};

function Skeleton() {
  return (
    <tr className="border-b border-slate-100">
      {[1,2,3,4,5,6,7].map(i => (
        <td key={i} className="px-4 py-3.5">
          <div className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${50 + i * 5}%` }} />
        </td>
      ))}
    </tr>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null); // null | "create" | question obj
  const [form,      setForm]      = useState(BLANK);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState("");
  const [filterDiff, setFilterDiff] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)     params.search     = search;
      if (filterDiff) params.difficulty = filterDiff;
      const res = await api.get("/admin/questions", { params });
      setQuestions(res.data.results || res.data.data || []);
    } catch { toast.error("Failed to load questions"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, filterDiff]);

  const openCreate = () => { setForm(BLANK); setModal("create"); };
  const openEdit   = (q) => {
    setForm({
      title: q.title, description: q.description, topic: q.topic,
      difficulty: q.difficulty, constraints: q.constraints || "",
      sample_input: q.sample_input || "", sample_output: q.sample_output || "",
      explanation: q.explanation || "",
      hidden_test_cases: JSON.stringify(q.hidden_test_cases || [], null, 2),
      starter_code: JSON.stringify(q.starter_code || {}, null, 2),
    });
    setModal(q);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      try { payload.hidden_test_cases = JSON.parse(form.hidden_test_cases); } catch { payload.hidden_test_cases = []; }
      try { payload.starter_code      = JSON.parse(form.starter_code); }      catch { payload.starter_code = {}; }

      if (modal === "create") {
        await api.post("/questions/create", payload);
        toast.success("Question created");
      } else {
        await api.put(`/questions/${modal.id}/manage`, payload);
        toast.success("Question updated");
      }
      setModal(null);
      load();
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs) Object.values(errs).flat().forEach(m => toast.error(m));
      else toast.error("Save failed");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await api.delete(`/questions/${id}/manage`);
      toast.success("Question deleted");
      load();
    } catch { toast.error("Delete failed"); }
  };

  const f = (field) => ({
    value: form[field],
    onChange: (e) => setForm(prev => ({ ...prev, [field]: e.target.value })),
  });

  const total  = questions.length;
  const easy   = questions.filter(q => q.difficulty === "easy").length;
  const medium = questions.filter(q => q.difficulty === "medium").length;
  const hard   = questions.filter(q => q.difficulty === "hard").length;

  return (
    <div className="space-y-5 animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Coding Questions</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage the problem bank</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Question
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total",  value: total,  cls: "bg-slate-50 border-slate-200 text-slate-700" },
          { label: "Easy",   value: easy,   cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
          { label: "Medium", value: medium, cls: "bg-amber-50 border-amber-200 text-amber-700" },
          { label: "Hard",   value: hard,   cls: "bg-red-50 border-red-200 text-red-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.cls}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" className="input-field pl-9" placeholder="Search questions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {["", "easy", "medium", "hard"].map(d => (
            <button key={d} onClick={() => setFilterDiff(d)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                filterDiff === d
                  ? d === "easy"   ? "bg-emerald-600 text-white border-emerald-600"
                  : d === "medium" ? "bg-amber-500 text-white border-amber-500"
                  : d === "hard"   ? "bg-red-600 text-white border-red-600"
                  : "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}>
              {d === "" ? "All" : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Title","Topic","Difficulty","Submissions","Accepted","Status","Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)
                : questions.length === 0
                ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-slate-200 mx-auto mb-3">
                        <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                      <p className="text-slate-500 font-medium">No questions found</p>
                    </td>
                  </tr>
                )
                : questions.map(q => (
                  <tr key={q.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-slate-800 max-w-[220px] truncate">{q.title}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs capitalize">{q.topic?.replace(/_/g," ")}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${DIFF[q.difficulty] || ""}`}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500">{q.total_submissions}</td>
                    <td className="px-4 py-3.5 text-slate-500">{q.accepted_submissions}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${q.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                        {q.is_active ? "Active" : "Deleted"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(q)} className="text-xs font-medium text-primary-600 hover:text-primary-700 px-2.5 py-1 rounded-lg hover:bg-primary-50 transition-colors">Edit</button>
                        {q.is_active && (
                          <button onClick={() => handleDelete(q.id, q.title)} className="text-xs font-medium text-red-600 hover:text-red-700 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>
        {!loading && questions.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <Modal title={modal === "create" ? "Add New Question" : "Edit Question"} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="input-label">Title *</label>
              <input type="text" className="input-field" {...f("title")} required />
            </div>
            <div>
              <label className="input-label">Description *</label>
              <textarea className="input-field resize-none" rows={4} {...f("description")} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Topic</label>
                <select className="input-field" {...f("topic")}>
                  {TOPICS.map(t => <option key={t} value={t}>{t.replace(/_/g," ")}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Difficulty</label>
                <select className="input-field" {...f("difficulty")}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
            <div>
              <label className="input-label">Constraints</label>
              <textarea className="input-field resize-none" rows={2} {...f("constraints")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Sample Input</label>
                <textarea className="input-field font-mono text-xs resize-none" rows={3} {...f("sample_input")} />
              </div>
              <div>
                <label className="input-label">Sample Output</label>
                <textarea className="input-field font-mono text-xs resize-none" rows={3} {...f("sample_output")} />
              </div>
            </div>
            <div>
              <label className="input-label">Explanation</label>
              <textarea className="input-field resize-none" rows={2} {...f("explanation")} />
            </div>
            <div>
              <label className="input-label">Hidden Test Cases (JSON)</label>
              <textarea className="input-field font-mono text-xs resize-none" rows={4} placeholder='[{"input":"1 2","expected_output":"3"}]' {...f("hidden_test_cases")} />
            </div>
            <div>
              <label className="input-label">Starter Code (JSON)</label>
              <textarea className="input-field font-mono text-xs resize-none" rows={3} placeholder='{"python":"# code here","java":"// code here"}' {...f("starter_code")} />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors text-sm">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-50">
                {saving ? "Saving..." : modal === "create" ? "Create Question" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
