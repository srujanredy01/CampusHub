/**
 * AdminAlertBell — Real-time alert bell for admin dashboard.
 * Shows user activity alerts with category-based styling.
 */
import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchAdminAlerts,
  markAllAlertsRead,
} from "../../store/slices/notificationSlice";

function AdminAlertBell() {
  const dispatch = useDispatch();
  const { alerts, alertUnreadCount, alertsLoading } = useSelector((s) => s.notifications);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchAdminAlerts({ page_size: 20 }));
    }
  }, [isOpen, dispatch]);

  const handleMarkAllRead = () => {
    dispatch(markAllAlertsRead());
  };

  const getCategoryStyle = (category) => {
    switch (category) {
      case "critical": return { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500" };
      case "security": return { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" };
      case "warning": return { bg: "bg-yellow-100", text: "text-yellow-800", dot: "bg-yellow-500" };
      default: return { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" };
    }
  };

  const getAlertIcon = (alertType) => {
    switch (alertType) {
      case "new_signup": return "👤";
      case "user_login": return "🔑";
      case "failed_login": return "🚫";
      case "multiple_failed_logins": return "🚨";
      case "password_reset": return "🔒";
      case "code_submission": return "💻";
      case "note_upload": return "📝";
      case "attendance_update": return "📋";
      case "cgpa_save": return "📊";
      case "resource_upload": return "📚";
      case "placement_update": return "💼";
      case "group_created": return "👥";
      case "suspicious_activity": return "⚠️";
      case "permission_violation": return "🛡️";
      case "excessive_requests": return "🔥";
      case "profile_change": return "✏️";
      default: return "🔔";
    }
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const filteredAlerts = filter === "all"
    ? alerts
    : alerts.filter((a) => a.category === filter);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Alert Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label={`Admin alerts${alertUnreadCount > 0 ? ` (${alertUnreadCount} unread)` : ""}`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>

        {alertUnreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-orange-500 rounded-full animate-pulse">
            {alertUnreadCount > 99 ? "99+" : alertUnreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 bg-gray-50 border-b">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Activity Alerts
                {alertUnreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                    {alertUnreadCount}
                  </span>
                )}
              </h3>
              {alertUnreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Category Filters */}
            <div className="flex gap-1">
              {["all", "info", "warning", "critical", "security"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-2 py-0.5 text-xs rounded-full capitalize transition-colors ${
                    filter === cat
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Alert List */}
          <div className="max-h-96 overflow-y-auto">
            {alertsLoading && alerts.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
            ) : filteredAlerts.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-gray-500 text-sm">No alerts</p>
              </div>
            ) : (
              filteredAlerts.slice(0, 15).map((alert) => {
                const style = getCategoryStyle(alert.category);
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-0 ${
                      !alert.is_read ? "bg-orange-50/30" : ""
                    }`}
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">
                      {getAlertIcon(alert.alert_type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm truncate ${!alert.is_read ? "font-semibold" : ""} text-gray-900`}>
                          {alert.title}
                        </p>
                        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${style.bg} ${style.text}`}>
                          {alert.category}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{formatTime(alert.created_at)}</span>
                        {alert.user_name && (
                          <span className="text-xs text-gray-500">• {alert.user_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAlertBell;
