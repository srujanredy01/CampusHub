import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signup } from "../store/slices/authSlice";

export default function SignupPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({
    username: "", email: "", first_name: "", last_name: "", password: "", password2: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(signup(form));
    if (result.meta.requestStatus === "fulfilled") {
      navigate("/verify-email", { state: { email: form.email } });
    }
  };

  const updateField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="min-h-screen flex">
      {/* Left — Branding */}
      <div className="hidden lg:flex lg:w-[45%] bg-hero-dark relative overflow-hidden">
        <div className="absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)", backgroundSize: "32px 32px" }}
        />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <h1 className="text-4xl font-display font-bold tracking-tight">CampusHub</h1>
            <p className="mt-2 text-white/60 text-base">Your academic ecosystem</p>
          </div>
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white/90">Join thousands of students</h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Access resources, track your academic progress, collaborate with peers,
              and prepare for your career — all in one place.
            </p>
          </div>
          <p className="text-white/40 text-xs">Built for modern campuses</p>
        </div>
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <h1 className="text-2xl font-display font-bold text-surface-900">CampusHub</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-display font-bold text-surface-900">Create account</h2>
            <p className="mt-1.5 text-sm text-surface-500">Get started with your campus journey</p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-danger-50 border border-danger-100 rounded-lg text-sm text-danger-700">
              {typeof error === "string" ? error : "Registration failed. Please check your details."}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="form-group">
                <label className="input-label">First name</label>
                <input type="text" className="input" placeholder="John" value={form.first_name} onChange={updateField("first_name")} required />
              </div>
              <div className="form-group">
                <label className="input-label">Last name</label>
                <input type="text" className="input" placeholder="Doe" value={form.last_name} onChange={updateField("last_name")} required />
              </div>
            </div>

            <div className="form-group">
              <label className="input-label">Username</label>
              <input type="text" className="input" placeholder="johndoe" value={form.username} onChange={updateField("username")} required />
            </div>

            <div className="form-group">
              <label className="input-label">Email</label>
              <input type="email" className="input" placeholder="john@university.edu" value={form.email} onChange={updateField("email")} required />
            </div>

            <div className="form-group">
              <label className="input-label">Password</label>
              <input type="password" className="input" placeholder="Min 8 characters" value={form.password} onChange={updateField("password")} required minLength={8} />
            </div>

            <div className="form-group">
              <label className="input-label">Confirm password</label>
              <input type="password" className="input" placeholder="Re-enter password" value={form.password2} onChange={updateField("password2")} required />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-surface-500">
            Already have an account?{" "}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
