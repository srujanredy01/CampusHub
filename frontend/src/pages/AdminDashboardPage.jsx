import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../services/api";

const sectionMap = {
  "/admin/dashboard": "overview",
  "/admin/users": "students",
  "/admin/notes": "notes",
  "/admin/news": "news",
  "/admin/questions": "questions",
  "/admin/notifications": "notifications",
  "/admin/audit": "audit",
};

function Surface({ title, subtitle, actions, children }) {
  return (
    <section className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="text-xs text-slate-500 mt-1">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Stat({ label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-50 text-slate-900 border-slate-200",
    blue: "bg-blue-50 text-blue-900 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-200",
    amber: "bg-amber-50 text-amber-900 border-amber-200",
    rose: "bg-rose-50 text-rose-900 border-rose-200",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone] || tones.slate}`}>
      <p className="text-2xl font-bold">{value ?? "—"}</p>
      <p className="text-xs font-medium mt-1 opacity-80">{label}</p>
    </div>
  );
}

function DataTable({ columns, rows, empty = "No records found." }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length ? rows.map((row, index) => (
            <tr key={row.id || index} className="hover:bg-slate-50/70">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-3 align-top text-slate-700">
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-500">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function TextInput(props) {
  return <input {...props} className={`input-field text-sm ${props.className || ""}`} />;
}

function SelectInput(props) {
  return <select {...props} className={`input-field text-sm ${props.className || ""}`} />;
}

export default function AdminDashboardPage() {
  const location = useLocation();
  const section = sectionMap[location.pathname] || "overview";

  const [dashboard, setDashboard] = useState(null);
  const [health, setHealth] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentMeta, setStudentMeta] = useState({ count: 0 });
  const [notes, setNotes] = useState([]);
  const [news, setNews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [contests, setContests] = useState([]);
  const [scheduled, setScheduled] = useState([]);
  const [approvals, setApprovals] = useState({ notes: [], scheduled_notifications: [] });
  const [auditLogs, setAuditLogs] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [activityStats, setActivityStats] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [globalQuery, setGlobalQuery] = useState("");
  const [studentFilters, setStudentFilters] = useState({ search: "", branch: "", is_active: "", role: "" });
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    message: "",
    notification_type: "system",
    target_branch: "",
    target_semester: "",
    scheduled_for: "",
    status: "scheduled",
  });
  const [contestForm, setContestForm] = useState({
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    status: "published",
    problemIds: [],
  });

  const pageTitle = useMemo(() => {
    if (section === "overview") return "Admin Control Center";
    if (section === "students") return "Student Management";
    if (section === "notes") return "Notes Moderation";
    if (section === "news") return "News Moderation";
    if (section === "questions") return "Coding Moderation";
    if (section === "notifications") return "Notifications";
    return "Audit and Approvals";
  }, [section]);

  const loadOverview = async () => {
    const [dashboardResponse, healthResponse] = await Promise.all([
      api.get("/admin/dashboard"),
      api.get("/admin/system/health"),
    ]);
    setDashboard(dashboardResponse.data.data);
    setHealth(healthResponse.data.data);
  };

  const loadStudents = async () => {
    const response = await api.get("/admin/students", { params: studentFilters });
    setStudents(response.data.results || []);
    setStudentMeta({ count: response.data.count || 0 });
  };

  const loadModeration = async () => {
    const [noteResponse, newsResponse, questionResponse, approvalResponse, contestResponse] = await Promise.all([
      api.get("/admin/notes"),
      api.get("/admin/news"),
      api.get("/admin/questions"),
      api.get("/admin/approvals"),
      api.get("/questions/contests"),
    ]);
    setNotes(noteResponse.data.results || []);
    setNews(newsResponse.data.results || []);
    setQuestions(questionResponse.data.results || []);
    setApprovals(approvalResponse.data.data || { notes: [], scheduled_notifications: [] });
    setContests(contestResponse.data.results || contestResponse.data.data || []);
  };

  const loadNotifications = async () => {
    const response = await api.get("/admin/notifications/scheduled");
    setScheduled(response.data.results || []);
  };

  const loadAudit = async () => {
    const [logResponse, loginResponse, activityResponse] = await Promise.all([
      api.get("/admin/logs"),
      api.get("/admin/login-logs"),
      api.get("/admin/activity-stats"),
    ]);
    setAuditLogs(logResponse.data.results || []);
    setLoginLogs(loginResponse.data.results || []);
    setActivityStats(activityResponse.data.data || null);
  };

  useEffect(() => {
    if (section === "overview") {
      loadOverview().catch(() => toast.error("Failed to load admin overview."));
    }
    if (section === "students") {
      loadStudents().catch(() => toast.error("Failed to load students."));
    }
    if (section === "notes" || section === "news" || section === "questions") {
      loadModeration().catch(() => toast.error("Failed to load moderation data."));
    }
    if (section === "notifications") {
      loadNotifications().catch(() => toast.error("Failed to load notification campaigns."));
    }
    if (section === "audit") {
      loadAudit().catch(() => toast.error("Failed to load audit data."));
    }
  }, [section, studentFilters.search, studentFilters.branch, studentFilters.is_active, studentFilters.role]);

  const runGlobalSearch = async () => {
    if (globalQuery.trim().length < 2) {
      setSearchResults(null);
      return;
    }
    try {
      const response = await api.get("/admin/search", { params: { q: globalQuery } });
      setSearchResults(response.data.data || null);
    } catch {
      toast.error("Global search failed.");
    }
  };

  const updateStudent = async (userId, endpoint, payload = {}) => {
    try {
      if (endpoint === "delete") {
        await api.delete(`/admin/students/${userId}`);
      } else if (endpoint === "role") {
        await api.patch(`/admin/students/${userId}/role`, payload);
      } else {
        await api.post(`/admin/students/${userId}/${endpoint}`, payload);
      }
      await loadStudents();
    } catch {
      toast.error("Student action failed.");
    }
  };

  const handleStudentImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await api.post("/admin/students/import", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`Imported ${response.data.data.created} and updated ${response.data.data.updated} users.`);
      await loadStudents();
    } catch {
      toast.error("CSV import failed.");
    }
  };

  const handleStudentExport = async () => {
    try {
      const response = await api.get("/admin/students/export", {
        params: studentFilters,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "campushub-students.csv";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error("CSV export failed.");
    }
  };

  const moderateNote = async (noteId, action) => {
    try {
      await api.post(`/admin/notes/${noteId}/moderate`, { action });
      await loadModeration();
    } catch {
      toast.error("Note moderation failed.");
    }
  };

  const removeNote = async (noteId) => {
    try {
      await api.delete(`/admin/notes/${noteId}`);
      await loadModeration();
    } catch {
      toast.error("Failed to remove note.");
    }
  };

  const toggleNewsPin = async (newsId) => {
    try {
      await api.post(`/admin/news/${newsId}/pin`);
      await loadModeration();
    } catch {
      toast.error("Failed to update pin status.");
    }
  };

  const deleteNews = async (newsId) => {
    try {
      await api.delete(`/admin/news/${newsId}`);
      await loadModeration();
    } catch {
      toast.error("Failed to delete article.");
    }
  };

  const deleteQuestion = async (questionId) => {
    try {
      await api.delete(`/questions/${questionId}/manage`);
      await loadModeration();
    } catch {
      toast.error("Failed to archive coding question.");
    }
  };

  const toggleContestProblem = (questionId) => {
    setContestForm((current) => ({
      ...current,
      problemIds: current.problemIds.includes(questionId)
        ? current.problemIds.filter((id) => id !== questionId)
        : [...current.problemIds, questionId],
    }));
  };

  const createContest = async () => {
    try {
      await api.post("/questions/contests/create", {
        title: contestForm.title,
        description: contestForm.description,
        starts_at: contestForm.starts_at,
        ends_at: contestForm.ends_at,
        status: contestForm.status,
        is_public: true,
        problems: contestForm.problemIds.map((questionId, index) => ({
          question_id: questionId,
          points: 100,
          order: index + 1,
        })),
      });
      toast.success("Contest created.");
      setContestForm({
        title: "",
        description: "",
        starts_at: "",
        ends_at: "",
        status: "published",
        problemIds: [],
      });
      await loadModeration();
    } catch {
      toast.error("Failed to create contest.");
    }
  };

  const archiveContest = async (contestId) => {
    try {
      await api.delete(`/questions/contests/${contestId}/manage`);
      await loadModeration();
    } catch {
      toast.error("Failed to archive contest.");
    }
  };

  const sendInstantNotification = async () => {
    try {
      await api.post("/admin/notifications", {
        title: notificationForm.title,
        message: notificationForm.message,
        notification_type: notificationForm.notification_type,
        target_branch: notificationForm.target_branch,
      });
      toast.success("Notification sent.");
    } catch {
      toast.error("Failed to send notification.");
    }
  };

  const createScheduledNotification = async () => {
    try {
      await api.post("/admin/notifications/scheduled", {
        ...notificationForm,
        target_semester: notificationForm.target_semester ? Number(notificationForm.target_semester) : null,
      });
      toast.success("Scheduled notification saved.");
      setNotificationForm({
        title: "",
        message: "",
        notification_type: "system",
        target_branch: "",
        target_semester: "",
        scheduled_for: "",
        status: "scheduled",
      });
      await loadNotifications();
    } catch {
      toast.error("Failed to save scheduled notification.");
    }
  };

  const updateCampaign = async (campaignId, action) => {
    try {
      if (action === "approve") {
        await api.post(`/admin/notifications/scheduled/${campaignId}/approve`);
      } else if (action === "dispatch") {
        await api.post(`/admin/notifications/scheduled/${campaignId}/dispatch`);
      } else if (action === "delete") {
        await api.delete(`/admin/notifications/scheduled/${campaignId}`);
      }
      await loadNotifications();
    } catch {
      toast.error("Notification campaign action failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_32%),linear-gradient(135deg,#fff,#f8fafc)] p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Custom Admin</p>
            <h1 className="text-3xl font-bold text-slate-900 mt-2">{pageTitle}</h1>
            <p className="text-sm text-slate-600 mt-2 max-w-3xl">
              Search, analytics, moderation, notifications, approvals, and audit are handled through the application APIs and custom frontend. No Django default admin is used.
            </p>
          </div>
          <div className="w-full xl:w-[420px]">
            <div className="flex gap-2">
              <TextInput
                placeholder="Global search across students, notes, news, questions"
                value={globalQuery}
                onChange={(event) => setGlobalQuery(event.target.value)}
              />
              <button onClick={runGlobalSearch} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold">
                Search
              </button>
            </div>
          </div>
        </div>
        {searchResults ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-5">
            {[
              ["Students", searchResults.students],
              ["Notes", searchResults.notes],
              ["News", searchResults.news],
              ["Questions", searchResults.questions],
            ].map(([label, items]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <div className="mt-3 space-y-2">
                  {items.length ? items.map((item) => (
                    <p key={item.id} className="text-sm text-slate-700 truncate">
                      {item.full_name || item.title}
                    </p>
                  )) : <p className="text-sm text-slate-400">No matches</p>}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {section === "overview" && dashboard ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
            <Stat label="Total Students" value={dashboard.users?.total} tone="slate" />
            <Stat label="Active Users" value={dashboard.users?.active} tone="emerald" />
            <Stat label="Daily Signups" value={dashboard.users?.new_7d} tone="blue" />
            <Stat label="Submissions" value={dashboard.coding?.total_submissions} tone="amber" />
            <Stat label="Notes Uploaded" value={dashboard.notes?.total} tone="slate" />
            <Stat label="Placement Offers" value={dashboard.placement?.offers} tone="emerald" />
            <Stat label="Attendance Records" value={dashboard.attendance?.records} tone="blue" />
            <Stat label="Pending Approvals" value={(dashboard.notes?.pending || 0) + (approvals.notes?.length || 0)} tone="rose" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Surface title="System Health" subtitle="Backend and services.">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.entries(health?.services || {}).map(([name, info]) => (
                  <div key={name} className={`rounded-2xl border p-4 ${info.status === "healthy" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                    <p className="text-xs uppercase tracking-wide text-slate-500">{name}</p>
                    <p className="text-lg font-semibold text-slate-900 mt-1">{info.status}</p>
                  </div>
                ))}
              </div>
            </Surface>

            <Surface title="Recent Activity" subtitle="Latest platform events and submissions.">
              <div className="space-y-3">
                {(dashboard.recent?.activity || []).map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{entry.username || "Unknown user"}</p>
                      <p className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</p>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 capitalize">{entry.action.replaceAll("_", " ")}</p>
                  </div>
                ))}
              </div>
            </Surface>
          </div>
        </>
      ) : null}

      {section === "students" ? (
        <Surface
          title="Students, Roles, Imports, Exports"
          subtitle="Activation, deactivation, password reset, role changes, deletion, and CSV bulk import."
          actions={
            <div className="flex flex-wrap gap-2">
              <label className="px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold cursor-pointer">
                Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={handleStudentImport} />
              </label>
              <button onClick={handleStudentExport} className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">
                Export CSV
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-5">
            <TextInput placeholder="Search students" value={studentFilters.search} onChange={(event) => setStudentFilters((current) => ({ ...current, search: event.target.value }))} />
            <TextInput placeholder="Branch" value={studentFilters.branch} onChange={(event) => setStudentFilters((current) => ({ ...current, branch: event.target.value }))} />
            <SelectInput value={studentFilters.is_active} onChange={(event) => setStudentFilters((current) => ({ ...current, is_active: event.target.value }))}>
              <option value="">All status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </SelectInput>
            <SelectInput value={studentFilters.role} onChange={(event) => setStudentFilters((current) => ({ ...current, role: event.target.value }))}>
              <option value="">All roles</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </SelectInput>
          </div>

          <DataTable
            rows={students}
            empty="No students match the current filters."
            columns={[
              { key: "full_name", label: "Student", render: (row) => <div><p className="font-semibold text-slate-900">{row.full_name}</p><p className="text-xs text-slate-500">{row.email}</p></div> },
              { key: "student_id", label: "Student ID" },
              { key: "branch", label: "Branch" },
              { key: "semester", label: "Semester" },
              {
                key: "role",
                label: "Role",
                render: (row) => (
                  <SelectInput value={row.role} onChange={(event) => updateStudent(row.id, "role", { role: event.target.value })}>
                    <option value="student">Student</option>
                    <option value="admin">Admin</option>
                  </SelectInput>
                ),
              },
              { key: "is_active", label: "Status", render: (row) => <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${row.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{row.is_active ? "Active" : "Inactive"}</span> },
              {
                key: "actions",
                label: "Actions",
                render: (row) => (
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => updateStudent(row.id, row.is_active ? "deactivate" : "activate")} className="text-xs font-semibold text-slate-700 px-2.5 py-1 rounded-lg bg-slate-100">
                      {row.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => updateStudent(row.id, "reset-password")} className="text-xs font-semibold text-blue-700 px-2.5 py-1 rounded-lg bg-blue-50">
                      Reset Password
                    </button>
                    <button onClick={() => updateStudent(row.id, "delete")} className="text-xs font-semibold text-rose-700 px-2.5 py-1 rounded-lg bg-rose-50">
                      Delete
                    </button>
                  </div>
                ),
              },
            ]}
          />
          <p className="text-xs text-slate-400 mt-3">{studentMeta.count} users in result set.</p>
        </Surface>
      ) : null}

      {(section === "notes" || section === "news" || section === "questions") ? (
        <div className="space-y-6">
          <Surface title="Approvals Queue" subtitle="Pending review items requiring admin action.">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-3">Pending Notes</p>
                <div className="space-y-3">
                  {(approvals.notes || []).map((note) => (
                    <div key={note.id} className="rounded-2xl border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-900">{note.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{note.uploaded_by__full_name} · {note.subject}</p>
                    </div>
                  ))}
                  {!approvals.notes?.length ? <p className="text-sm text-slate-500">No pending note approvals.</p> : null}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-3">Pending Notification Approvals</p>
                <div className="space-y-3">
                  {(approvals.scheduled_notifications || []).map((campaign) => (
                    <div key={campaign.id} className="rounded-2xl border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-900">{campaign.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{campaign.status}</p>
                    </div>
                  ))}
                  {!approvals.scheduled_notifications?.length ? <p className="text-sm text-slate-500">No pending notification approvals.</p> : null}
                </div>
              </div>
            </div>
          </Surface>

          {section === "notes" ? (
            <Surface title="Notes Moderation" subtitle="Approve, reject, or remove note uploads.">
              <DataTable
                rows={notes}
                columns={[
                  { key: "title", label: "Note", render: (row) => <div><p className="font-semibold text-slate-900">{row.title}</p><p className="text-xs text-slate-500">{row.subject}</p></div> },
                  { key: "branch", label: "Branch" },
                  { key: "semester", label: "Semester" },
                  { key: "status", label: "Status" },
                  {
                    key: "actions",
                    label: "Actions",
                    render: (row) => (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => moderateNote(row.id, "approve")} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700">Approve</button>
                        <button onClick={() => moderateNote(row.id, "reject")} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700">Reject</button>
                        <button onClick={() => removeNote(row.id)} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700">Remove</button>
                      </div>
                    ),
                  },
                ]}
              />
            </Surface>
          ) : null}

          {section === "news" ? (
            <Surface title="News Moderation" subtitle="Review published content and pin priority items.">
              <DataTable
                rows={news}
                columns={[
                  { key: "title", label: "Article", render: (row) => <div><p className="font-semibold text-slate-900">{row.title}</p><p className="text-xs text-slate-500">{row.category}</p></div> },
                  { key: "priority", label: "Priority" },
                  { key: "read_count", label: "Reads" },
                  { key: "is_active", label: "Published", render: (row) => row.is_active ? "Yes" : "No" },
                  {
                    key: "actions",
                    label: "Actions",
                    render: (row) => (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => toggleNewsPin(row.id)} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700">
                          {row.is_pinned ? "Unpin" : "Pin"}
                        </button>
                        <button onClick={() => deleteNews(row.id)} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700">
                          Delete
                        </button>
                      </div>
                    ),
                  },
                ]}
              />
            </Surface>
          ) : null}

          {section === "questions" ? (
            <div className="grid grid-cols-1 gap-6">
              <Surface title="Coding Question Moderation" subtitle="Manage the coding problem bank and archive problems.">
                <DataTable
                  rows={questions}
                  columns={[
                    { key: "title", label: "Question", render: (row) => <div><p className="font-semibold text-slate-900">{row.title}</p><p className="text-xs text-slate-500">{row.topic}</p></div> },
                    { key: "difficulty", label: "Difficulty" },
                    { key: "total_submissions", label: "Submissions" },
                    { key: "accepted_submissions", label: "Accepted" },
                    {
                      key: "actions",
                      label: "Actions",
                      render: (row) => (
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => deleteQuestion(row.id)} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700">
                            Archive
                          </button>
                        </div>
                      ),
                    },
                  ]}
                />
              </Surface>

              <Surface title="Contest Admin Management" subtitle="Create timed contests from the question bank and archive old ones.">
                <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
                  <div className="space-y-3">
                    <TextInput placeholder="Contest title" value={contestForm.title} onChange={(event) => setContestForm((current) => ({ ...current, title: event.target.value }))} />
                    <textarea className="input-field text-sm min-h-[120px]" placeholder="Contest description" value={contestForm.description} onChange={(event) => setContestForm((current) => ({ ...current, description: event.target.value }))} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <TextInput type="datetime-local" value={contestForm.starts_at} onChange={(event) => setContestForm((current) => ({ ...current, starts_at: event.target.value }))} />
                      <TextInput type="datetime-local" value={contestForm.ends_at} onChange={(event) => setContestForm((current) => ({ ...current, ends_at: event.target.value }))} />
                      <SelectInput value={contestForm.status} onChange={(event) => setContestForm((current) => ({ ...current, status: event.target.value }))}>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </SelectInput>
                    </div>
                    <div className="rounded-2xl border border-slate-200 p-4 max-h-[260px] overflow-y-auto">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Select contest problems</p>
                      <div className="space-y-2">
                        {questions.slice(0, 20).map((question) => (
                          <label key={question.id} className="flex items-center gap-3 text-sm text-slate-700">
                            <input type="checkbox" checked={contestForm.problemIds.includes(question.id)} onChange={() => toggleContestProblem(question.id)} />
                            <span>{question.title}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <button onClick={createContest} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold">
                      Create Contest
                    </button>
                  </div>

                  <div className="space-y-3">
                    {contests.map((contest) => (
                      <div key={contest.id} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{contest.title}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {contest.problems_count} problems · {contest.phase} · {contest.registered_count} registered
                            </p>
                          </div>
                          <button onClick={() => archiveContest(contest.id)} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700">
                            Archive
                          </button>
                        </div>
                      </div>
                    ))}
                    {!contests.length ? <p className="text-sm text-slate-500">No contests configured yet.</p> : null}
                  </div>
                </div>
              </Surface>
            </div>
          ) : null}
        </div>
      ) : null}

      {section === "notifications" ? (
        <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-6">
          <Surface title="Notification Composer" subtitle="Immediate broadcast or scheduled campaign with branch and semester targeting.">
            <div className="space-y-3">
              <TextInput placeholder="Title" value={notificationForm.title} onChange={(event) => setNotificationForm((current) => ({ ...current, title: event.target.value }))} />
              <textarea
                className="input-field text-sm min-h-[140px]"
                placeholder="Message"
                value={notificationForm.message}
                onChange={(event) => setNotificationForm((current) => ({ ...current, message: event.target.value }))}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SelectInput value={notificationForm.notification_type} onChange={(event) => setNotificationForm((current) => ({ ...current, notification_type: event.target.value }))}>
                  <option value="system">System</option>
                  <option value="campus_news">Campus News</option>
                  <option value="coding_reminder">Coding Reminder</option>
                  <option value="new_resource">New Resource</option>
                </SelectInput>
                <TextInput placeholder="Target branch" value={notificationForm.target_branch} onChange={(event) => setNotificationForm((current) => ({ ...current, target_branch: event.target.value }))} />
                <TextInput placeholder="Target semester" value={notificationForm.target_semester} onChange={(event) => setNotificationForm((current) => ({ ...current, target_semester: event.target.value }))} />
                <TextInput type="datetime-local" value={notificationForm.scheduled_for} onChange={(event) => setNotificationForm((current) => ({ ...current, scheduled_for: event.target.value }))} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={sendInstantNotification} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold">
                  Send Now
                </button>
                <button onClick={createScheduledNotification} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700">
                  Save Scheduled
                </button>
              </div>
            </div>
          </Surface>

          <Surface title="Scheduled Campaigns" subtitle="Approve, dispatch, cancel, and track scheduled notifications.">
            <DataTable
              rows={scheduled}
              columns={[
                { key: "title", label: "Campaign", render: (row) => <div><p className="font-semibold text-slate-900">{row.title}</p><p className="text-xs text-slate-500">{row.target_branch || "All branches"} {row.target_semester ? `· Sem ${row.target_semester}` : ""}</p></div> },
                { key: "status", label: "Status" },
                { key: "scheduled_for", label: "Scheduled", render: (row) => row.scheduled_for ? new Date(row.scheduled_for).toLocaleString() : "—" },
                {
                  key: "actions",
                  label: "Actions",
                  render: (row) => (
                    <div className="flex flex-wrap gap-2">
                      {row.status !== "approved" && row.status !== "sent" ? (
                        <button onClick={() => updateCampaign(row.id, "approve")} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700">
                          Approve
                        </button>
                      ) : null}
                      {row.status !== "sent" ? (
                        <button onClick={() => updateCampaign(row.id, "dispatch")} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700">
                          Dispatch
                        </button>
                      ) : null}
                      <button onClick={() => updateCampaign(row.id, "delete")} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700">
                        Cancel
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          </Surface>
        </div>
      ) : null}

      {section === "audit" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Stat label="Events Today" value={activityStats?.summary?.events_today} tone="slate" />
            <Stat label="Events This Week" value={activityStats?.summary?.events_week} tone="blue" />
            <Stat label="Active Users" value={activityStats?.summary?.active_users_today} tone="emerald" />
            <Stat label="Failed Logins" value={activityStats?.summary?.failed_logins_week} tone="rose" />
            <Stat label="Admin Actions" value={dashboard?.audit?.admin_actions_7d} tone="amber" />
          </div>

          <Surface title="Admin Actions" subtitle="Custom audit trail for moderation and administrative changes.">
            <DataTable
              rows={auditLogs}
              columns={[
                { key: "admin_name", label: "Admin", render: (row) => row.admin_name || "System" },
                { key: "action", label: "Action" },
                { key: "description", label: "Description" },
                { key: "created_at", label: "When", render: (row) => new Date(row.created_at).toLocaleString() },
              ]}
            />
          </Surface>

          <Surface title="Login Logs" subtitle="Successful and failed logins across the platform.">
            <DataTable
              rows={loginLogs}
              columns={[
                { key: "username", label: "User" },
                { key: "action", label: "Action" },
                { key: "status", label: "Status" },
                { key: "ip_address", label: "IP" },
                { key: "created_at", label: "When", render: (row) => new Date(row.created_at).toLocaleString() },
              ]}
            />
          </Surface>
        </div>
      ) : null}
    </div>
  );
}
