/**
 * Access Denied Page.
 * Shown when a user tries to access a route they don't have permission for.
 * Professional, informative, and does NOT expose backend details.
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function AccessDeniedPage() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-danger-50 rounded-full flex items-center justify-center mb-6">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-danger-500"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-display font-bold text-surface-900 mb-2">
          Access Denied
        </h1>

        {/* Message */}
        <p className="text-surface-500 mb-8 leading-relaxed">
          You do not have permission to access this module.
          If you believe this is an error, please contact your administrator.
        </p>

        {/* User info (non-sensitive) */}
        {user && (
          <p className="text-xs text-surface-400 mb-6">
            Signed in as <span className="font-medium text-surface-600">{user.email}</span>
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleGoBack}
            className="px-5 py-2.5 text-sm font-medium text-surface-700 bg-white border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={handleGoDashboard}
            className="px-5 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
