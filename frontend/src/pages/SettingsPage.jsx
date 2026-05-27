import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setUser } from "../store/slices/authSlice";
import api from "../services/api";
import { toast } from "react-toastify";

const TABS = [
  { id: "account", label: "Account" },
  { id: "password", label: "Password" },
  { id: "notifications", label: "Notifications" },
  { id: "appearance", label: "Appearance" },
  { id: "privacy", label: "Privacy" },
];

export default function SettingsPage() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("account");
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ current: "", new_password: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) setForm({ first_name: user.first_name || "", last_name: user.last_name || "", email: user.email || "" });
  }, [user]);

  const handleAccountSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch("/profile/", form);
      dispatch(setUser({ ...user, ...res.data }));
      toast.success("Account updated");
    } catch { toast.error("Failed to update"); }
    finally { setSaving(false); }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new_password !== passwordForm.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setSaving(true);
    try {
      await api.post("/settings/change-password/", { old_password: passwordForm.current, new_password: passwordForm.new_password });
      toast.success("Password changed");
      setPasswordForm({ current: "", new_password: "", confirm: "" });
    } catch { toast.error("Failed to change password"); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-container max-w-4xl space-y-6">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account preferences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar nav */}
        <nav className="md:w-48 flex-shrink-0">
          <div className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible scrollbar-hide">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium text-left whitespace-nowrap transition-colors ${activeTab === tab.id ? "bg-primary-50 text-primary-700" : "text-surface-500 hover:bg-surface-100 hover:text-surface-700"}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "account" && (
            <div className="card-padded space-y-5">
              <h3 className="text-base font-semibold text-surface-900">Account Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="input-label">First Name</label>
                  <input type="text" className="input" value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="input-label">Last Name</label>
                  <input type="text" className="input" value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                </div>
                <div className="form-group sm:col-span-2">
                  <label className="input-label">Email</label>
                  <input type="email" className="input bg-surface-50 cursor-not-allowed" value={form.email} disabled />
                  <p className="input-hint">Email cannot be changed</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={handleAccountSave} disabled={saving} className="btn-primary">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "password" && (
            <div className="card-padded space-y-5">
              <h3 className="text-base font-semibold text-surface-900">Change Password</h3>
              <div className="space-y-4 max-w-sm">
                <div className="form-group">
                  <label className="input-label">Current Password</label>
                  <input type="password" className="input" value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="input-label">New Password</label>
                  <input type="password" className="input" value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="input-label">Confirm New Password</label>
                  <input type="password" className="input" value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button onClick={handlePasswordChange} disabled={saving} className="btn-primary">
                  {saving ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="card-padded space-y-5">
              <h3 className="text-base font-semibold text-surface-900">Notification Preferences</h3>
              <div className="space-y-4">
                {["Email notifications", "Push notifications", "Assignment reminders", "Event updates", "Chat messages"].map((item) => (
                  <div key={item} className="flex items-center justify-between py-2">
                    <span className="text-sm text-surface-700">{item}</span>
                    <div className="toggle-on"><span className="toggle-knob translate-x-4" /></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="card-padded space-y-5">
              <h3 className="text-base font-semibold text-surface-900">Appearance</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-surface-700 mb-2">Theme</p>
                  <div className="flex gap-3">
                    {["Light", "Dark", "System"].map((theme) => (
                      <button key={theme} className="px-4 py-2 rounded-lg border border-surface-200 text-sm font-medium text-surface-600 hover:border-primary-300 hover:text-primary-600 transition-colors">
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="card-padded space-y-5">
              <h3 className="text-base font-semibold text-surface-900">Privacy</h3>
              <div className="space-y-4">
                {["Show profile to other students", "Show attendance stats", "Show coding progress", "Allow direct messages"].map((item) => (
                  <div key={item} className="flex items-center justify-between py-2">
                    <span className="text-sm text-surface-700">{item}</span>
                    <div className="toggle-on"><span className="toggle-knob translate-x-4" /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
