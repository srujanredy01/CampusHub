"""
Dynamic RBAC Configuration for CampusHub.
Defines the permission registry, module access, and dashboard config
that gets served to the frontend via API.

This is the SINGLE SOURCE OF TRUTH for what each role can access.
When Super Admin changes a user's role, the frontend automatically
adapts based on this configuration.

DESIGN PRINCIPLE: Each role sees ONLY what is relevant to their function.
- Students see academic, coding, career, and community features.
- Faculty sees student/attendance/assignment management and academic analytics.
- Moderators see content moderation tools only.
- Admins see user/department/analytics management only.
- Super Admin sees everything.

NO role inherits unrelated modules from other roles.
"""

# ── Permission Registry ───────────────────────────────────────────────────────
# Each permission maps to a codename used in backend checks and frontend guards.

PERMISSIONS = {
    # ── Common permissions (shared across roles as needed) ────────────────────
    "view_dashboard": "Access role-specific dashboard",
    "view_profile": "View own profile",
    "view_notifications": "View notifications",
    "view_settings": "Access settings",

    # ── Student-only permissions ──────────────────────────────────────────────
    "view_resources": "View academic resources",
    "view_assignments": "View assignments",
    "submit_assignments": "Submit assignments",
    "view_attendance": "View own attendance",
    "view_cgpa": "View CGPA/academic performance",
    "view_notes": "View and upload notes",
    "view_news": "View announcements",
    "view_coding": "Access coding hub",
    "view_contests": "View coding contests",
    "view_leaderboard": "View leaderboard",
    "view_roadmaps": "View learning roadmaps",
    "create_roadmaps": "Create community roadmaps",
    "view_resume": "Access resume builder",
    "view_placement": "View placement tracker",
    "view_communication": "Access campus chat",
    "view_groups": "View study groups",
    "create_groups": "Create study groups",
    "view_events": "View events",
    "view_lost_found": "View lost & found",
    "view_saved": "View saved content",

    # ── Faculty permissions ───────────────────────────────────────────────────
    "manage_students": "Manage students in assigned sections",
    "manage_attendance": "Mark and manage attendance",
    "grade_assignments": "Grade student assignments",
    "create_assignments": "Create assignments",
    "view_faculty_analytics": "View academic analytics",
    "create_announcements": "Create faculty announcements",
    "verify_notes": "Verify/approve student notes",
    "manage_placement": "Manage placement (coordinators)",
    "export_data": "Export attendance/grade data",
    "faculty_view_resources": "Faculty view/upload resources",
    "faculty_view_events": "Faculty manage events",
    "faculty_view_communication": "Faculty access chat",
    "faculty_view_groups": "Faculty oversee study groups",

    # ── Moderator permissions ─────────────────────────────────────────────────
    "moderate_channels": "Approve/reject channel requests",
    "moderate_notes": "Moderate uploaded notes",
    "moderate_roadmaps": "Moderate community roadmaps",
    "moderate_groups": "Moderate study groups",
    "moderate_chat": "Moderate chat messages",
    "view_reports": "View content reports",
    "resolve_reports": "Resolve content reports",
    "warn_users": "Issue warnings to users",
    "ban_users": "Ban users",
    "view_moderation_logs": "View moderation action logs",
    "view_moderation_analytics": "View moderation analytics",

    # ── Admin permissions ─────────────────────────────────────────────────────
    "manage_users": "Full user management (CRUD)",
    "manage_roles": "Assign/change user roles",
    "manage_departments": "Manage departments",
    "manage_sections": "Manage sections",
    "manage_resources": "Manage platform resources",
    "manage_news": "Manage news/announcements",
    "manage_coding": "Manage coding questions",
    "manage_notifications": "Send platform notifications",
    "manage_events": "Manage events",
    "manage_communication": "Manage communication channels",
    "view_audit_logs": "View audit logs",
    "view_admin_analytics": "View platform analytics",
    "view_system_health": "View system health",
    "admin_moderation_overview": "View moderation overview",
    "admin_academic_overview": "View academic overview",

    # ── Super Admin permissions ───────────────────────────────────────────────
    "manage_admins": "Create/manage admin accounts",
    "manage_rbac": "Configure RBAC settings",
    "view_all_logs": "View all system logs",
    "manage_server": "Server monitoring & management",
    "impersonate_users": "Impersonate other users",
    "view_docker_status": "View Docker container status",
    "view_redis_status": "View Redis status",
    "view_celery_status": "View Celery worker status",
    "view_api_health": "View API health metrics",
    "view_database_analytics": "View database analytics",
}

# ── Role → Permissions Mapping ────────────────────────────────────────────────
# Each role gets ONLY the permissions relevant to their function.
# NO cross-role inheritance of unrelated features.
# Super Admin can override per-user via the admin dashboard.

ROLE_PERMISSIONS = {
    # ── STUDENT ───────────────────────────────────────────────────────────────
    # Students see: Dashboard, Profile, Notifications, Resources, Assignments,
    # Attendance, Academic Performance, Coding Hub, Contests, Leaderboard,
    # Career Roadmaps, Resume Builder, Placement Tracker, Campus Chat,
    # Study Groups, Events, Lost & Found, Saved Content, Settings
    "student": [
        "view_dashboard", "view_profile", "view_notifications", "view_settings",
        "view_resources", "view_assignments", "submit_assignments",
        "view_attendance", "view_cgpa", "view_notes", "view_news",
        "view_coding", "view_contests", "view_leaderboard",
        "view_roadmaps", "create_roadmaps",
        "view_resume", "view_placement",
        "view_communication", "view_groups", "create_groups",
        "view_events", "view_lost_found", "view_saved",
    ],

    # ── FACULTY ───────────────────────────────────────────────────────────────
    # Faculty sees: Faculty Dashboard, Student Management, Attendance Management,
    # Assignment Management, Grading, Academic Analytics, Announcements,
    # Faculty Chat, Study Group Oversight, Resources Upload, Event Management,
    # Faculty Profile, Notifications, Settings
    # Faculty does NOT see: Student coding dashboard, Placement tracker,
    # Resume builder, Saved content, Leaderboard, Student contests,
    # Moderator queue, Admin system controls, Server analytics
    "faculty": [
        "view_dashboard", "view_profile", "view_notifications", "view_settings",
        # Faculty-specific management
        "manage_students", "manage_attendance", "grade_assignments",
        "create_assignments", "view_faculty_analytics", "create_announcements",
        "verify_notes", "export_data",
        # Faculty access to shared features (limited)
        "faculty_view_resources", "faculty_view_events",
        "faculty_view_communication", "faculty_view_groups",
    ],

    # ── MODERATOR ─────────────────────────────────────────────────────────────
    # Moderator sees: Moderator Dashboard, Channel Requests, Roadmap Reviews,
    # Content Reports, Study Group Moderation, Chat Moderation,
    # Notes Moderation, Moderation Analytics, Notifications, Settings
    # Moderator does NOT see: Student dashboards, Faculty grading,
    # Attendance management, CGPA tools, Coding submissions,
    # Placement tracker, Admin infrastructure controls
    "moderator": [
        "view_dashboard", "view_profile", "view_notifications", "view_settings",
        # Moderator-specific
        "moderate_channels", "moderate_notes", "moderate_roadmaps",
        "moderate_groups", "moderate_chat",
        "view_reports", "resolve_reports",
        "warn_users", "view_moderation_logs", "view_moderation_analytics",
    ],

    # ── ADMIN ─────────────────────────────────────────────────────────────────
    # Admin sees: Admin Dashboard, User Management, Department Management,
    # Section Management, Analytics Reports, Moderation Overview,
    # Events Management, Academic Overview, Notifications, Settings
    # Admin does NOT see: Student personal dashboards, Coding playground,
    # Student CGPA calculators, Resume builder, Roadmaps as student view
    "admin": [
        "view_dashboard", "view_profile", "view_notifications", "view_settings",
        # Admin-specific management
        "manage_users", "manage_roles", "manage_departments", "manage_sections",
        "manage_resources", "manage_news", "manage_coding",
        "manage_notifications", "manage_events", "manage_communication",
        "view_audit_logs", "view_admin_analytics", "view_system_health",
        # Admin oversight (read-only overviews, not student-facing features)
        "admin_moderation_overview", "admin_academic_overview",
    ],

    # ── SUPER ADMIN ───────────────────────────────────────────────────────────
    # Super Admin sees EVERYTHING including system monitoring, RBAC control,
    # audit logs, Docker/Redis/Celery status, API health, database analytics,
    # and all modules from all other roles.
    "super_admin": list(PERMISSIONS.keys()),
}

# ── Module Registry ───────────────────────────────────────────────────────────
# Maps module IDs to the permissions required to access them.
# A user can access a module only if they have at least one of the listed permissions.

MODULE_REGISTRY = {
    # ── Common modules (all roles) ────────────────────────────────────────────
    "dashboard":       {"permissions": ["view_dashboard"], "label": "Dashboard"},
    "profile":         {"permissions": ["view_profile"], "label": "Profile"},
    "notifications":   {"permissions": ["view_notifications"], "label": "Notifications"},
    "settings":        {"permissions": ["view_settings"], "label": "Settings"},

    # ── Student-only modules ──────────────────────────────────────────────────
    "resources":       {"permissions": ["view_resources"], "label": "Resources"},
    "assignments":     {"permissions": ["view_assignments"], "label": "Assignments"},
    "attendance":      {"permissions": ["view_attendance"], "label": "Attendance"},
    "cgpa":            {"permissions": ["view_cgpa"], "label": "Academic Performance"},
    "notes":           {"permissions": ["view_notes"], "label": "Notes"},
    "news":            {"permissions": ["view_news"], "label": "Announcements"},
    "coding":          {"permissions": ["view_coding"], "label": "Coding Hub"},
    "contests":        {"permissions": ["view_contests"], "label": "Contests"},
    "leaderboard":     {"permissions": ["view_leaderboard"], "label": "Leaderboard"},
    "roadmaps":        {"permissions": ["view_roadmaps"], "label": "Career Roadmaps"},
    "resume":          {"permissions": ["view_resume"], "label": "Resume Builder"},
    "placement":       {"permissions": ["view_placement"], "label": "Placement Tracker"},
    "communication":   {"permissions": ["view_communication"], "label": "Campus Chat"},
    "groups":          {"permissions": ["view_groups"], "label": "Study Groups"},
    "events":          {"permissions": ["view_events"], "label": "Events"},
    "lost_found":      {"permissions": ["view_lost_found"], "label": "Lost & Found"},
    "saved":           {"permissions": ["view_saved"], "label": "Saved Content"},

    # ── Faculty modules ───────────────────────────────────────────────────────
    "faculty_dashboard":     {"permissions": ["manage_students"], "label": "Faculty Dashboard"},
    "faculty_students":      {"permissions": ["manage_students"], "label": "Student Management"},
    "faculty_attendance":    {"permissions": ["manage_attendance"], "label": "Attendance Management"},
    "faculty_assignments":   {"permissions": ["create_assignments"], "label": "Assignment Management"},
    "faculty_grades":        {"permissions": ["grade_assignments"], "label": "Grading"},
    "faculty_announcements": {"permissions": ["create_announcements"], "label": "Announcements"},
    "faculty_analytics":     {"permissions": ["view_faculty_analytics"], "label": "Academic Analytics"},
    "faculty_resources":     {"permissions": ["faculty_view_resources"], "label": "Resources Upload"},
    "faculty_events":        {"permissions": ["faculty_view_events"], "label": "Event Management"},
    "faculty_chat":          {"permissions": ["faculty_view_communication"], "label": "Faculty Chat"},
    "faculty_groups":        {"permissions": ["faculty_view_groups"], "label": "Study Group Oversight"},

    # ── Moderator modules ─────────────────────────────────────────────────────
    "moderator_dashboard":  {"permissions": ["view_reports"], "label": "Moderator Dashboard"},
    "moderator_channels":   {"permissions": ["moderate_channels"], "label": "Channel Requests"},
    "moderator_roadmaps":   {"permissions": ["moderate_roadmaps"], "label": "Roadmap Reviews"},
    "moderator_reports":    {"permissions": ["view_reports"], "label": "Content Reports"},
    "moderator_groups":     {"permissions": ["moderate_groups"], "label": "Study Group Moderation"},
    "moderator_chat":       {"permissions": ["moderate_chat"], "label": "Chat Moderation"},
    "moderator_notes":      {"permissions": ["moderate_notes"], "label": "Notes Moderation"},
    "moderator_analytics":  {"permissions": ["view_moderation_analytics"], "label": "Moderation Analytics"},
    "moderator_logs":       {"permissions": ["view_moderation_logs"], "label": "Moderation Logs"},

    # ── Admin modules ─────────────────────────────────────────────────────────
    "admin_dashboard":       {"permissions": ["manage_users"], "label": "Admin Dashboard"},
    "admin_users":           {"permissions": ["manage_users"], "label": "User Management"},
    "admin_departments":     {"permissions": ["manage_departments"], "label": "Department Management"},
    "admin_sections":        {"permissions": ["manage_sections"], "label": "Section Management"},
    "admin_analytics":       {"permissions": ["view_admin_analytics"], "label": "Analytics & Reports"},
    "admin_moderation":      {"permissions": ["admin_moderation_overview"], "label": "Moderation Overview"},
    "admin_events":          {"permissions": ["manage_events"], "label": "Events Management"},
    "admin_academic":        {"permissions": ["admin_academic_overview"], "label": "Academic Overview"},
    "admin_notifications":   {"permissions": ["manage_notifications"], "label": "Notification Management"},
    "admin_audit":           {"permissions": ["view_audit_logs"], "label": "Audit Logs"},
    "admin_system":          {"permissions": ["view_system_health"], "label": "System Health"},

    # ── Super Admin exclusive modules ─────────────────────────────────────────
    "system_monitoring":     {"permissions": ["manage_server"], "label": "System Monitoring"},
    "rbac_control":          {"permissions": ["manage_rbac"], "label": "RBAC Control"},
    "docker_status":         {"permissions": ["view_docker_status"], "label": "Docker Status"},
    "redis_status":          {"permissions": ["view_redis_status"], "label": "Redis Status"},
    "celery_status":         {"permissions": ["view_celery_status"], "label": "Celery Status"},
    "api_health":            {"permissions": ["view_api_health"], "label": "API Health"},
    "database_analytics":    {"permissions": ["view_database_analytics"], "label": "Database Analytics"},
}

# ── Dashboard Widget Configuration ────────────────────────────────────────────
# Defines which widgets appear on each role's dashboard.

DASHBOARD_WIDGETS = {
    "student": [
        {"id": "cgpa_summary", "label": "CGPA Summary", "size": "sm"},
        {"id": "attendance_summary", "label": "Attendance", "size": "sm"},
        {"id": "upcoming_assignments", "label": "Upcoming Assignments", "size": "md"},
        {"id": "coding_stats", "label": "Coding Stats", "size": "sm"},
        {"id": "recent_announcements", "label": "Announcements", "size": "md"},
        {"id": "upcoming_events", "label": "Upcoming Events", "size": "sm"},
        {"id": "placement_status", "label": "Placement Status", "size": "sm"},
        {"id": "study_groups", "label": "My Groups", "size": "sm"},
    ],
    "faculty": [
        {"id": "total_students", "label": "Total Students", "size": "sm"},
        {"id": "pending_evaluations", "label": "Pending Evaluations", "size": "sm"},
        {"id": "low_attendance", "label": "Low Attendance Alerts", "size": "sm"},
        {"id": "todays_classes", "label": "Today's Classes", "size": "sm"},
        {"id": "recent_submissions", "label": "Recent Submissions", "size": "md"},
        {"id": "section_analytics", "label": "Section Analytics", "size": "lg"},
        {"id": "announcements", "label": "My Announcements", "size": "md"},
    ],
    "moderator": [
        {"id": "pending_reports", "label": "Pending Reports", "size": "sm"},
        {"id": "pending_approvals", "label": "Pending Approvals", "size": "sm"},
        {"id": "active_bans", "label": "Active Bans", "size": "sm"},
        {"id": "recent_actions", "label": "Recent Actions", "size": "md"},
        {"id": "channel_requests", "label": "Channel Requests", "size": "md"},
        {"id": "moderation_stats", "label": "Moderation Stats", "size": "lg"},
    ],
    "admin": [
        {"id": "total_users", "label": "Total Users", "size": "sm"},
        {"id": "active_today", "label": "Active Today", "size": "sm"},
        {"id": "new_signups", "label": "New Signups (7d)", "size": "sm"},
        {"id": "system_health", "label": "System Health", "size": "sm"},
        {"id": "user_growth", "label": "User Growth", "size": "lg"},
        {"id": "platform_activity", "label": "Platform Activity", "size": "md"},
        {"id": "pending_approvals", "label": "Pending Approvals", "size": "md"},
        {"id": "recent_alerts", "label": "Recent Alerts", "size": "md"},
    ],
    "super_admin": [
        {"id": "total_users", "label": "Total Users", "size": "sm"},
        {"id": "active_today", "label": "Active Today", "size": "sm"},
        {"id": "system_health", "label": "System Health", "size": "sm"},
        {"id": "server_metrics", "label": "Server Metrics", "size": "sm"},
        {"id": "user_growth", "label": "User Growth", "size": "lg"},
        {"id": "role_distribution", "label": "Role Distribution", "size": "md"},
        {"id": "audit_summary", "label": "Audit Summary", "size": "md"},
        {"id": "api_analytics", "label": "API Analytics", "size": "lg"},
        {"id": "rbac_overview", "label": "RBAC Overview", "size": "md"},
    ],
}

# ── Sidebar Navigation Configuration ─────────────────────────────────────────
# Defines the navigation structure served to the frontend.
# Each item has a required_permission — frontend only renders items the user has access to.
# Sections are only shown if the user has the section-level permission.
# This ensures each role sees a purpose-built navigation, not a giant shared menu.

SIDEBAR_CONFIG = [
    # ══════════════════════════════════════════════════════════════════════════
    # COMMON (all authenticated roles)
    # ══════════════════════════════════════════════════════════════════════════
    {"section": "Main"},
    {"path": "/dashboard", "label": "Dashboard", "icon": "Dashboard", "permission": "view_dashboard"},
    {"path": "/profile", "label": "Profile", "icon": "Profile", "permission": "view_profile"},
    {"path": "/notifications", "label": "Notifications", "icon": "Notifications", "permission": "view_notifications"},

    # ══════════════════════════════════════════════════════════════════════════
    # STUDENT-ONLY: Academics
    # Only visible to students (and super_admin)
    # ══════════════════════════════════════════════════════════════════════════
    {"section": "Academics", "permission": "view_resources"},
    {"path": "/resources", "label": "Resources", "icon": "Resources", "permission": "view_resources"},
    {"path": "/assignments", "label": "Assignments", "icon": "Assignments", "permission": "view_assignments"},
    {"path": "/attendance", "label": "Attendance", "icon": "Attendance", "permission": "view_attendance"},
    {"path": "/cgpa", "label": "Academic Performance", "icon": "Academic", "permission": "view_cgpa"},

    # ══════════════════════════════════════════════════════════════════════════
    # STUDENT-ONLY: Coding & Career
    # Only visible to students (and super_admin)
    # ══════════════════════════════════════════════════════════════════════════
    {"section": "Coding & Career", "permission": "view_coding"},
    {"path": "/coding", "label": "Coding Hub", "icon": "Code", "permission": "view_coding"},
    {"path": "/contests", "label": "Contests", "icon": "Contest", "permission": "view_contests"},
    {"path": "/leaderboard", "label": "Leaderboard", "icon": "Trophy", "permission": "view_leaderboard"},
    {"path": "/roadmaps", "label": "Career Roadmaps", "icon": "Roadmap", "permission": "view_roadmaps"},
    {"path": "/resume", "label": "Resume Builder", "icon": "Resume", "permission": "view_resume"},
    {"path": "/placement", "label": "Placement Tracker", "icon": "Placement", "permission": "view_placement"},

    # ══════════════════════════════════════════════════════════════════════════
    # STUDENT-ONLY: Community
    # Only visible to students (and super_admin)
    # ══════════════════════════════════════════════════════════════════════════
    {"section": "Community", "permission": "view_communication"},
    {"path": "/communication", "label": "Campus Chat", "icon": "Chat", "permission": "view_communication"},
    {"path": "/groups", "label": "Study Groups", "icon": "Groups", "permission": "view_groups"},
    {"path": "/events", "label": "Events", "icon": "Events", "permission": "view_events"},
    {"path": "/lost-found", "label": "Lost & Found", "icon": "LostFound", "permission": "view_lost_found"},

    # ══════════════════════════════════════════════════════════════════════════
    # STUDENT-ONLY: Personal
    # Only visible to students (and super_admin)
    # ══════════════════════════════════════════════════════════════════════════
    {"section": "Personal", "permission": "view_saved"},
    {"path": "/saved", "label": "Saved Content", "icon": "Saved", "permission": "view_saved"},

    # ══════════════════════════════════════════════════════════════════════════
    # FACULTY: Teaching & Management
    # Only visible to faculty (and super_admin)
    # ══════════════════════════════════════════════════════════════════════════
    {"section": "Teaching", "permission": "manage_students"},
    {"path": "/faculty/dashboard", "label": "Faculty Dashboard", "icon": "Dashboard", "permission": "manage_students"},
    {"path": "/faculty/students", "label": "Student Management", "icon": "Users", "permission": "manage_students"},
    {"path": "/faculty/attendance", "label": "Attendance Management", "icon": "Attendance", "permission": "manage_attendance"},
    {"path": "/faculty/assignments", "label": "Assignment Management", "icon": "Assignments", "permission": "create_assignments"},
    {"path": "/faculty/grades", "label": "Grading", "icon": "Academic", "permission": "grade_assignments"},
    {"path": "/faculty/analytics", "label": "Academic Analytics", "icon": "Analytics", "permission": "view_faculty_analytics"},
    {"path": "/faculty/announcements", "label": "Announcements", "icon": "News", "permission": "create_announcements"},

    # Faculty shared features (separate from student versions)
    {"section": "Faculty Tools", "permission": "faculty_view_communication"},
    {"path": "/faculty/chat", "label": "Faculty Chat", "icon": "Chat", "permission": "faculty_view_communication"},
    {"path": "/faculty/groups", "label": "Study Group Oversight", "icon": "Groups", "permission": "faculty_view_groups"},
    {"path": "/faculty/resources", "label": "Resources Upload", "icon": "Resources", "permission": "faculty_view_resources"},
    {"path": "/faculty/events", "label": "Event Management", "icon": "Events", "permission": "faculty_view_events"},

    # ══════════════════════════════════════════════════════════════════════════
    # MODERATOR: Content Moderation
    # Only visible to moderators (and super_admin)
    # ══════════════════════════════════════════════════════════════════════════
    {"section": "Moderation", "permission": "view_reports"},
    {"path": "/moderator/dashboard", "label": "Moderator Dashboard", "icon": "Dashboard", "permission": "view_reports"},
    {"path": "/moderator/channels", "label": "Channel Requests", "icon": "Chat", "permission": "moderate_channels"},
    {"path": "/moderator/roadmaps", "label": "Roadmap Reviews", "icon": "Roadmap", "permission": "moderate_roadmaps"},
    {"path": "/moderator/reports", "label": "Content Reports", "icon": "Audit", "permission": "view_reports"},
    {"path": "/moderator/groups", "label": "Study Group Moderation", "icon": "Groups", "permission": "moderate_groups"},
    {"path": "/moderator/chat", "label": "Chat Moderation", "icon": "Chat", "permission": "moderate_chat"},
    {"path": "/moderator/notes", "label": "Notes Moderation", "icon": "Notes", "permission": "moderate_notes"},
    {"path": "/moderator/analytics", "label": "Moderation Analytics", "icon": "Analytics", "permission": "view_moderation_analytics"},

    # ══════════════════════════════════════════════════════════════════════════
    # ADMIN: Platform Administration
    # Only visible to admins (and super_admin)
    # ══════════════════════════════════════════════════════════════════════════
    {"section": "Administration", "permission": "manage_users"},
    {"path": "/admin/dashboard", "label": "Admin Dashboard", "icon": "Dashboard", "permission": "manage_users"},
    {"path": "/admin/users", "label": "User Management", "icon": "Users", "permission": "manage_users"},
    {"path": "/admin/departments", "label": "Departments", "icon": "Groups", "permission": "manage_departments"},
    {"path": "/admin/sections", "label": "Sections", "icon": "Assignments", "permission": "manage_sections"},
    {"path": "/admin/analytics", "label": "Analytics & Reports", "icon": "Analytics", "permission": "view_admin_analytics"},
    {"path": "/admin/moderation", "label": "Moderation Overview", "icon": "Audit", "permission": "admin_moderation_overview"},
    {"path": "/admin/academic", "label": "Academic Overview", "icon": "Academic", "permission": "admin_academic_overview"},
    {"path": "/admin/events", "label": "Events", "icon": "Events", "permission": "manage_events"},
    {"path": "/admin/announcements", "label": "Announcements", "icon": "News", "permission": "manage_notifications"},
    {"path": "/admin/study-groups", "label": "Study Groups", "icon": "Groups", "permission": "manage_communication"},
    {"path": "/admin/channels", "label": "Channels", "icon": "Chat", "permission": "manage_communication"},
    {"path": "/admin/placement", "label": "Placement", "icon": "Placement", "permission": "view_admin_analytics"},
    {"path": "/admin/resources", "label": "Resources", "icon": "Resources", "permission": "manage_resources"},
    {"path": "/admin/notifications", "label": "Notifications", "icon": "Notifications", "permission": "manage_notifications"},
    {"path": "/admin/audit", "label": "Audit Logs", "icon": "Audit", "permission": "view_audit_logs"},

    # ══════════════════════════════════════════════════════════════════════════
    # SUPER ADMIN: System & Infrastructure
    # Only visible to super_admin
    # ══════════════════════════════════════════════════════════════════════════
    {"section": "System", "permission": "manage_server"},
    {"path": "/admin/system", "label": "System Monitoring", "icon": "Analytics", "permission": "manage_server"},
    {"path": "/admin/rbac", "label": "RBAC Control", "icon": "Audit", "permission": "manage_rbac"},
    {"path": "/admin/audit", "label": "Audit Logs", "icon": "Audit", "permission": "view_audit_logs"},
    {"path": "/admin/docker", "label": "Docker Status", "icon": "Code", "permission": "view_docker_status"},
    {"path": "/admin/redis", "label": "Redis Status", "icon": "Code", "permission": "view_redis_status"},
    {"path": "/admin/celery", "label": "Celery Status", "icon": "Code", "permission": "view_celery_status"},
    {"path": "/admin/api-health", "label": "API Health", "icon": "Analytics", "permission": "view_api_health"},
    {"path": "/admin/database", "label": "Database Analytics", "icon": "Analytics", "permission": "view_database_analytics"},

    # ══════════════════════════════════════════════════════════════════════════
    # SETTINGS (all roles)
    # ══════════════════════════════════════════════════════════════════════════
    {"section": "Settings"},
    {"path": "/settings", "label": "Settings", "icon": "Settings", "permission": "view_settings"},
]


def get_user_permissions(user):
    """
    Get the effective permissions for a user.
    Combines role-based defaults with any per-user overrides.
    """
    if not user or not user.is_authenticated:
        return []

    role = user.role
    base_permissions = list(ROLE_PERMISSIONS.get(role, []))

    # Check for per-user permission overrides (stored in user profile or separate model)
    # This allows Super Admin to grant/revoke specific permissions per user
    extra_permissions = getattr(user, "_extra_permissions", None)
    if extra_permissions:
        for perm in extra_permissions.get("grant", []):
            if perm not in base_permissions:
                base_permissions.append(perm)
        for perm in extra_permissions.get("revoke", []):
            if perm in base_permissions:
                base_permissions.remove(perm)

    return base_permissions


def get_user_modules(user):
    """Get the list of modules a user can access based on their permissions."""
    permissions = get_user_permissions(user)
    accessible = []
    for module_id, config in MODULE_REGISTRY.items():
        required = config["permissions"]
        if any(p in permissions for p in required):
            accessible.append(module_id)
    return accessible


def get_user_sidebar(user):
    """Get the filtered sidebar navigation for a user."""
    permissions = get_user_permissions(user)
    sidebar = []
    current_section_visible = True

    for item in SIDEBAR_CONFIG:
        if "section" in item:
            # Section headers: show if user has the section permission (or no permission required)
            section_perm = item.get("permission")
            current_section_visible = (not section_perm) or (section_perm in permissions)
            if current_section_visible:
                sidebar.append({"section": item["section"]})
        elif "path" in item:
            perm = item.get("permission")
            if perm and perm in permissions and current_section_visible:
                sidebar.append({
                    "path": item["path"],
                    "label": item["label"],
                    "icon": item["icon"],
                })

    return sidebar


def get_user_widgets(user):
    """Get dashboard widgets for a user based on their role."""
    return DASHBOARD_WIDGETS.get(user.role, DASHBOARD_WIDGETS["student"])


def get_dashboard_config(user):
    """
    Get the complete dashboard configuration for a user.
    This is the main API response that drives the entire frontend.
    """
    permissions = get_user_permissions(user)
    return {
        "role": user.role,
        "permissions": permissions,
        "modules": get_user_modules(user),
        "sidebar": get_user_sidebar(user),
        "widgets": get_user_widgets(user),
        "scope": _get_user_scope(user),
    }


def _get_user_scope(user):
    """Get the user's access scope (section/department restrictions)."""
    scope = {
        "type": "global" if user.role in ("admin", "super_admin") else "self",
        "sections": [],
        "branches": [],
        "department": "",
    }

    if user.role == "faculty":
        profile = getattr(user, "faculty_profile", None)
        if profile:
            scope["type"] = "section"
            scope["sections"] = profile.sections_assigned or []
            scope["branches"] = profile.branches_assigned or []

    elif user.role == "moderator":
        profile = getattr(user, "moderator_profile", None)
        if profile:
            scope["type"] = profile.scope
            if profile.section:
                scope["sections"] = [profile.section]
            if profile.branch:
                scope["branches"] = [profile.branch]
            scope["department"] = profile.department or ""

    return scope
