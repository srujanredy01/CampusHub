/**
 * NotificationBell — Bell icon with unread count badge and dropdown.
 * Used in the main layout header for both students and admins.
 */
import React, { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  markAllRead,
  markNotificationRead,
} from "../../store/slices/notificationSlice";

function NotificationBell() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, unreadCount, loading } = useSelector((s) => s.notifications);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchNotifications());
    }
  }, [isOpen, dispatch]);

  const handleMarkAllRead = () => {
    dispatch(markAllRead());
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      dispatch(markNotificationRead([notification.id]));
    }
    setIsOpen(false);
    navigate("/notifications");
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "critical": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "normal": return "bg-primary-500";
      case "low": return "bg-slate-400";
      default: return "bg-primary-500";
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case "new_resource": return "📚";
      case "campus_news": return "📰";
      case "coding_reminder": return "💻";
      case "coding_contest": return "🏆";
      case "placement": return "💼";
      case "attendance": return "📋";
      case "study_group": return "👥";
      case "alert": return "⚠️";
      case "maintenance": return "🔧";
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
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-surface-100 rounded-xl transition-all duration-150 active:scale-95"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.4)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-float border border-surface-200/80 z-50 overflow-hidden animate-fade-down">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-surface-50/80 border-b border-surface-100">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-2xs font-bold bg-red-50 text-red-600 rounded-full border border-red-100">
                  {unreadCount} new
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary-600 hover:text-primary-700 font-semibold transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-6 text-center">
                <div className="w-5 h-5 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" />
                <p className="text-slate-400 text-sm mt-2">Loading...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🔔</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">No notifications yet</p>
                <p className="text-slate-400 text-xs mt-1">We'll notify you when something arrives</p>
              </div>
            ) : (
              items.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-surface-50 transition-colors duration-150 border-b border-surface-50 last:border-0 ${
                    !notification.is_read ? "bg-primary-50/30" : ""
                  }`}
                >
                  {/* Icon */}
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {getTypeIcon(notification.notification_type)}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate ${!notification.is_read ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(notification.priority)}`} />
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-2xs text-slate-400 mt-1 font-medium">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-surface-100 bg-surface-50/50 px-4 py-2.5">
              <button
                onClick={() => { setIsOpen(false); navigate("/notifications"); }}
                className="w-full text-center text-sm text-primary-600 hover:text-primary-700 font-semibold py-1 transition-colors"
              >
                View all notifications →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
