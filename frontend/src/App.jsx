import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchCurrentUser } from "./store/slices/authSlice";

// ── Existing pages ────────────────────────────────────────────────────────────
import LoginPage          from "./pages/LoginPage";
import SignupPage         from "./pages/SignupPage";
import VerifyEmailPage    from "./pages/VerifyEmailPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage  from "./pages/ResetPasswordPage";
import DashboardPage      from "./pages/DashboardPage";
import ProfilePage        from "./pages/ProfilePage";
import ResourcesPage      from "./pages/ResourcesPage";
import ResourceDetailPage from "./pages/ResourceDetailPage";
import NewsPage           from "./pages/NewsPage";
import NewsDetailPage     from "./pages/NewsDetailPage";
import CodingPage         from "./pages/CodingPage";
import QuestionDetailPage from "./pages/QuestionDetailPage";
import NotificationsPage  from "./pages/NotificationsPage";
import NotFoundPage       from "./pages/NotFoundPage";

// ── New student pages ─────────────────────────────────────────────────────────
import NotesPage          from "./pages/NotesPage";
import NoteDetailPage     from "./pages/NoteDetailPage";
import NoteUploadPage     from "./pages/NoteUploadPage";
import CGPAPage           from "./pages/CGPAPage";
import StudyGroupsPage    from "./pages/StudyGroupsPage";
import GroupDetailPage    from "./pages/GroupDetailPage";
import PlacementPage      from "./pages/PlacementPage";
import AttendancePage     from "./pages/AttendancePage";

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

// ── Layout / Guards ───────────────────────────────────────────────────────────
import Layout         from "./components/common/Layout";
import ProtectedRoute from "./components/common/ProtectedRoute";
import AdminRoute     from "./components/common/AdminRoute";
import LoadingSpinner, { PageLoader } from "./components/common/LoadingSpinner";

function App() {
  const dispatch = useDispatch();
  const { isInitialized } = useSelector((s) => s.auth);

  useEffect(() => { dispatch(fetchCurrentUser()); }, [dispatch]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Routes>
      {/* ── Public ─────────────────────────────────────────────────────── */}
      <Route path="/login"          element={<LoginPage />} />
      <Route path="/signup"         element={<SignupPage />} />
      <Route path="/verify-email"   element={<VerifyEmailPage />} />
      <Route path="/forgot-password"element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* ── Protected student ──────────────────────────────────────────── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/"                  element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"         element={<DashboardPage />} />
          <Route path="/profile"           element={<ProfilePage />} />

          {/* Resources */}
          <Route path="/resources"         element={<ResourcesPage />} />
          <Route path="/resources/:id"     element={<ResourceDetailPage />} />

          {/* News */}
          <Route path="/news"              element={<NewsPage />} />
          <Route path="/news/:id"          element={<NewsDetailPage />} />

          {/* Coding */}
          <Route path="/coding"            element={<CodingPage />} />
          <Route path="/coding/:id"        element={<QuestionDetailPage />} />

          {/* Notifications */}
          <Route path="/notifications"     element={<NotificationsPage />} />

          {/* Notes */}
          <Route path="/notes"             element={<NotesPage />} />
          <Route path="/notes/upload"      element={<NoteUploadPage />} />
          <Route path="/notes/:id"         element={<NoteDetailPage />} />

          {/* CGPA */}
          <Route path="/cgpa"              element={<CGPAPage />} />

          {/* Study Groups */}
          <Route path="/groups"            element={<StudyGroupsPage />} />
          <Route path="/groups/:id"        element={<GroupDetailPage />} />

          {/* Placement */}
          <Route path="/placement"         element={<PlacementPage />} />

          {/* Attendance */}
          <Route path="/attendance"        element={<AttendancePage />} />
        </Route>
      </Route>

      {/* ── Admin ──────────────────────────────────────────────────────── */}
      <Route element={<AdminRoute />}>
        <Route element={<Layout isAdmin />}>
          <Route path="/admin"                  element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard"        element={<AdminDashboardPage />} />
          <Route path="/admin/users"            element={<AdminUsersPage />} />
          <Route path="/admin/resources"        element={<AdminResourcesPage />} />
          <Route path="/admin/news"             element={<AdminNewsPage />} />
          <Route path="/admin/questions"        element={<AdminQuestionsPage />} />
          <Route path="/admin/notes"            element={<AdminNotesPage />} />
          <Route path="/admin/notifications"    element={<AdminNotificationsPage />} />
          <Route path="/admin/cgpa"             element={<AdminCGPAPage />} />
          <Route path="/admin/attendance"       element={<AdminAttendancePage />} />
          <Route path="/admin/audit"            element={<AdminAuditPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
