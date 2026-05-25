import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-6">
      <div className="text-center max-w-md animate-fade-up">
        {/* Illustration */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="w-32 h-32 rounded-full bg-primary-50 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 text-primary-300" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-primary-600 font-bold text-sm">?</span>
          </div>
        </div>

        {/* Text */}
        <p className="text-7xl font-bold gradient-text mb-4">404</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Page not found</h1>
        <p className="text-slate-500 leading-relaxed mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/dashboard" className="btn-primary btn-lg w-full sm:w-auto">
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="btn-secondary btn-lg w-full sm:w-auto"
          >
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
