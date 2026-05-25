import React, { useState } from "react";
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
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      // Always show the same message to avoid email enumeration
      setSent(true);
      // Log for debugging but don't expose to user
      console.error("Forgot password error:", err.response?.status);
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-2">🔑</div>
          <h1 className="text-2xl font-bold text-gray-900">Forgot Password</h1>
          <p className="text-gray-500 text-sm">Enter your email to receive a reset link</p>
        </div>
        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-emerald-600">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="text-gray-700 font-medium">Check your email</p>
            <p className="text-gray-500 text-sm">If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly.</p>
            <Link to="/login" className="btn-primary inline-block mt-2">Back to Login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@gmail.com"
                autoComplete="email"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending…
                </span>
              ) : "Send Reset Link"}
            </button>
            <p className="text-center text-sm"><Link to="/login" className="text-primary-600 hover:underline">Back to Login</Link></p>
          </form>
        )}
      </div>
    </div>
  );
}
