import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-toastify";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/password-reset/", { email });
      setSent(true);
    } catch (err) {
      toast.error("Failed to send reset email. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-bold text-surface-900">Reset password</h1>
          <p className="mt-2 text-sm text-surface-500">
            {sent ? "Check your email for a reset link" : "Enter your email to receive a reset link"}
          </p>
        </div>

        {sent ? (
          <div className="card-padded text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-success-50 flex items-center justify-center mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p className="text-sm text-surface-600">We've sent a password reset link to <strong>{email}</strong></p>
            <Link to="/login" className="btn-primary w-full justify-center">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="input-label">Email address</label>
              <input type="email" className="input" placeholder="you@university.edu"
                value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? "Sending..." : "Send reset link"}
            </button>
            <p className="text-center text-sm text-surface-500">
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
