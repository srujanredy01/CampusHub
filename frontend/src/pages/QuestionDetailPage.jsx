import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import api from "../services/api";

const languages = [
  { id: "python", label: "Python" },
  { id: "javascript", label: "JavaScript" },
  { id: "cpp", label: "C++" },
  { id: "java", label: "Java" },
];

export default function QuestionDetailPage() {
  const { id } = useParams();
  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("# Write your solution here\n");
  const [activeTab, setActiveTab] = useState("description");
  const [output, setOutput] = useState(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        const res = await api.get(`/questions/${id}/`);
        setQuestion(res.data);
        if (res.data.starter_code) setCode(res.data.starter_code);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchQuestion();
  }, [id]);

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);
    try {
      const res = await api.post("/code/run/", { question_id: id, language, code });
      setOutput(res.data);
    } catch (err) {
      setOutput({ error: err.response?.data?.error || "Execution failed" });
    } finally { setRunning(false); }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setOutput(null);
    try {
      const res = await api.post("/code/submit/", { question_id: id, language, code });
      setOutput(res.data);
    } catch (err) {
      setOutput({ error: err.response?.data?.error || "Submission failed" });
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-var(--header-height)-2rem)] flex gap-4">
        <div className="w-1/2 skeleton rounded-xl" />
        <div className="w-1/2 skeleton rounded-xl" />
      </div>
    );
  }

  if (!question) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">Problem not found</p>
        <Link to="/coding" className="btn-primary mt-4">Back to Coding Hub</Link>
      </div>
    );
  }

  const diffClass = { Easy: "badge-easy", Medium: "badge-medium", Hard: "badge-hard" };

  return (
    <div className="h-[calc(100vh-var(--header-height)-2rem)] flex flex-col lg:flex-row gap-4 -m-4 md:-m-6 lg:-m-8 p-4 md:p-6 lg:p-8">
      {/* Left Panel — Problem Description */}
      <div className="lg:w-[45%] flex flex-col card-flush overflow-hidden">
        {/* Problem header */}
        <div className="px-5 py-4 border-b border-surface-100">
          <div className="flex items-center gap-2 mb-2">
            <Link to="/coding" className="text-surface-400 hover:text-surface-600 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </Link>
            <span className={diffClass[question.difficulty] || "badge-neutral"}>{question.difficulty}</span>
            {question.category && <span className="badge-neutral">{question.category}</span>}
          </div>
          <h1 className="text-xl font-display font-bold text-surface-900">{question.title}</h1>
        </div>

        {/* Tabs */}
        <div className="tab-bar px-5">
          {["description", "submissions", "hints"].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? "tab-active" : "tab-inactive"}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === "description" && (
            <div className="prose prose-sm max-w-none text-surface-700 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: question.description || question.content || "" }}
            />
          )}
          {activeTab === "submissions" && (
            <div className="empty-state py-8">
              <p className="empty-state-title">No submissions yet</p>
              <p className="empty-state-desc">Submit your solution to see results here</p>
            </div>
          )}
          {activeTab === "hints" && (
            <div className="space-y-3">
              {question.hints?.length > 0 ? question.hints.map((h, i) => (
                <div key={i} className="p-3 bg-warning-50 border border-warning-100 rounded-lg text-sm text-warning-700">{h}</div>
              )) : <p className="text-sm text-surface-400">No hints available for this problem.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel — Code Editor */}
      <div className="lg:w-[55%] flex flex-col card-flush overflow-hidden">
        {/* Editor header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-900 border-b border-surface-800">
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-surface-800 text-white text-xs px-2.5 py-1.5 rounded-md border border-surface-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {languages.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRun} disabled={running}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-700 hover:bg-surface-600 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50">
              {running ? (
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              )}
              Run
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success-600 hover:bg-success-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50">
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={language === "cpp" ? "cpp" : language}
            value={code}
            onChange={(val) => setCode(val || "")}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              padding: { top: 16 },
              lineNumbers: "on",
              renderLineHighlight: "line",
              smoothScrolling: true,
              cursorBlinking: "smooth",
              tabSize: 4,
            }}
          />
        </div>

        {/* Output Panel */}
        {output && (
          <div className="border-t border-surface-800 bg-surface-950 p-4 max-h-48 overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-surface-400 uppercase">Output</span>
              {output.status === "accepted" && <span className="badge-success">Accepted</span>}
              {output.status === "wrong_answer" && <span className="badge-danger">Wrong Answer</span>}
              {output.error && <span className="badge-danger">Error</span>}
            </div>
            <pre className="text-xs text-surface-300 font-mono whitespace-pre-wrap">
              {output.output || output.error || output.message || JSON.stringify(output, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
