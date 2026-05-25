const sizes = {
  xs: "h-3 w-3 border-[1.5px]",
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-[3px]",
  lg: "h-12 w-12 border-4",
  xl: "h-16 w-16 border-4",
};

export default function LoadingSpinner({ size = "md", className = "", label = "Loading" }) {
  return (
    <div className={`flex items-center justify-center ${className}`} role="status" aria-label={label}>
      <div
        className={`${sizes[size]} animate-spin rounded-full border-surface-200 border-t-primary-600`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Full-page loading screen used during app initialization.
 */
export function PageLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-50 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-violet flex items-center justify-center shadow-lg animate-pulse-soft">
        <span className="text-white font-bold text-xl">C</span>
      </div>
      <LoadingSpinner size="md" />
      <p className="text-sm text-slate-400 font-medium">Loading CampusHub...</p>
    </div>
  );
}
