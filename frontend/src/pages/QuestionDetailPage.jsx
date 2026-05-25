import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchQuestion, runCode, submitCode, saveQuestion,
  clearRunResult, clearSubmitResult,
} from "../store/slices/codingSlice";
import { toast } from "react-toastify";
import { codingService } from "../services/codingService";

// Lazy-load Monaco to avoid blocking initial render
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

// ── Constants ─────────────────────────────────────────────────────────────────
const LANGUAGES = [
  { value: "python",     label: "Python",     monaco: "python" },
  { value: "java",       label: "Java",       monaco: "java" },
  { value: "cpp",        label: "C++",        monaco: "cpp" },
  { value: "javascript", label: "JavaScript", monaco: "javascript" },
  { value: "c",          label: "C",          monaco: "c" },
  { value: "sql",        label: "SQL",        monaco: "sql" },
  { value: "go",         label: "Go",         monaco: "go" },
];

const STARTER = {
  python:     "# Write your solution here\n\ndef solution():\n    pass\n",
  java:       "public class Solution {\n    public static void main(String[] args) {\n        // Write your solution\n    }\n}\n",
  cpp:        "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // Write your solution\n    return 0;\n}\n",
  javascript: "// Write your solution here\n\nfunction solution() {\n\n}\n",
  c:          "#include <stdio.h>\n\nint main() {\n    // Write your solution\n    return 0;\n}\n",
  sql:        "-- SQL runner uses an in-memory SQLite database.\n-- Write one or more SQL statements.\n-- The last SELECT result will be printed.\n\nSELECT 'hello' AS message;\n",
  go:         "package main\n\nimport \"fmt\"\n\nfunc main() {\n    // Write your solution\n    fmt.Println(\"hello\")\n}\n",
};

const DIFF_CONFIG = {
  easy:   { cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  medium: { cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  hard:   { cls: "bg-red-50 text-red-700 border border-red-200" },
};

const STATUS_RESULT = {
  accepted:            { cls: "text-emerald-600 bg-emerald-50 border-emerald-200", label: "Accepted" },
  wrong_answer:        { cls: "text-red-600 bg-red-50 border-red-200",             label: "Wrong Answer" },
  time_limit_exceeded: { cls: "text-orange-600 bg-orange-50 border-orange-200",    label: "Time Limit Exceeded" },
  memory_limit_exceeded:{ cls: "text-orange-600 bg-orange-50 border-orange-200",   label: "Memory Limit Exceeded" },
  runtime_error:       { cls: "text-red-600 bg-red-50 border-red-200",             label: "Runtime Error" },
  compilation_error:   { cls: "text-red-600 bg-red-50 border-red-200",             label: "Compilation Error" },
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const PlayIcon    = () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const SubmitIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const SaveIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const BackIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>;
const SpinIcon    = () => <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>;

// ── Sub-components ────────────────────────────────────────────────────────────
function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-primary-600 text-primary-600"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function TestCaseResult({ result, index }) {
  const passed = result.passed;
  return (
    <div className={`rounded-xl border p-3 ${passed ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-bold ${passed ? "text-emerald-700" : "text-red-700"}`}>
          {passed ? "PASS" : "FAIL"} — Test {index + 1}
        </span>
        {result.execution_time && (
          <span className="text-xs text-slate-400 ml-auto">{result.execution_time}s</span>
        )}
      </div>
      {!result.is_hidden && (
        <div className="space-y-1 text-xs font-mono">
          {result.actual_output !== undefined && (
            <div>
              <span className="text-slate-500">Output: </span>
              <span className={passed ? "text-emerald-700" : "text-red-700"}>{result.actual_output || "(empty)"}</span>
            </div>
          )}
          {!passed && result.expected_output !== undefined && (
            <div>
              <span className="text-slate-500">Expected: </span>
              <span className="text-slate-700">{result.expected_output}</span>
            </div>
          )}
        </div>
      )}
      {result.is_hidden && <p className="text-xs text-slate-400">Hidden test case</p>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function QuestionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentQuestion: q, loading, runResult, submitResult, runLoading, submitLoading } =
    useSelector((s) => s.coding);

  const [lang,    setLang]    = useState("python");
  const [code,    setCode]    = useState(STARTER.python);
  const [stdin,   setStdin]   = useState("");
  const [tab,     setTab]     = useState("description");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [themeMode, setThemeMode] = useState("default");
  const [fontSize, setFontSize] = useState(14);
  const [submissionHistory, setSubmissionHistory] = useState([]);
  const [editorial, setEditorial] = useState(null);
  const [discussions, setDiscussions] = useState([]);
  const [discussionBody, setDiscussionBody] = useState("");
  const [replyParent, setReplyParent] = useState("");
  const [draftStatus, setDraftStatus] = useState("idle");

  useEffect(() => {
    dispatch(fetchQuestion(id));
    return () => { dispatch(clearRunResult()); dispatch(clearSubmitResult()); };
  }, [id, dispatch]);

  useEffect(() => {
    if (q?.starter_code?.[lang]) setCode(q.starter_code[lang]);
    else setCode(STARTER[lang] || "");
  }, [lang, q]);

  useEffect(() => {
    if (!id) return;
    codingService.getDraft(id, lang)
      .then((response) => {
        const draft = response.data.data;
        if (draft?.code) setCode(draft.code);
      })
      .catch(() => {});
  }, [id, lang]);

  useEffect(() => {
    if (tab === "submissions" && id) {
      codingService.getSubmissions(id)
        .then((response) => setSubmissionHistory(response.data.data || []))
        .catch(() => setSubmissionHistory([]));
    }
    if (tab === "editorial" && id && editorial === null) {
      codingService.getEditorial(id)
        .then((response) => setEditorial(response.data.data || { title: "", content: "" }))
        .catch(() => setEditorial({ title: "", content: "" }));
    }
    if (tab === "discussions" && id) {
      codingService.getDiscussions(id)
        .then((response) => setDiscussions(response.data.data || []))
        .catch(() => setDiscussions([]));
    }
  }, [tab, id]);

  useEffect(() => {
    if (submitResult && id) {
      codingService.getSubmissions(id)
        .then((response) => setSubmissionHistory(response.data.data || []))
        .catch(() => {});
    }
  }, [submitResult, id]);

  const handleRun = useCallback(() => {
    dispatch(clearSubmitResult());
    dispatch(runCode({ language: lang, code, stdin }));
  }, [dispatch, lang, code, stdin]);

  const handleSubmit = useCallback(() => {
    dispatch(clearRunResult());
    dispatch(submitCode({ question_id: id, language: lang, code }));
  }, [dispatch, id, lang, code]);

  const handleSave = async () => {
    const r = await dispatch(saveQuestion(id));
    if (saveQuestion.fulfilled.match(r)) toast.success("Problem saved to bookmarks");
    else toast.error("Already saved");
  };

  const handleSaveDraft = async () => {
    try {
      setDraftStatus("saving");
      await codingService.saveDraft(id, lang, code);
      setDraftStatus("saved");
      setTimeout(() => setDraftStatus("idle"), 1500);
    } catch {
      setDraftStatus("error");
      toast.error("Failed to save draft");
    }
  };

  const handleDiscussionSubmit = async () => {
    if (!discussionBody.trim()) return;
    try {
      await codingService.postDiscussion(id, {
        body: discussionBody,
        parent: replyParent || null,
      });
      setDiscussionBody("");
      setReplyParent("");
      const response = await codingService.getDiscussions(id);
      setDiscussions(response.data.data || []);
    } catch {
      toast.error("Failed to post discussion");
    }
  };

  if (loading && !q) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading problem...</p>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-center">
          <p className="text-slate-500 font-medium">Problem not found</p>
          <button onClick={() => navigate("/coding")} className="mt-3 text-sm text-primary-600 hover:underline">
            Back to problems
          </button>
        </div>
      </div>
    );
  }

  const diff = DIFF_CONFIG[q.difficulty] || DIFF_CONFIG.easy;
  const submitStatus = submitResult ? (STATUS_RESULT[submitResult.status] || { cls: "text-slate-600 bg-slate-50 border-slate-200", label: submitResult.status }) : null;
  const monacoTheme =
    themeMode === "high_contrast"
      ? "hc-black"
      : isDarkMode
      ? "vs-dark"
      : "light";

  return (
    <div className={`flex gap-0 h-[calc(100vh-72px)] -m-6 overflow-hidden ${isDarkMode ? "bg-slate-950" : "bg-slate-100"}`}>

      {/* ── Left Panel: Problem ─────────────────────────────────────────── */}
      <div className="w-[45%] min-w-[340px] flex flex-col bg-white border-r border-slate-100 overflow-hidden">

        {/* Problem header */}
        <div className="px-5 pt-4 pb-0 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => navigate("/coding")}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <BackIcon />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-slate-900 truncate">{q.title}</h1>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${diff.cls}`}>
              {q.difficulty}
            </span>
            <button
              onClick={handleSave}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-all"
              title="Save problem"
            >
              <SaveIcon />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 -mb-px">
            <TabButton active={tab === "description"} onClick={() => setTab("description")}>Description</TabButton>
            <TabButton active={tab === "examples"}    onClick={() => setTab("examples")}>Examples</TabButton>
            <TabButton active={tab === "submissions"} onClick={() => setTab("submissions")}>Submissions</TabButton>
            <TabButton active={tab === "editorial"} onClick={() => setTab("editorial")}>Editorial</TabButton>
            <TabButton active={tab === "discussions"} onClick={() => setTab("discussions")}>Discussions</TabButton>
          </div>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {tab === "description" && (
            <>
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full capitalize font-medium">
                  {q.topic?.replace(/_/g, " ")}
                </span>
                {q.acceptance_rate !== undefined && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">
                    {q.acceptance_rate}% acceptance
                  </span>
                )}
              </div>

              {/* Description */}
              <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {q.description}
              </div>

              {/* Constraints */}
              {q.constraints && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-2">Constraints</h3>
                  <pre className="text-xs bg-slate-50 border border-slate-100 p-3 rounded-xl font-mono leading-relaxed whitespace-pre-wrap">
                    {q.constraints}
                  </pre>
                </div>
              )}
            </>
          )}

          {tab === "examples" && (
            <div className="space-y-4">
              {q.sample_input ? (
                <>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Input</h3>
                    <pre className="text-sm bg-slate-900 text-slate-100 p-4 rounded-xl font-mono leading-relaxed">
                      {q.sample_input}
                    </pre>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Output</h3>
                    <pre className="text-sm bg-slate-900 text-slate-100 p-4 rounded-xl font-mono leading-relaxed">
                      {q.sample_output}
                    </pre>
                  </div>
                  {q.explanation && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Explanation</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">No examples available</p>
              )}
            </div>
          )}

          {tab === "submissions" && (
            <div className="space-y-3">
              {submissionHistory.map((submission) => (
                <div key={submission.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 capitalize">{submission.status.replaceAll("_", " ")}</p>
                      <p className="text-xs text-slate-500">{new Date(submission.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p>{submission.language}</p>
                      <p>{submission.passed_test_cases}/{submission.total_test_cases} tests</p>
                    </div>
                  </div>
                </div>
              ))}
              {!submissionHistory.length ? <p className="text-sm text-slate-500">No submissions yet.</p> : null}
            </div>
          )}

          {tab === "editorial" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">{editorial?.title || q.editorial_title || "Editorial"}</h3>
              <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {editorial?.content || q.editorial_content || "Editorial not available yet."}
              </div>
            </div>
          )}

          {tab === "discussions" && (
            <div className="space-y-4">
              <div className="space-y-3">
                {discussions.map((discussion) => (
                  <div key={discussion.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{discussion.user_name}</p>
                      <button onClick={() => setReplyParent(discussion.id)} className="text-xs text-primary-600">
                        Reply
                      </button>
                    </div>
                    <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{discussion.body}</p>
                    {(discussion.replies || []).length > 0 ? (
                      <div className="mt-3 space-y-2 border-l border-slate-200 pl-3">
                        {discussion.replies.map((reply) => (
                          <div key={reply.id}>
                            <p className="text-xs font-semibold text-slate-700">{reply.user_name}</p>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap">{reply.body}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
                {!discussions.length ? <p className="text-sm text-slate-500">No discussions yet.</p> : null}
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                {replyParent ? <p className="text-xs text-slate-500 mb-2">Replying to a thread</p> : null}
                <textarea
                  className="w-full min-h-[96px] text-sm text-slate-700 resize-none outline-none"
                  placeholder="Post a question, approach, or clarification."
                  value={discussionBody}
                  onChange={(event) => setDiscussionBody(event.target.value)}
                />
                <div className="flex items-center justify-between mt-3">
                  <button onClick={() => setReplyParent("")} className="text-xs text-slate-500">Clear reply</button>
                  <button onClick={handleDiscussionSubmit} className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white">
                    Post
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Right Panel: Editor ─────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col overflow-hidden ${isDarkMode ? "bg-slate-950" : "bg-slate-100"}`}>

        {/* Editor toolbar */}
        <div className={`flex items-center gap-3 px-4 py-2.5 flex-shrink-0 ${isDarkMode ? "bg-slate-900 border-b border-slate-800" : "bg-white border-b border-slate-200"}`}>
          {/* Language selector */}
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            className={`${isDarkMode ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-slate-50 text-slate-700 border-slate-200"} text-xs font-medium px-3 py-1.5 rounded-lg border focus:outline-none focus:border-primary-500 cursor-pointer`}
          >
            {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>

          {/* Theme mode */}
          <select
            value={themeMode}
            onChange={e => setThemeMode(e.target.value)}
            className={`${isDarkMode ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-slate-50 text-slate-700 border-slate-200"} text-xs font-medium px-3 py-1.5 rounded-lg border focus:outline-none focus:border-primary-500 cursor-pointer`}
          >
            <option value="default">Default</option>
            <option value="high_contrast">High Contrast</option>
          </select>

          <button
            onClick={() => setIsDarkMode(v => !v)}
            className={`${isDarkMode ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-slate-50 text-slate-700 border-slate-200"} text-xs font-medium px-3 py-1.5 rounded-lg border`}
            title="Toggle dark mode"
          >
            {isDarkMode ? "Dark" : "Light"}
          </button>

          {/* Font size */}
          <select
            value={fontSize}
            onChange={e => setFontSize(Number(e.target.value))}
            className={`${isDarkMode ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-slate-50 text-slate-700 border-slate-200"} text-xs font-medium px-3 py-1.5 rounded-lg border focus:outline-none focus:border-primary-500 cursor-pointer`}
          >
            {[12, 13, 14, 15, 16, 18].map(s => <option key={s} value={s}>{s}px</option>)}
          </select>

          <div className="flex-1" />

          <button
            onClick={handleSaveDraft}
            className={`${isDarkMode ? "bg-slate-800 text-slate-200 border-slate-700" : "bg-slate-50 text-slate-700 border-slate-200"} text-xs font-medium px-3 py-1.5 rounded-lg border`}
          >
            {draftStatus === "saving" ? "Saving draft..." : draftStatus === "saved" ? "Draft saved" : "Save Draft"}
          </button>

          {/* Run */}
          <button
            onClick={handleRun}
            disabled={runLoading}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${isDarkMode ? "bg-slate-700 hover:bg-slate-600 text-slate-200" : "bg-slate-200 hover:bg-slate-300 text-slate-700"}`}
          >
            {runLoading ? <SpinIcon /> : <PlayIcon />}
            {runLoading ? "Running..." : "Run"}
          </button>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitLoading}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {submitLoading ? <SpinIcon /> : <SubmitIcon />}
            {submitLoading ? "Submitting..." : "Submit"}
          </button>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full bg-slate-950">
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500">Loading editor...</p>
              </div>
            </div>
          }>
            <MonacoEditor
              height="100%"
              language={LANGUAGES.find(l => l.value === lang)?.monaco || "python"}
              theme={monacoTheme}
              value={code}
              onChange={v => setCode(v || "")}
              options={{
                fontSize,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                renderLineHighlight: "line",
                tabSize: 4,
                wordWrap: "on",
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
              }}
            />
          </Suspense>
        </div>

        {/* Bottom panel: stdin + output */}
        <div className={`flex-shrink-0 ${isDarkMode ? "border-t border-slate-800 bg-slate-900" : "border-t border-slate-200 bg-white"}`} style={{ maxHeight: "40%" }}>
          <div className="flex h-full">

            {/* Custom input */}
            <div className={`w-1/3 flex flex-col ${isDarkMode ? "border-r border-slate-800" : "border-r border-slate-200"}`}>
              <div className={`px-3 py-2 ${isDarkMode ? "border-b border-slate-800" : "border-b border-slate-200"}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Custom Input</p>
              </div>
              <textarea
                className={`flex-1 bg-transparent text-xs font-mono p-3 resize-none focus:outline-none ${isDarkMode ? "text-slate-300 placeholder-slate-600" : "text-slate-700 placeholder-slate-400"}`}
                value={stdin}
                onChange={e => setStdin(e.target.value)}
                placeholder="Enter stdin here..."
                rows={4}
              />
            </div>

            {/* Output */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className={`px-3 py-2 flex items-center gap-2 ${isDarkMode ? "border-b border-slate-800" : "border-b border-slate-200"}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Output</p>
                {submitStatus && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${submitStatus.cls}`}>
                    {submitStatus.label}
                  </span>
                )}
                {submitResult && (
                    <span className={`text-xs ml-auto ${isDarkMode ? "text-slate-500" : "text-slate-400"}`}>
                      {submitResult.passed_test_cases}/{submitResult.total_test_cases} tests passed
                    </span>
                  )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* Run result */}
                {runResult && !submitResult && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold ${runResult.status === "success" ? "text-emerald-400" : "text-red-400"}`}>
                        {runResult.status?.toUpperCase()}
                      </span>
                      {runResult.execution_time && (
                        <span className="text-xs text-slate-500">{runResult.execution_time}s</span>
                      )}
                    </div>
                    <pre className={`text-xs font-mono whitespace-pre-wrap ${isDarkMode ? "text-slate-300" : "text-slate-700"}`}>
                      {runResult.stdout || runResult.stderr || "No output"}
                    </pre>
                  </div>
                )}

                {/* Submit result */}
                {submitResult && (
                  <div className="space-y-2">
                    {submitResult.stderr && (
                      <pre className="text-xs text-red-400 font-mono bg-red-950/30 p-2 rounded-lg whitespace-pre-wrap">
                        {submitResult.stderr}
                      </pre>
                    )}
                    {(submitResult.test_results || []).map((tr, i) => (
                      <TestCaseResult key={i} result={tr} index={i} />
                    ))}
                  </div>
                )}

                {!runResult && !submitResult && (
                  <p className={`text-xs text-center py-4 ${isDarkMode ? "text-slate-600" : "text-slate-400"}`}>
                    Run your code to see output
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
