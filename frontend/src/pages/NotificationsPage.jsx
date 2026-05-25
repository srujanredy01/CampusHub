import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchNotifications,
  markAllRead,
  markNotificationRead,
  deleteNotification,
} from "../store/slices/notificationSlice";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/common/LoadingSpinner";

const TYPE_ICONS = {
  new_resource: "📚",
  campus_news: "📰",
  coding_reminder: "💻",
  coding_contest: "🏆",
  system: "⚙️",
  academic: "🎓",
  placement: "💼",
  event: "📅",
  reminder: "⏰",
  alert: "⚠️",
  attendance: "📋",
  study_group: "👥",
  maintenance: "🔧",
};

const PRIORITY_STYLES = {
  critical: "border-l-red-500 bg-red-50",
  high: "border-l-orange-500 bg-orange-50",
  normal: "border-l-blue-500 bg-blue-50",
  low: "border-l-gray-300 bg-gray-50",
};

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "new_resource", label: "Resources" },
  { value: "campus_news", label: "News" },
  { value: "coding_reminder", label: "Coding" },
  { value: "coding_contest", label: "Contests" },
  { value: "placement", label: "Placement" },
  { value: "attendance", label: "Attendance" },
  { value: "study_group", label: "Groups" },
  { value: "system", label: "System" },
];

export default function NotificationsPage() {
  const dispatch = useDispatch();
  const { items, unreadCount, loading } = useSelector((s) => s.notifications);
  const [filter, setFilter] = useState("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const handleMarkAll = async () => {
    await dispatch(markAllRead());
    toast.success("All marked as read");
  };

  const handleMarkRead = (id) => {
    dispatch(markNotificationRead([id]));
  };

  const handleDelete = (id) => {
    dispatch(deleteNotification(id));
    toast.success("Notification deleted");
  };

  const filteredItems = items.filter((n) => {
    if (filter !== "all" && n.notification_type !== filter) return false;
    if (showUnreadOnly && n.is_read) return false;
    return true;
  });

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAll} className="btn-secondary text-sm">
            Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                filter === opt.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={showUnreadOnly}
            onChange={(e) => setShowUnreadOnly(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Unread only
        </label>
      </div>

      {/* Notification List */}
      {loading ? (
        <LoadingSpinner size="lg" className="mt-10" />
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-2">🔔</p>
          <p>{filter !== "all" || showUnreadOnly ? "No matching notifications" : "No notifications yet"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((n) => (
            <div
              key={n.id}
              className={`card flex items-start gap-3 border-l-4 transition-all ${
                !n.is_read
                  ? PRIORITY_STYLES[n.priority] || PRIORITY_STYLES.normal
                  : "border-l-transparent"
              }`}
            >
              <span className="text-xl flex-shrink-0 mt-0.5">
                {TYPE_ICONS[n.notification_type] || "🔔"}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium truncate ${!n.is_read ? "text-gray-900" : "text-gray-700"}`}>
                    {n.title}
                  </p>
                  {n.priority && n.priority !== "normal" && (
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded capitalize ${
                      n.priority === "critical" ? "bg-red-100 text-red-700" :
                      n.priority === "high" ? "bg-orange-100 text-orange-700" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {n.priority}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                <p className="text-xs text-gray-400 mt-1">{formatTime(n.created_at)}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!n.is_read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                    title="Mark as read"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => handleDelete(n.id)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
