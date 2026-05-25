import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { codingService } from "../services/codingService";

const difficultyTone = {
  easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  hard: "bg-red-50 text-red-700 border-red-200",
};

function SectionCard({ title, subtitle, children, actions }) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="text-xs text-slate-500 mt-1">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export default function CodingPage() {
  const [mode, setMode] = useState("problems");
  const [questions, setQuestions] = useState([]);
  const [savedQuestions, setSavedQuestions] = useState([]);
  const [tags, setTags] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [stats, setStats] = useState(null);
  const [contests, setContests] = useState([]);
  const [contestLeaderboard, setContestLeaderboard] = useState([]);
  const [selectedContest, setSelectedContest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    difficulty: "",
    tag: "",
    company: "",
  });

  const loadProblems = useCallback(async () => {
    const [questionRes, tagRes, companyRes, leaderboardRes, statsRes, savedRes, contestRes] = await Promise.all([
      codingService.getQuestions(filters),
      codingService.getTags(),
      codingService.getCompanies(),
      codingService.getLeaderboard(),
      codingService.getMyStats(),
      codingService.getSavedQuestions(),
      codingService.getContests(),
    ]);
    const questionData = questionRes.data.results || questionRes.data.data || questionRes.data;
    const contestData = contestRes.data.results || contestRes.data.data || contestRes.data;
    setQuestions(Array.isArray(questionData) ? questionData : []);
    setTags(tagRes.data.data || []);
    setCompanies(companyRes.data.data || []);
    setLeaderboard(leaderboardRes.data.data || []);
    setStats(statsRes.data.data || null);
    setSavedQuestions(savedRes.data.data || []);
    setContests(Array.isArray(contestData) ? contestData : []);
    if (!selectedContest && Array.isArray(contestData) && contestData.length) {
      setSelectedContest(contestData[0].id);
    }
  }, [filters, selectedContest]);

  const loadContestLeaderboard = async (contestId) => {
    if (!contestId) {
      setContestLeaderboard([]);
      return;
    }
    try {
      const response = await codingService.getContestLeaderboard(contestId);
      setContestLeaderboard(response.data.data || []);
    } catch {
      setContestLeaderboard([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadProblems().catch(() => toast.error("Failed to load coding hub.")).finally(() => setLoading(false));
  }, [loadProblems]);

  useEffect(() => {
    loadContestLeaderboard(selectedContest);
  }, [selectedContest]);

  const savedIds = new Set(savedQuestions.map((item) => item.question.id));

  const toggleBookmark = async (question) => {
    try {
      if (savedIds.has(question.id)) {
        await codingService.unsaveQuestion(question.id);
      } else {
        await codingService.saveQuestion(question.id);
      }
      await loadProblems();
    } catch {
      toast.error("Failed to update bookmark.");
    }
  };

  const registerContest = async (contestId) => {
    try {
      await codingService.registerContest(contestId);
      toast.success("Contest registration saved.");
      await loadProblems();
      await loadContestLeaderboard(contestId);
    } catch {
      toast.error("Failed to register for contest.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#0f172a, #1d4ed8 58%, #93c5fd)] text-white p-6 shadow-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">Coding Platform</p>
            <h1 className="text-3xl font-bold mt-2">Practice, compete, and track progress</h1>
            <p className="text-sm text-blue-100 mt-2 max-w-2xl">
              Hidden tests, drafts, history, leaderboards, company-tagged problems, editorials, discussions, and contests are now in one flow.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[280px]">
            <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur">
              <p className="text-xs text-blue-100">Solved</p>
              <p className="text-2xl font-bold">{stats?.solved_count ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur">
              <p className="text-xs text-blue-100">Submissions</p>
              <p className="text-2xl font-bold">{stats?.total_submissions ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur">
              <p className="text-xs text-blue-100">Current Streak</p>
              <p className="text-2xl font-bold">{stats?.current_streak ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-white/12 px-4 py-3 backdrop-blur">
              <p className="text-xs text-blue-100">Best Streak</p>
              <p className="text-2xl font-bold">{stats?.best_streak ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {["problems", "contests"].map((item) => (
          <button
            key={item}
            onClick={() => setMode(item)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              mode === item ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
            }`}
          >
            {item === "problems" ? "Practice Problems" : "Contests"}
          </button>
        ))}
      </div>

      {mode === "problems" ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_0.8fr] gap-6">
          <SectionCard
            title="Problem Bank"
            subtitle="Filter by difficulty, topic tags, company questions, and search."
            actions={
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <input
                  className="input-field text-sm"
                  placeholder="Search"
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                />
                <select
                  className="input-field text-sm"
                  value={filters.difficulty}
                  onChange={(event) => setFilters((current) => ({ ...current, difficulty: event.target.value }))}
                >
                  <option value="">All difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <select
                  className="input-field text-sm"
                  value={filters.tag}
                  onChange={(event) => setFilters((current) => ({ ...current, tag: event.target.value }))}
                >
                  <option value="">All tags</option>
                  {tags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
                </select>
                <select
                  className="input-field text-sm"
                  value={filters.company}
                  onChange={(event) => setFilters((current) => ({ ...current, company: event.target.value }))}
                >
                  <option value="">All companies</option>
                  {companies.map((company) => <option key={company} value={company}>{company}</option>)}
                </select>
              </div>
            }
          >
            {loading ? (
              <p className="text-sm text-slate-500">Loading problems...</p>
            ) : (
              <div className="space-y-3">
                {questions.map((question) => (
                  <div key={question.id} className="rounded-2xl border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link to={`/coding/${question.id}`} className="text-base font-semibold text-slate-900 hover:text-primary-700">
                          {question.title}
                        </Link>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${difficultyTone[question.difficulty] || "bg-slate-50 text-slate-700 border-slate-200"}`}>
                            {question.difficulty}
                          </span>
                          <span className="px-2.5 py-1 text-xs rounded-full bg-slate-100 text-slate-600 capitalize">
                            {question.topic?.replaceAll("_", " ")}
                          </span>
                          {question.topic_tags?.slice(0, 3).map((tag) => (
                            <span key={tag} className="px-2.5 py-1 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                              {tag}
                            </span>
                          ))}
                          {question.company_tags?.slice(0, 2).map((company) => (
                            <span key={company} className="px-2.5 py-1 text-xs rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                              {company}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleBookmark(question)}
                        className={`px-3 py-2 text-xs font-semibold rounded-xl border ${
                          savedIds.has(question.id) ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200"
                        }`}
                      >
                        {savedIds.has(question.id) ? "Bookmarked" : "Bookmark"}
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mt-4 text-xs text-slate-500">
                      <div>
                        <p className="uppercase tracking-wide">Acceptance</p>
                        <p className="text-sm font-semibold text-slate-800">{question.acceptance_rate}%</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-wide">Submissions</p>
                        <p className="text-sm font-semibold text-slate-800">{question.total_submissions}</p>
                      </div>
                      <div>
                        <p className="uppercase tracking-wide">Status</p>
                        <p className={`text-sm font-semibold ${question.is_solved ? "text-emerald-700" : "text-slate-800"}`}>
                          {question.is_solved ? "Solved" : "Unsolved"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {!questions.length ? <p className="text-sm text-slate-500">No questions match the current filters.</p> : null}
              </div>
            )}
          </SectionCard>

          <div className="space-y-6">
            <SectionCard title="Bookmarks" subtitle="Quick access to saved questions.">
              <div className="space-y-3">
                {savedQuestions.slice(0, 8).map((item) => (
                  <Link key={item.id} to={`/coding/${item.question.id}`} className="block rounded-xl border border-slate-200 p-3 hover:border-slate-300">
                    <p className="text-sm font-semibold text-slate-900">{item.question.title}</p>
                    <p className="text-xs text-slate-500 mt-1 capitalize">{item.question.difficulty}</p>
                  </Link>
                ))}
                {!savedQuestions.length ? <p className="text-sm text-slate-500">No bookmarks yet.</p> : null}
              </div>
            </SectionCard>

            <SectionCard title="Leaderboard" subtitle="Top solvers across the platform.">
              <div className="space-y-3">
                {leaderboard.slice(0, 10).map((row, index) => (
                  <div key={row.user_id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
                    <span className="w-8 text-sm font-semibold text-slate-400">#{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{row.full_name}</p>
                      <p className="text-xs text-slate-500">
                        {row.solved_count} solved, streak {row.current_streak}, best {row.best_streak}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <SectionCard title="Contests" subtitle="Timed events with scoring, rankings, and submissions.">
            <div className="space-y-4">
              {contests.map((contest) => (
                <div key={contest.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{contest.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{contest.description || "No description provided."}</p>
                      <div className="flex flex-wrap gap-2 mt-3 text-xs">
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{contest.phase}</span>
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{contest.problems_count} problems</span>
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{contest.registered_count} registered</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setSelectedContest(contest.id)}
                        className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700"
                      >
                        View Board
                      </button>
                      {!contest.is_registered ? (
                        <button
                          onClick={() => registerContest(contest.id)}
                          className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white"
                        >
                          Register
                        </button>
                      ) : (
                        <Link to={`/coding`} className="px-3 py-2 text-center text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Registered
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!contests.length ? <p className="text-sm text-slate-500">No contests available.</p> : null}
            </div>
          </SectionCard>

          <SectionCard title="Contest Rankings" subtitle="Live or final rank table for the selected contest.">
            <div className="flex items-center gap-2 mb-4">
              <select
                className="input-field text-sm"
                value={selectedContest || ""}
                onChange={(event) => setSelectedContest(event.target.value)}
              >
                <option value="">Select a contest</option>
                {contests.map((contest) => <option key={contest.id} value={contest.id}>{contest.title}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              {contestLeaderboard.map((row) => (
                <div key={row.user_id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">#{row.rank} {row.full_name}</p>
                      <p className="text-xs text-slate-500">{row.solved_count} solved</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{row.score} pts</p>
                      <p className="text-xs text-slate-500">{Math.floor(row.penalty_seconds / 60)} min penalty</p>
                    </div>
                  </div>
                </div>
              ))}
              {!contestLeaderboard.length ? <p className="text-sm text-slate-500">No rankings yet.</p> : null}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
