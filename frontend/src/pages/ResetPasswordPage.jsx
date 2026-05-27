import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-toastify";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const token = searchParams.get("token") || searchParams.get("uid");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) { toast.error("Passwords don't match"); return; }
    setLoading(true);
    try {
      await api.post("/auth/password-reset/confirm/", { token, password: form.password });
      toast.success("Password reset successfully");
      navigate("/login");
    } catch { toast.error("Reset failed. Link may have expired."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-surface-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-bold text-surface-900">Set new password</h1>
          <p className="mt-2 text-sm text-surface-500">Choose a strong password for your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="input-label">New Password</label>
            <input type="password" className="input" placeholder="Min 8 characters" minLength={8}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="input-label">Confirm Password</label>
            <input type="password" className="input" placeholder="Re-enter password"
              value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
            {loading ? "Resetting..." : "Reset password"}
          </button>
          <p className="text-center text-sm text-surface-500">
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">Back to login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
