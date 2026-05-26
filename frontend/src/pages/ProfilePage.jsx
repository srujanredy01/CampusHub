import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import { toast } from "react-toastify";

function ProfilePage() {
  const { user } = useSelector((s) => s.auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get("/profile/");
      setProfile(res.data.data);
      setFormData(res.data.data);
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {};
      const editableFields = [
        "bio", "github_url", "linkedin_url", "leetcode_url",
        "codechef_url", "hackerrank_url", "portfolio_url",
        "cgpa", "advisor", "full_name", "phone",
        "email_notifications", "push_notifications",
        "assignment_reminders", "contest_reminders",
        "profile_public", "show_coding_stats", "show_placement_status",
      ];
      editableFields.forEach((f) => {
        if (formData[f] !== undefined) payload[f] = formData[f];
      });
      const res = await api.put("/profile/", payload);
      setProfile(res.data.data);
      setEditing(false);
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error.response?.data?.errors ? "Validation error" : "Failed to update");
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("profile_image", file);
    try {
      const res = await api.put("/profile/", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setProfile(res.data.data);
      toast.success("Profile image updated");
    } catch {
      toast.error("Failed to upload image");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!profile) return null;

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "coding", label: "Coding Profiles" },
    { id: "achievements", label: "Achievements" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
        <div className="h-32 bg-hero-gradient" />
        <div className="px-6 pb-6 -mt-16">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
            <div className="relative">
              <div className="w-28 h-28 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-gray-100">
                {profile.profile_image ? (
                  <img src={profile.profile_image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-primary-600 bg-primary-50">
                    {profile.full_name?.charAt(0)}
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-primary-700 transition">
                <span className="text-white text-sm">📷</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{profile.full_name}</h1>
              <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-600">
                <span>🎓 {profile.student_id}</span>
                <span>📚 {profile.branch}</span>
                <span>📋 Sem {profile.semester}</span>
                {profile.section && <span>🏷️ Section {profile.section}</span>}
                {profile.batch && <span>📅 Batch {profile.batch}</span>}
              </div>
              <div className="flex gap-2 mt-2 text-sm text-gray-500">
                <span>✉️ {profile.email}</span>
                {profile.phone && <span>📱 {profile.phone}</span>}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none" stroke="#4f46e5" strokeWidth="3"
                    strokeDasharray={`${profile.profile_completion}, 100`} />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary-600">
                  {profile.profile_completion}%
                </span>
              </div>
              <span className="text-xs text-gray-500 mt-1">Complete</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-white text-primary-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Academic */}
          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">📚 Academic</h3>
            <div className="space-y-3">
              <InfoRow label="Semester" value={profile.semester} />
              <InfoRow label="CGPA" value={profile.cgpa || "Not set"} />
              <InfoRow label="Advisor" value={profile.advisor || "Not set"} />
              <InfoRow label="Branch" value={profile.branch} />
            </div>
          </div>

          {/* Coding Stats */}
          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">💻 Coding Stats</h3>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <p className="text-xl font-bold text-green-600">{profile.easy_solved}</p>
                <p className="text-xs text-green-700">Easy</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-xl">
                <p className="text-xl font-bold text-amber-600">{profile.medium_solved}</p>
                <p className="text-xs text-amber-700">Medium</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-xl">
                <p className="text-xl font-bold text-red-600">{profile.hard_solved}</p>
                <p className="text-xs text-red-700">Hard</p>
              </div>
            </div>
            <InfoRow label="Total Solved" value={profile.total_questions_solved} />
            <InfoRow label="Total Submissions" value={profile.total_submissions} />
          </div>

          {/* Bio */}
          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">About</h3>
              <button onClick={() => setEditing(!editing)} className="text-sm text-primary-600 hover:text-primary-700">
                {editing ? "Cancel" : "Edit Profile"}
              </button>
            </div>
            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea rows={3} value={formData.bio || ""}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input type="text" value={formData.full_name || ""}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="text" value={formData.phone || ""}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CGPA</label>
                    <input type="number" step="0.01" value={formData.cgpa || ""}
                      onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advisor</label>
                    <input type="text" value={formData.advisor || ""}
                      onChange={(e) => setFormData({ ...formData, advisor: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
                  </div>
                </div>
                <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-medium">
                  Save Changes
                </button>
              </div>
            ) : (
              <p className="text-gray-600">{profile.bio || "No bio added yet. Click Edit Profile to add one."}</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "coding" && (
        <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Coding Profiles</h3>
          {editing ? (
            <div className="space-y-4">
              {[
                { key: "github_url", label: "GitHub", icon: "🐙" },
                { key: "linkedin_url", label: "LinkedIn", icon: "💼" },
                { key: "leetcode_url", label: "LeetCode", icon: "🧩" },
                { key: "codechef_url", label: "CodeChef", icon: "👨‍🍳" },
                { key: "hackerrank_url", label: "HackerRank", icon: "💚" },
                { key: "portfolio_url", label: "Portfolio", icon: "🌐" },
              ].map(({ key, label, icon }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{icon} {label}</label>
                  <input type="url" value={formData[key] || ""}
                    onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                    placeholder={`https://${label.toLowerCase()}.com/...`}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500" />
                </div>
              ))}
              <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-medium">
                Save
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { key: "github_url", label: "GitHub", icon: "🐙" },
                { key: "linkedin_url", label: "LinkedIn", icon: "💼" },
                { key: "leetcode_url", label: "LeetCode", icon: "🧩" },
                { key: "codechef_url", label: "CodeChef", icon: "👨‍🍳" },
                { key: "hackerrank_url", label: "HackerRank", icon: "💚" },
                { key: "portfolio_url", label: "Portfolio", icon: "🌐" },
              ].map(({ key, label, icon }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-700">{icon} {label}</span>
                  {profile[key] ? (
                    <a href={profile[key]} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-primary-600 hover:underline truncate max-w-[200px]">
                      {profile[key].replace(/https?:\/\/(www\.)?/, "")}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-400">Not linked</span>
                  )}
                </div>
              ))}
              <button onClick={() => setEditing(true)} className="mt-4 text-sm text-primary-600 hover:text-primary-700">
                Edit Coding Profiles
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "achievements" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">🏆 Badges</h3>
            {profile.achievements?.length > 0 ? (
              <div className="space-y-2">
                {profile.achievements.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-amber-50 rounded-lg">
                    <span className="text-xl">🏅</span>
                    <span className="text-sm font-medium text-gray-700">{a}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No achievements yet. Keep coding!</p>
            )}
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">📜 Certificates</h3>
            {profile.certificates?.length > 0 ? (
              <div className="space-y-2">
                {profile.certificates.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                    <span className="text-xl">📄</span>
                    <span className="text-sm font-medium text-gray-700">{typeof c === "string" ? c : c.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No certificates added yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100 space-y-6">
          <h3 className="font-semibold text-gray-900">Settings</h3>
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Notifications</h4>
            <div className="space-y-3">
              <ToggleSetting label="Email Notifications" value={formData.email_notifications}
                onChange={(v) => setFormData({ ...formData, email_notifications: v })} />
              <ToggleSetting label="Push Notifications" value={formData.push_notifications}
                onChange={(v) => setFormData({ ...formData, push_notifications: v })} />
              <ToggleSetting label="Assignment Reminders" value={formData.assignment_reminders}
                onChange={(v) => setFormData({ ...formData, assignment_reminders: v })} />
              <ToggleSetting label="Contest Reminders" value={formData.contest_reminders}
                onChange={(v) => setFormData({ ...formData, contest_reminders: v })} />
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Privacy</h4>
            <div className="space-y-3">
              <ToggleSetting label="Public Profile" value={formData.profile_public}
                onChange={(v) => setFormData({ ...formData, profile_public: v })} />
              <ToggleSetting label="Show Coding Stats" value={formData.show_coding_stats}
                onChange={(v) => setFormData({ ...formData, show_coding_stats: v })} />
              <ToggleSetting label="Show Placement Status" value={formData.show_placement_status}
                onChange={(v) => setFormData({ ...formData, show_placement_status: v })} />
            </div>
          </div>
          <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-medium">
            Save Settings
          </button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function ToggleSetting({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition ${value ? "bg-primary-600" : "bg-gray-300"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

export default ProfilePage;
