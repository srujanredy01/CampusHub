/**
 * FeedbackButton — Floating action button for opening the feedback panel.
 * Fixed position, bottom-right, subtle but visible.
 */
import { useState } from "react";
import FeedbackPanel from "./FeedbackPanel";

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`
          fixed bottom-6 right-6 z-50
          flex items-center gap-2 px-4 py-2.5
          bg-surface-900 text-white
          rounded-full shadow-lg shadow-surface-900/20
          hover:bg-surface-800 hover:shadow-xl hover:shadow-surface-900/25
          active:scale-95
          transition-all duration-200 ease-out
          group
          ${isOpen ? "opacity-0 pointer-events-none scale-90" : "opacity-100 scale-100"}
        `}
        aria-label="Report issues or give feedback"
        title="Report Issues & Suggestions"
      >
        {/* Icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform group-hover:scale-110"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span className="text-sm font-medium hidden sm:inline">Feedback</span>
      </button>

      {/* Panel */}
      <FeedbackPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
