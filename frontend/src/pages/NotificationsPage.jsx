import { useEffect, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchNotifications,
  markAllRead,
  markNotificationRead,
  deleteNotification,
} from "../store/slices/notificationSlice";
import { useNotificationWebSocket } from "../hooks/useNotificationWebSocket";

const TYPE_ICONS = {
  new_resource: "📚",
  campus_news: "📰",
  coding_reminder: "💻",
  coding_contest: "🏆",
  system: "⚙️",
  academic: "🎓",
  placement: "💼",
  event: "🎉",
  reminder: "⏰",
  alert: "⚠️",
  attendance: "📋",
  study_group: "👥",
  maintenance: "🔧",
};

const TYPE_LABELS = {
  new_resource: "Resource",
  campus_news: "Announcement",
  coding_reminder: "Coding",
  coding_contest: "Contest",
  system: "System",
  academic: "Academic",
  placement: "Placement",
  event: "Event",
  reminder: "Reminder",
  alert: "Alert",
  attendance: "Attendance",
  study_group: "Study Group",
  maintenance: "Maintenance",
};

const PRIORITY_COLORS = {
  critical: "border-l-4 border-l-red-500",
  high: "border-l-4 border-l-orange-400",
  normal: "",
  low: "",
};

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function NotifItem({ notif, onRead, onDelete }) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl transition-all duration-150 ${PRIORITY_COLORS[notif.priority] || ""} ${notif.is_read ? "hover:bg-surface-50 bg-white" : "bg-primary-50/40 border border-primary-100/50 shadow-sm"}`}>
      <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center flex-shrink-0 text-lg">
        {TYPE_ICONS[notif.notification_type] || "🔔"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h4 className={`text-sm ${notif.is_read ? "text-surface-700" : "text-surface-900 font-semibold"}`}>
            {notif.title}
          </h4>
          {!notif.is_read && (
            <span className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
          )}
        </div>
        <p className={`text-sm ${notif.is_read ? "text-surface-500" : "text-surface-600"} line-clamp-2`}>
          {notif.message}
        </p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs text-surface-400 font-medium">
            {formatRelativeTime(notif.created_at)}
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium bg-surface-100 text-surface-500">
            {TYPE_LABELS[notif.notification_type] || notif.notification_type}
          </span>
          {notif.priority === "high" || notif.priority === "critical" ? (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium ${notif.priority === "critical" ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"}`}>
              {notif.priority}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {!notif.is_read && (
          <button onClick={() => onRead(notif.id)} className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" title="Mark as read">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          </button>
        )}
        <button onClick={() => onDelete(notif.id)} className="p-1.5 rounded-lg text-surface-300 hover:text-danger-500 hover:bg-danger-50 transition-colors" title="Delete">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const { items, unreadCount, loading } = useSelector((s) => s.notifications);
  const { markReadViaWS, markAllReadViaWS } = useNotificationWebSocket();
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => { dispatch(fetchNotifications()); }, [dispatch]);

  const handleRead = useCallback((id) => {
    dispatch(markNotificationRead([id]));
    markReadViaWS(id);
  }, [dispatch, markReadViaWS]);

  const handleDelete = useCallback((id) => {
    dispatch(deleteNotification(id));
  }, [dispatch]);

  const handleMarkAll = useCallback(() => {
    dispatch(markAllRead());
    markAllReadViaWS();
  }, [dispatch, markAllReadViaWS]);

  // Apply filters
  let filtered = items || [];
  if (filter === "unread") filtered = filtered.filter((n) => !n.is_read);
  else if (filter === "read") filtered = filtered.filter((n) => n.is_read);

  if (typeFilter !== "all") {
    filtered = filtered.filter((n) => n.notification_type === typeFilter);
  }

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Get unique notification types for filter
  const availableTypes = [...new Set((items || []).map((n) => n.notification_type))];

  if (loading && (!items || items.length === 0)) {
    return (
      <div className="page-container max-w-3xl space-y-4">
        <div className="skeleton h-12 w-48 rounded-lg" />
        <div className="skeleton h-10 w-full rounded-lg" />
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"} · {(items || []).length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAll} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex bg-surface-100 rounded-lg p-0.5">
          {[
            { id: "all", label: "All", count: (items || []).length },
            { id: "unread", label: "Unread", count: unreadCount },
            { id: "read", label: "Read", count: (items || []).length - unreadCount },
          ].map((t) => (
            <button key={t.id} onClick={() => { setFilter(t.id); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${filter === t.id ? "bg-white text-surface-900 shadow-sm" : "text-surface-500 hover:text-surface-700"}`}>
              {t.label}
              {t.count > 0 && <span className="ml-1 text-surface-400">({t.count})</span>}
            </button>
          ))}
        </div>

        {/* Type filter */}
        {availableTypes.length > 1 && (
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="text-xs border border-surface-200 rounded-lg px-2.5 py-1.5 bg-white text-surface-600 focus:ring-2 focus:ring-primary-100 focus:border-primary-300 outline-none"
          >
            <option value="all">All types</option>
            {availableTypes.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>
            ))}
          </select>
        )}
      </div>

      {/* Notification List */}
      {paginatedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <p className="text-base font-medium text-surface-700">No notifications</p>
          <p className="text-sm text-surface-400 mt-1">
            {filter === "unread" ? "You've read all your notifications" : "You're all caught up!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {paginatedItems.map((notif) => (
            <NotifItem key={notif.id} notif={notif} onRead={handleRead} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-200 text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-xs text-surface-500">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-200 text-surface-600 hover:bg-surface-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
