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
      case "normal": return "bg-blue-500";
      case "low": return "bg-gray-400";
      default: return "bg-blue-500";
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
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <h3 className="text-sm font-semibold text-gray-900">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-gray-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              items.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${
                    !notification.is_read ? "bg-blue-50/50" : ""
                  }`}
                >
                  {/* Icon */}
                  <span className="text-lg flex-shrink-0 mt-0.5">
                    {getTypeIcon(notification.notification_type)}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate ${!notification.is_read ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(notification.priority)}`} />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTime(notification.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t bg-gray-50 px-4 py-2">
              <button
                onClick={() => { setIsOpen(false); navigate("/notifications"); }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-1"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
