import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchProfile, updateProfile } from "../store/slices/profileSlice";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/common/LoadingSpinner";

export default function ProfilePage() {
  const dispatch = useDispatch();
  const { data: profile, loading } = useSelector((s) => s.profile);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => { dispatch(fetchProfile()); }, [dispatch]);

  useEffect(() => {
    if (profile) setForm({ bio: profile.bio || "", github_url: profile.github_url || "", linkedin_url: profile.linkedin_url || "" });
  }, [profile]);

  const handleSave = async () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    const result = await dispatch(updateProfile(fd));
    if (updateProfile.fulfilled.match(result)) {
      toast.success("Profile updated!");
      setEditing(false);
    } else {
      toast.error("Update failed");
    }
  };

  if (loading && !profile) return <LoadingSpinner size="lg" className="mt-20" />;
  if (!profile) return <p className="text-gray-500">No profile data.</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {/* Profile card */}
      <div className="card">
        <div className="flex items-start gap-4">
          <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-3xl font-bold text-primary-600 flex-shrink-0">
            {profile.full_name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{profile.full_name}</h2>
            <p className="text-gray-500">{profile.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{profile.branch}</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Sem {profile.semester}</span>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Section {profile.section}</span>
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">ID: {profile.student_id}</span>
            </div>
          </div>
          <button onClick={() => setEditing(!editing)} className="btn-secondary text-sm">
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {editing ? (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea className="input-field" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GitHub URL</label>
              <input type="url" className="input-field" value={form.github_url} onChange={(e) => setForm({ ...form, github_url: e.target.value })} placeholder="https://github.com/..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input type="url" className="input-field" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/..." />
            </div>
            <button onClick={handleSave} disabled={loading} className="btn-primary">Save Changes</button>
          </div>
        ) : (
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            {profile.bio && <p>{profile.bio}</p>}
            {profile.github_url && <a href={profile.github_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline block">🔗 GitHub</a>}
            {profile.linkedin_url && <a href={profile.linkedin_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline block">🔗 LinkedIn</a>}
          </div>
        )}
      </div>

      {/* Coding stats */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Coding Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { label: "Total Solved", value: profile.total_questions_solved, cls: "bg-blue-50",   val: "text-blue-600",   lbl: "text-blue-700" },
            { label: "Easy",         value: profile.easy_solved,            cls: "bg-green-50",  val: "text-green-600",  lbl: "text-green-700" },
            { label: "Medium",       value: profile.medium_solved,          cls: "bg-yellow-50", val: "text-yellow-600", lbl: "text-yellow-700" },
            { label: "Hard",         value: profile.hard_solved,            cls: "bg-red-50",    val: "text-red-600",    lbl: "text-red-700" },
          ].map((s) => (
            <div key={s.label} className={`p-3 ${s.cls} rounded-xl`}>
              <p className={`text-2xl font-bold ${s.val}`}>{s.value}</p>
              <p className={`text-sm ${s.lbl}`}>{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-3">Total submissions: {profile.total_submissions}</p>
      </div>
    </div>
  );
}
