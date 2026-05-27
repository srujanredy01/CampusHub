import { Link, useLocation } from "react-router-dom";

export default function VerifyEmailPage() {
  const location = useLocation();
  const email = location.state?.email || "your email";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-50">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="1.75">
            <rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22,7 12,13 2,7"/>
          </svg>
        </div>
        <h1 className="text-2xl font-display font-bold text-surface-900">Check your email</h1>
        <p className="mt-2 text-sm text-surface-500 leading-relaxed">
          We've sent a verification link to <strong className="text-surface-700">{email}</strong>. Click the link to activate your account.
        </p>
        <div className="mt-8 space-y-3">
          <Link to="/login" className="btn-primary w-full justify-center">Go to login</Link>
          <p className="text-xs text-surface-400">
            Didn't receive it? Check your spam folder or try signing up again.
          </p>
        </div>
      </div>
    </div>
  );
}
