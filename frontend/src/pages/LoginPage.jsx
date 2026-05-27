import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../store/slices/authSlice";

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ student_id: "", password: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(form));
    if (result.meta.requestStatus === "fulfilled") {
      const user = result.payload;
      navigate(user?.is_staff ? "/admin/dashboard" : "/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-hero-dark relative overflow-hidden">
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)", backgroundSize: "32px 32px" }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight">
              CampusHub
            </h1>
            <p className="mt-2 text-white/60 text-base">
              Your academic ecosystem
            </p>
          </div>
          <div className="space-y-8">
            <div className="space-y-4">
              {[
                "Unified academic management",
                "Real-time coding platform",
                "Career & placement tracking",
                "Campus-wide collaboration",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                  <span className="text-white/80 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-white/40 text-xs">
            Built for modern campuses
          </p>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="lg:hidden mb-8">
            <h1 className="text-2xl font-display font-bold text-surface-900">CampusHub</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-display font-bold text-surface-900">Welcome back</h2>
            <p className="mt-1.5 text-sm text-surface-500">
              Sign in to continue to your dashboard
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-danger-50 border border-danger-100 rounded-lg text-sm text-danger-700">
              {typeof error === "string" ? error : "Invalid credentials. Please try again."}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="input-label">Student ID or Email</label>
              <input
                type="text"
                className="input"
                placeholder="Enter your student ID"
                value={form.student_id}
                onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <div className="flex items-center justify-between mb-1.5">
                <label className="input-label mb-0">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                className="input"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Signing in...
                </span>
              ) : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-surface-500">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-medium">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
