import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signup } from "../store/slices/authSlice";
import { toast } from "react-toastify";

const EyeIcon = ({ open }) => open
  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
  : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

const ALLOWED_DOMAINS = ["@gmail.com", "@lpu.in"];

export default function SignupPage() {
  const [form, setForm] = useState({
    full_name: "", student_id: "", email: "", branch: "",
    semester: "", section: "", password: "", password_confirm: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailError, setEmailError] = useState("");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, isAuthenticated, user } = useSelector((s) => s.auth);

  // Redirect already-authenticated users away from signup
  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === "admin" ? "/admin/dashboard" : "/dashboard", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const validateEmail = (value) => {
    const valid = ALLOWED_DOMAINS.some((d) => value.toLowerCase().endsWith(d));
    setEmailError(value && !valid ? "Only @gmail.com or @lpu.in addresses are accepted." : "");
    return valid;
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail(form.email)) return toast.error("Please use a @gmail.com or @lpu.in email address.");
    if (form.password !== form.password_confirm) return toast.error("Passwords do not match.");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (!form.semester) return toast.error("Please select your academic year.");

    const result = await dispatch(signup(form));
    if (signup.fulfilled.match(result)) {
      toast.success("Account created successfully. You can now sign in.");
      navigate("/login");
    } else {
      const errs = result.payload;
      if (typeof errs === "object" && errs !== null) {
        Object.values(errs).flat().forEach((m) => toast.error(m));
      } else {
        toast.error(errs || "Registration failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-surface-50">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-5/12 bg-dark-gradient relative overflow-hidden flex-col justify-center p-12">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-accent-violet/20 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-white font-bold text-xl">CampusHub</span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight mb-4">
            Join thousands of students on CampusHub.
          </h2>
          <p className="text-slate-300 leading-relaxed">
            Create your account to access academic resources, coding practice, campus news, and more.
          </p>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 overflow-y-auto">
        <div className="w-full max-w-lg animate-fade-up py-6">
          <div className="flex items-center gap-2 mb-6 lg:hidden">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-accent-violet flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
            <span className="font-bold text-slate-900 text-lg">CampusHub</span>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h1>
            <p className="text-slate-500 mt-1.5 text-sm">Fill in your details to get started.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="input-label">Full Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="As per university records"
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                required
              />
            </div>

            {/* Student ID + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Student ID</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="input-field"
                  placeholder="e.g. 12210001"
                  value={form.student_id}
                  onChange={(e) => set("student_id", e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>
              <div>
                <label className="input-label">Email Address</label>
                <input
                  type="email"
                  className={`input-field ${emailError ? "input-error" : ""}`}
                  placeholder="you@gmail.com"
                  value={form.email}
                  onChange={(e) => { set("email", e.target.value); validateEmail(e.target.value); }}
                  required
                />
                {emailError && <p className="input-error-msg">{emailError}</p>}
              </div>
            </div>

            {/* Branch + Section */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Branch / Program</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. CSE, ECE, ME"
                  value={form.branch}
                  onChange={(e) => set("branch", e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="input-label">Section</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. A, B, K23"
                  value={form.section}
                  onChange={(e) => set("section", e.target.value)}
                />
              </div>
            </div>

            {/* Academic year */}
            <div>
              <label className="input-label">Academic Year</label>
              <select
                className="input-field"
                value={form.semester}
                onChange={(e) => set("semester", e.target.value)}
                required
              >
                <option value="">Select your current year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>

            {/* Password */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    className="input-field pr-10"
                    placeholder="Min. 8 characters"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                    required
                    minLength={8}
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                    <EyeIcon open={showPwd} />
                  </button>
                </div>
              </div>
              <div>
                <label className="input-label">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    className={`input-field pr-10 ${form.password_confirm && form.password !== form.password_confirm ? "input-error" : ""}`}
                    placeholder="Repeat password"
                    value={form.password_confirm}
                    onChange={(e) => set("password_confirm", e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
                {form.password_confirm && form.password !== form.password_confirm && (
                  <p className="input-error-msg">Passwords do not match.</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-sm rounded-2xl mt-1"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
