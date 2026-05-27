import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-50">
      <div className="text-center max-w-md">
        <p className="text-6xl font-display font-bold text-surface-200 mb-4">404</p>
        <h1 className="text-2xl font-display font-bold text-surface-900">Page not found</h1>
        <p className="mt-2 text-sm text-surface-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
          <button onClick={() => window.history.back()} className="btn-secondary">Go back</button>
        </div>
      </div>
    </div>
  );
}
