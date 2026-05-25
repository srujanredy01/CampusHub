/**
 * Reusable page header with title, subtitle, and optional actions.
 */
export default function PageHeader({ title, subtitle, actions, className = "" }) {
  return (
    <div className={`page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
