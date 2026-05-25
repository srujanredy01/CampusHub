/**
 * Skeleton loading components for CampusHub.
 * All components use the .skeleton CSS class from index.css.
 */

// ── Base skeleton block ───────────────────────────────────────────────────────
export function SkeletonBlock({ className = "" }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

// ── Card skeleton ─────────────────────────────────────────────────────────────
export function SkeletonCard({ lines = 3, hasIcon = true }) {
  return (
    <div className="card animate-pulse" aria-hidden="true">
      <div className="flex items-start gap-3 mb-4">
        {hasIcon && <SkeletonBlock className="w-10 h-10 rounded-xl flex-shrink-0" />}
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-4 w-3/4" />
          <SkeletonBlock className="h-3 w-1/2" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          className={`h-3 mb-2 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

// ── Stat card skeleton ────────────────────────────────────────────────────────
export function SkeletonStatCard() {
  return (
    <div className="card animate-pulse" aria-hidden="true">
      <div className="flex items-start justify-between mb-3">
        <SkeletonBlock className="w-10 h-10 rounded-xl" />
      </div>
      <SkeletonBlock className="h-7 w-16 mb-2" />
      <SkeletonBlock className="h-3 w-24" />
    </div>
  );
}

// ── Table row skeleton ────────────────────────────────────────────────────────
export function SkeletonTableRow({ cols = 4 }) {
  return (
    <tr className="animate-pulse" aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="td">
          <SkeletonBlock className={`h-4 ${i === 0 ? "w-32" : "w-20"}`} />
        </td>
      ))}
    </tr>
  );
}

// ── List item skeleton ────────────────────────────────────────────────────────
export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-3 p-4 animate-pulse" aria-hidden="true">
      <SkeletonBlock className="w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-1/2" />
      </div>
      <SkeletonBlock className="w-16 h-6 rounded-full" />
    </div>
  );
}

// ── Page header skeleton ──────────────────────────────────────────────────────
export function SkeletonPageHeader() {
  return (
    <div className="mb-6 animate-pulse" aria-hidden="true">
      <SkeletonBlock className="h-7 w-48 mb-2" />
      <SkeletonBlock className="h-4 w-72" />
    </div>
  );
}

// ── Grid of cards skeleton ────────────────────────────────────────────────────
export function SkeletonGrid({ count = 6, cols = "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" }) {
  return (
    <div className={`grid ${cols} gap-4`} aria-label="Loading content" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

// ── Notification item skeleton ────────────────────────────────────────────────
export function SkeletonNotification() {
  return (
    <div className="flex items-start gap-3.5 p-4 rounded-2xl border border-surface-100 animate-pulse" aria-hidden="true">
      <SkeletonBlock className="w-9 h-9 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-1/3" />
      </div>
    </div>
  );
}
