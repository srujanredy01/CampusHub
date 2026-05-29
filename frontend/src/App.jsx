import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCurrentUser } from "./store/slices/authSlice";
import { fetchDashboardConfig } from "./store/slices/rbacSlice";
import { useRoleSync } from "./hooks/useRoleSync";

// ── Public pages ──────────────────────────────────────────────────────────────
import LoginPage          from "./pages/LoginPage";
import SignupPage         from "./pages/SignupPage";
import VerifyEmailPage    from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage  from "./pages/ResetPasswordPage";
import NotFoundPage       from "./pages/NotFoundPage";
import AccessDeniedPage   from "./pages/AccessDeniedPage";

// ── Common protected pages ────────────────────────────────────────────────────
import DashboardPage      from "./pages/DashboardPage";
import ProfilePage        from "./pages/ProfilePage";
import NotificationsPage  from "./pages/NotificationsPage";
import SettingsPage       from "./pages/SettingsPage";

// ── Student pages ─────────────────────────────────────────────────────────────
import ResourcesPage      from "./pages/ResourcesPage";
import ResourceDetailPage from "./pages/ResourceDetailPage";
import NewsPage           from "./pages/NewsPage";
import NewsDetailPage     from "./pages/NewsDetailPage";
import CodingPage         from "./pages/CodingPage";
import QuestionDetailPage from "./pages/QuestionDetailPage";
import NotesPage          from "./pages/NotesPage";
import NoteDetailPage     from "./pages/NoteDetailPage";
import NoteUploadPage     from "./pages/NoteUploadPage";
import CGPAPage           from "./pages/CGPAPage";
import StudyGroupsPage    from "./pages/StudyGroupsPage";
import GroupDetailPage    from "./pages/GroupDetailPage";
import PlacementPage      from "./pages/PlacementPage";
import AttendancePage     from "./pages/AttendancePage";
import RoadmapsPage       from "./pages/RoadmapsPage";
import RoadmapDetailPage  from "./pages/RoadmapDetailPage";
import RoadmapCreatePage  from "./pages/RoadmapCreatePage";
import ResumePage         from "./pages/ResumePage";
import LostFoundPage      from "./pages/LostFoundPage";
import AssignmentsPage    from "./pages/AssignmentsPage";
import LeaderboardPage    from "./pages/LeaderboardPage";
import ContestsPage       from "./pages/ContestsPage";
import ContestDetailPage  from "./pages/ContestDetailPage";
import SavedContentPage   from "./pages/SavedContentPage";
import CommunicationPage  from "./pages/CommunicationPage";
import EventsPage         from "./pages/EventsPage";
import EventDetailPage    from "./pages/EventDetailPage";

// ── Admin pages ───────────────────────────────────────────────────────────────
import AdminDashboardPage       from "./pages/AdminDashboardPage";
import AdminResourcesPage       from "./pages/AdminResourcesPage";
import AdminUsersPage           from "./pages/AdminUsersPage";
import AdminNewsPage            from "./pages/AdminNewsPage";
import AdminNotesPage           from "./pages/AdminNotesPage";
import AdminQuestionsPage       from "./pages/AdminQuestionsPage";
import AdminNotificationsPage   from "./pages/AdminNotificationsPage";
import AdminAuditPage           from "./pages/AdminAuditPage";
import AdminCGPAPage            from "./pages/AdminCGPAPage";
import AdminAttendancePage      from "./pages/AdminAttendancePage";
import AdminCommunicationPage   from "./pages/AdminCommunicationPage";
import AdminEventsPage          from "./pages/AdminEventsPage";
import AdminFeedbackPage        from "./pages/AdminFeedbackPage";
import AdminDepartmentsPage     from "./pages/AdminDepartmentsPage";
import AdminSectionsPage        from "./pages/AdminSectionsPage";
import AdminAnalyticsPage       from "./pages/AdminAnalyticsPage";
import AdminModerationPage      from "./pages/AdminModerationPage";
import AdminAcademicPage        from "./pages/AdminAcademicPage";
import AdminAnnouncementsPage   from "./pages/AdminAnnouncementsPage";
import AdminStudyGroupsPage     from "./pages/AdminStudyGroupsPage";
import AdminChannelsPage        from "./pages/AdminChannelsPage";
import AdminPlacementPage       from "./pages/AdminPlacementPage";

// ── Faculty pages ─────────────────────────────────────────────────────────────
import FacultyDashboardPage     from "./pages/FacultyDashboardPage";
import FacultyStudentsPage      from "./pages/FacultyStudentsPage";
import FacultyAttendancePage    from "./pages/FacultyAttendancePage";
import FacultyAssignmentsPage   from "./pages/FacultyAssignmentsPage";
import FacultyGradesPage        from "./pages/FacultyGradesPage";
import FacultyAnnouncementsPage from "./pages/FacultyAnnouncementsPage";
import FacultyAnalyticsPage     from "./pages/FacultyAnalyticsPage";
import FacultyChatPage          from "./pages/FacultyChatPage";
import FacultyEventsPage        from "./pages/FacultyEventsPage";
import FacultyResourcesPage     from "./pages/FacultyResourcesPage";

// ── Moderator pages ───────────────────────────────────────────────────────────
import ModeratorDashboardPage   from "./pages/ModeratorDashboardPage";
import ModeratorReportsPage     from "./pages/ModeratorReportsPage";
import ModeratorChannelsPage    from "./pages/ModeratorChannelsPage";
import ModeratorApprovalsPage   from "./pages/ModeratorApprovalsPage";
import ModeratorAnalyticsPage   from "./pages/ModeratorAnalyticsPage";
import ModeratorLogsPage        from "./pages/ModeratorLogsPage";

// ── Layout / Guards ───────────────────────────────────────────────────────────
import Layout             from "./components/common/Layout";
import ProtectedRoute     from "./components/common/ProtectedRoute";
import PermissionRoute    from "./components/common/PermissionRoute";
import { PageLoader }     from "./components/common/LoadingSpinner";

function App() {
  const dispatch = useDispatch();
  const { isInitialized, isAuthenticated } = useSelector((s) => s.auth);

  // Fetch user on app boot
  useEffect(() => { dispatch(fetchCurrentUser()); }, [dispatch]);

  // Fetch RBAC config once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchDashboardConfig());
    }
  }, [dispatch, isAuthenticated]);

  // Real-time role/permission sync via WebSocket
  useRoleSync();

  if (!isInitialized) {
    return <PageLoader />;
  }

  return (
    <Routes>
      {/* ══════════════════════════════════════════════════════════════════════
          PUBLIC ROUTES
          ══════════════════════════════════════════════════════════════════════ */}
      <Route path="/login"           element={<LoginPage />} />
      <Route path="/signup"          element={<SignupPage />} />
      <Route path="/verify-email"    element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password"  element={<ResetPasswordPage />} />
      <Route path="/access-denied"   element={<AccessDeniedPage />} />

      {/* ══════════════════════════════════════════════════════════════════════
          COMMON PROTECTED ROUTES (all authenticated users)
          Dashboard, Profile, Notifications, Settings
          ══════════════════════════════════════════════════════════════════════ */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/"              element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"     element={<DashboardPage />} />
          <Route path="/profile"       element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/settings"      element={<SettingsPage />} />
        </Route>
      </Route>

      {/* ══════════════════════════════════════════════════════════════════════
          STUDENT ROUTES
          Protected by student-specific permissions.
          Faculty/Moderator/Admin CANNOT access these.
          ══════════════════════════════════════════════════════════════════════ */}

      {/* Resources & Academics */}
      <Route element={<PermissionRoute requires="view_resources" />}>
        <Route element={<Layout />}>
          <Route path="/resources"     element={<ResourcesPage />} />
          <Route path="/resources/:id" element={<ResourceDetailPage />} />
        </Route>
      </Route>

      <Route element={<PermissionRoute requires="view_assignments" />}>
        <Route element={<Layout />}>
          <Route path="/assignments" element={<AssignmentsPage />} />
        </Route>
      </Route>

      <Route element={<PermissionRoute requires="view_attendance" />}>
        <Route element={<Layout />}>
          <Route path="/attendance" element={<AttendancePage />} />
        </Route>
      </Route>

      <Route element={<PermissionRoute requires="view_cgpa" />}>
        <Route element={<Layout />}>
          <Route path="/cgpa" element={<CGPAPage />} />
        </Route>
      </Route>

      <Route element={<PermissionRoute requires="view_notes" />}>
        <Route element={<Layout />}>
          <Route path="/notes"        element={<NotesPage />} />
          <Route path="/notes/upload" element={<NoteUploadPage />} />
          <Route path="/notes/:id"    element={<NoteDetailPage />} />
        </Route>
      </Route>

      <Route element={<PermissionRoute requires="view_news" />}>
        <Route element={<Layout />}>
          <Route path="/news"      element={<NewsPage />} />
          <Route path="/news/:id"  element={<NewsDetailPage />} />
        </Route>
      </Route>

      {/* Coding & Career */}
      <Route element={<PermissionRoute requires="view_coding" />}>
        <Route element={<Layout />}>
          <Route path="/coding"     element={<CodingPage />} />
          <Route path="/coding/:id" element={<QuestionDetailPage />} />
        </Route>
      </Route>

      <Route element={<PermissionRoute requires="view_contests" />}>
        <Route element={<Layout />}>
          <Route path="/contests"     element={<ContestsPage />} />
          <Route path="/contests/:id" element={<ContestDetailPage />} />
        </Route>
      </Route>

      <Route element={<PermissionRoute requires="view_leaderboard" />}>
        <Route element={<Layout />}>
          <Route path="/leaderboard" element={<LeaderboardPage />} />
        </Route>
      </Route>

      <Route element={<PermissionRoute requires="view_roadmaps" />}>
        <Route element={<Layout />}>
          <Route path="/roadmaps"        element={<RoadmapsPage />} />
          <Route path="/roadmaps/create" element={<RoadmapCreatePage />} />
          <Route path="/roadmaps/:slug"  element={<RoadmapDetailPage />} />
        </Route>
      </Route>

      <Route element={<PermissionRoute requires="view_resume" />}>
        <Route element={<Layout />}>
          <Route path="/resume" element={<ResumePage />} />
        </Route>
      </Route>

      <Route element={<PermissionRoute requires="view_placement" />}>
        <Route element={<Layout />}>
          <Route path="/placement" element={<PlacementPage />} />
        </Route>
      </Route>

      {/* Community */}
      <Route element={<PermissionRoute requires="view_communication" />}>
        <Route element={<Layout />}>
          <Route path="/communication" element={<CommunicationPage />} />
        </Route>
      </Route>

      <Route element={<PermissionRoute requires="view_groups" />}>
        <Route element={<Layout />}>
          <Route path="/groups"     element={<StudyGroupsPage />} />
          <Route path="/groups/:id" element={<GroupDetailPage />} />
        </Route>
      </Route>

      <Route element={<PermissionRoute requires="view_events" />}>
        <Route element={<Layout />}>
          <Route path="/events"       element={<EventsPage />} />
          <Route path="/events/:slug" element={<EventDetailPage />} />
        </Route>
      </Route>

      <Route element={<PermissionRoute requires="view_lost_found" />}>
        <Route element={<Layout />}>
          <Route path="/lost-found" element={<LostFoundPage />} />
        </Route>
      </Route>

      <Route element={<PermissionRoute requires="view_saved" />}>
        <Route element={<Layout />}>
          <Route path="/saved" element={<SavedContentPage />} />
        </Route>
      </Route>

      {/* ══════════════════════════════════════════════════════════════════════
          FACULTY ROUTES
          Protected by faculty-specific permissions.
          Students/Moderators/Admins CANNOT access these.
          ══════════════════════════════════════════════════════════════════════ */}
      <Route element={<PermissionRoute requiresAny={["manage_students", "manage_attendance", "grade_assignments", "create_assignments"]} />}>
        <Route element={<Layout />}>
          <Route path="/faculty"               element={<Navigate to="/faculty/dashboard" replace />} />
          <Route path="/faculty/dashboard"     element={<FacultyDashboardPage />} />
          <Route path="/faculty/students"      element={<FacultyStudentsPage />} />
          <Route path="/faculty/attendance"    element={<FacultyAttendancePage />} />
          <Route path="/faculty/assignments"   element={<FacultyAssignmentsPage />} />
          <Route path="/faculty/grades"        element={<FacultyGradesPage />} />
          <Route path="/faculty/announcements" element={<FacultyAnnouncementsPage />} />
          <Route path="/faculty/analytics"     element={<FacultyAnalyticsPage />} />
          <Route path="/faculty/chat"          element={<FacultyChatPage />} />
          <Route path="/faculty/events"        element={<FacultyEventsPage />} />
          <Route path="/faculty/resources"     element={<FacultyResourcesPage />} />
        </Route>
      </Route>

      {/* ══════════════════════════════════════════════════════════════════════
          MODERATOR ROUTES
          Protected by moderator-specific permissions.
          Students/Faculty/Admins CANNOT access these.
          ══════════════════════════════════════════════════════════════════════ */}
      <Route element={<PermissionRoute requiresAny={["view_reports", "moderate_channels", "moderate_notes", "moderate_roadmaps", "moderate_groups", "moderate_chat"]} />}>
        <Route element={<Layout />}>
          <Route path="/moderator"            element={<Navigate to="/moderator/dashboard" replace />} />
          <Route path="/moderator/dashboard"  element={<ModeratorDashboardPage />} />
          <Route path="/moderator/reports"    element={<ModeratorReportsPage />} />
          <Route path="/moderator/channels"   element={<ModeratorChannelsPage />} />
          <Route path="/moderator/approvals"  element={<ModeratorApprovalsPage />} />
          <Route path="/moderator/analytics"  element={<ModeratorAnalyticsPage />} />
          <Route path="/moderator/logs"       element={<ModeratorLogsPage />} />
        </Route>
      </Route>

      {/* ══════════════════════════════════════════════════════════════════════
          ADMIN ROUTES
          Protected by admin-specific permissions.
          Students/Faculty/Moderators CANNOT access these.
          ══════════════════════════════════════════════════════════════════════ */}
      <Route element={<PermissionRoute requires="manage_users" />}>
        <Route element={<Layout />}>
          <Route path="/admin"                element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard"      element={<AdminDashboardPage />} />
          <Route path="/admin/users"          element={<AdminUsersPage />} />
          <Route path="/admin/departments"    element={<AdminDepartmentsPage />} />
          <Route path="/admin/sections"       element={<AdminSectionsPage />} />
          <Route path="/admin/analytics"      element={<AdminAnalyticsPage />} />
          <Route path="/admin/moderation"     element={<AdminModerationPage />} />
          <Route path="/admin/academic"       element={<AdminAcademicPage />} />
          <Route path="/admin/announcements"  element={<AdminAnnouncementsPage />} />
          <Route path="/admin/study-groups"   element={<AdminStudyGroupsPage />} />
          <Route path="/admin/channels"       element={<AdminChannelsPage />} />
          <Route path="/admin/placement"      element={<AdminPlacementPage />} />
          <Route path="/admin/resources"      element={<AdminResourcesPage />} />
          <Route path="/admin/news"           element={<AdminNewsPage />} />
          <Route path="/admin/questions"      element={<AdminQuestionsPage />} />
          <Route path="/admin/notes"          element={<AdminNotesPage />} />
          <Route path="/admin/notifications"  element={<AdminNotificationsPage />} />
          <Route path="/admin/cgpa"           element={<AdminCGPAPage />} />
          <Route path="/admin/attendance"     element={<AdminAttendancePage />} />
          <Route path="/admin/communication"  element={<AdminCommunicationPage />} />
          <Route path="/admin/events"         element={<AdminEventsPage />} />
          <Route path="/admin/feedback"       element={<AdminFeedbackPage />} />
          <Route path="/admin/audit"          element={<AdminAuditPage />} />
        </Route>
      </Route>

      {/* ══════════════════════════════════════════════════════════════════════
          CATCH-ALL
          ══════════════════════════════════════════════════════════════════════ */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
