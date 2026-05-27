/**
 * Saved content badge for navbar — shows live count with real-time updates.
 * Displays the total number of saved items with a bookmark icon.
 */
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

export default function SavedBadge({ className = "" }) {
  const { counts } = useSelector((s) => s.saved);
  const total = counts.total || 0;

  return (
    <Link
      to="/saved"
      className={`relative inline-flex items-center p-2 rounded-lg text-surface-500 hover:text-primary-600 hover:bg-primary-50 transition-all ${className}`}
      title="Saved Content"
    >
      <svg
        className="w-5 h-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {total > 0 && (
        <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-primary-600 text-white ring-2 ring-white">
          {total > 99 ? "99+" : total}
        </span>
      )}
    </Link>
  );
}
