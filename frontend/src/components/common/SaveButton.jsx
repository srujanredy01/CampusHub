/**
 * Reusable Save/Bookmark button component with real-time sync.
 * Drop this into any module to add save functionality.
 *
 * Props:
 *   - contentType: "coding_problem" | "news_article" | "resource" | "assignment" | "contest" | "roadmap"
 *   - objectId: UUID of the item to save
 *   - size: "sm" | "md" | "lg" (default: "md")
 *   - variant: "icon" | "button" | "text" (default: "icon")
 *   - className: additional CSS classes
 */
import { useSaveToggle } from "../../hooks/useSaveToggle";

export default function SaveButton({
  contentType,
  objectId,
  size = "md",
  variant = "icon",
  className = "",
}) {
  const { isSaved, isLoading, toggle } = useSaveToggle(contentType, objectId);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const buttonSizes = {
    sm: "p-1",
    md: "p-1.5",
    lg: "p-2",
  };

  if (variant === "button") {
    return (
      <button
        onClick={toggle}
        disabled={isLoading}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
          isSaved
            ? "bg-primary-50 text-primary-700 hover:bg-primary-100"
            : "bg-surface-100 text-surface-600 hover:bg-surface-200"
        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      >
        <svg
          className={sizeClasses[size]}
          viewBox="0 0 24 24"
          fill={isSaved ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        {isSaved ? "Saved" : "Save"}
      </button>
    );
  }

  if (variant === "text") {
    return (
      <button
        onClick={toggle}
        disabled={isLoading}
        className={`text-sm font-medium transition-colors ${
          isSaved
            ? "text-primary-600 hover:text-primary-700"
            : "text-surface-500 hover:text-surface-700"
        } ${isLoading ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      >
        {isSaved ? "Saved ✓" : "Save"}
      </button>
    );
  }

  // Default: icon variant
  return (
    <button
      onClick={toggle}
      disabled={isLoading}
      className={`${buttonSizes[size]} rounded-lg transition-all ${
        isSaved
          ? "text-primary-600 hover:text-primary-700 hover:bg-primary-50"
          : "text-surface-400 hover:text-primary-600 hover:bg-primary-50"
      } ${isLoading ? "opacity-50 cursor-not-allowed animate-pulse" : ""} ${className}`}
      title={isSaved ? "Remove from saved" : "Save for later"}
    >
      <svg
        className={sizeClasses[size]}
        viewBox="0 0 24 24"
        fill={isSaved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
