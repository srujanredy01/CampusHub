import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import api from "../services/api";
import { toast } from "react-toastify";

export default function ProfilePage() {
  const { user } = useSelector((s) => s.auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/profile/");
        setProfile(res.data);
        setForm(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    try {
      const res = await api.patch("/profile/", form);
      setProfile(res.data);
      setEditing(false);
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error("Failed to update profile");
    }
  };

  if (loading) {
    return (
      <div className="page-container space-y-6">
        <div className="skeleton h-48 rounded-xl" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl space-y-6">
      {/* Profile Header */}
      <div className="card-padded">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="avatar-xl text-xl">
            {user?.first_name?.[0] || user?.username?.[0] || "U"}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-surface-900">
              {user?.first_name} {user?.last_name}
            </h1>
            <p className="text-sm text-surface-500">@{user?.username}</p>
            <p className="text-sm text-surface-400 mt-1">{user?.email}</p>
          </div>
          <button onClick={() => setEditing(!editing)} className={editing ? "btn-ghost" : "btn-secondary"}>
            {editing ? "Cancel" : "Edit Profile"}
          </button>
        </div>
      </div>

      {/* Profile Details */}
      <div className="card-padded space-y-5">
        <h3 className="text-base font-semibold text-surface-900">Personal Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="input-label">First Name</label>
            <input type="text" className="input" value={form.first_name || ""} disabled={!editing}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="input-label">Last Name</label>
            <input type="text" className="input" value={form.last_name || ""} disabled={!editing}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="input-label">Phone</label>
            <input type="tel" className="input" value={form.phone || ""} disabled={!editing}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Not set" />
          </div>
          <div className="form-group">
            <label className="input-label">Department</label>
            <input type="text" className="input" value={form.department || ""} disabled={!editing}
              onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Not set" />
          </div>
          <div className="form-group sm:col-span-2">
            <label className="input-label">Bio</label>
            <textarea className="input min-h-[80px] resize-none" value={form.bio || ""} disabled={!editing}
              onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." />
          </div>
        </div>
        {editing && (
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setEditing(false)} className="btn-ghost">Cancel</button>
            <button onClick={handleSave} className="btn-primary">Save Changes</button>
          </div>
        )}
      </div>
    </div>
  );
}
