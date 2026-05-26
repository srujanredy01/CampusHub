import React, { useState, useEffect } from "react";
import { placementService } from "../services/placementService";
import { toast } from "react-toastify";

const STATUS_OPTIONS = [
  { value: "wishlist", label: "Wishlist", color: "bg-gray-100 text-gray-700" },
  { value: "applied", label: "Applied", color: "bg-blue-100 text-blue-700" },
  { value: "oa_scheduled", label: "OA Scheduled", color: "bg-indigo-100 text-indigo-700" },
  { value: "oa_completed", label: "OA Completed", color: "bg-purple-100 text-purple-700" },
  { value: "shortlisted", label: "Shortlisted", color: "bg-cyan-100 text-cyan-700" },
  { value: "interview_round_1", label: "Interview Round 1", color: "bg-amber-100 text-amber-700" },
  { value: "interview_round_2", label: "Interview Round 2", color: "bg-orange-100 text-orange-700" },
  { value: "hr_round", label: "HR Round", color: "bg-pink-100 text-pink-700" },
  { value: "selected", label: "Selected", color: "bg-emerald-100 text-emerald-700" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
  { value: "offer_received", label: "Offer Received", color: "bg-green-100 text-green-700" },
  { value: "joined", label: "Joined", color: "bg-teal-100 text-teal-700" },
];

const JOB_TYPES = [
  { value: "full_time", label: "Full Time" },
  { value: "internship", label: "Internship" },
  { value: "contract", label: "Contract" },
];

function PlacementPage() {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingApp, setEditingApp] = useState(null);
  const [activeTab, setActiveTab] = useState("list");
  const [filterStatus, setFilterStatus] = useState("");
  const [formData, setFormData] = useState({
    company_name: "", role: "", package_lpa: "", status: "wishlist",
    application_date: "", deadline: "", job_link: "", location: "",
    job_type: "full_time", notes: "",
  });

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const [appsRes, statsRes, readinessRes] = await Promise.all([
        placementService.getApplications(params),
        placementService.getStats(),
        placementService.getReadiness(),
      ]);
      setApplications(appsRes.data.results || appsRes.data.data || []);
      setStats(statsRes.data.data);
      setReadiness(readinessRes.data.data);
    } catch (error) {
      toast.error("Failed to load placement data");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...formData };
    if (!payload.package_lpa) delete payload.package_lpa;
    else payload.package_lpa = parseFloat(payload.package_lpa);
    if (!payload.application_date) delete payload.application_date;
    if (!payload.deadline) delete payload.deadline;

    try {
      if (editingApp) {
        await placementService.updateApplication(editingApp.id, payload);
        toast.success("Application updated");
      } else {
        await placementService.createApplication(payload);
        toast.success("Application added");
      }
      setShowForm(false);
      setEditingApp(null);
      resetForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.error?.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this application?")) return;
    try {
      await placementService.deleteApplication(id);
      toast.success("Application deleted");
      loadData();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleEdit = (app) => {
    setEditingApp(app);
    setFormData({
      company_name: app.company_name, role: app.role,
      package_lpa: app.package_lpa || "", status: app.status,
      application_date: app.application_date || "", deadline: app.deadline || "",
      job_link: app.job_link || "", location: app.location || "",
      job_type: app.job_type || "full_time", notes: app.notes || "",
    });
    setShowForm(true);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await placementService.updateApplication(id, { status: newStatus });
      toast.success("Status updated");
      loadData();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: "", role: "", package_lpa: "", status: "wishlist",
      application_date: "", deadline: "", job_link: "", location: "",
      job_type: "full_time", notes: "",
    });
  };

  const getStatusBadge = (statusVal) => {
    const opt = STATUS_OPTIONS.find((s) => s.value === statusVal);
    return opt ? (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${opt.color}`}>
        {opt.label}
      </span>
    ) : null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Placement Tracker</h1>
          <p className="text-gray-500 mt-1">Track your placement journey</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingApp(null); resetForm(); }}
          className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-medium"
        >
          + Add Application
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label="Total" value={stats.total_applications} color="blue" />
          <StatCard label="Interviews" value={stats.interviews_count} color="amber" />
          <StatCard label="Offers" value={stats.offers} color="green" />
          <StatCard label="Rejected" value={stats.rejections} color="red" />
          <StatCard label="Wishlist" value={stats.wishlist} color="gray" />
        </div>
      )}

      {/* Readiness Score */}
      {readiness && (
        <div className="bg-white rounded-2xl p-6 shadow-card border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Placement Readiness Score</h3>
          <div className="flex items-center gap-6 mb-4">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#4f46e5" strokeWidth="3"
                  strokeDasharray={`${readiness.overall_score}, 100`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-primary-600">
                {readiness.overall_score}%
              </span>
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
              <ReadinessItem label="Resume" value={readiness.resume_completion} />
              <ReadinessItem label="Coding" value={readiness.coding_solved} />
              <ReadinessItem label="Roadmap" value={readiness.roadmap_progress} />
              <ReadinessItem label="Profile" value={readiness.profile_completion} />
              <ReadinessItem label="Contests" value={readiness.contests_participated} />
              <ReadinessItem label="Assignments" value={readiness.assignments_completed} />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {["list", "kanban"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize transition ${
              activeTab === tab
                ? "text-primary-600 border-b-2 border-primary-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "list" ? "List View" : "Kanban Board"}
          </button>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-3 items-center">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Applications List */}
      {activeTab === "list" && (
        <div className="space-y-3">
          {applications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">No applications yet</p>
              <p className="text-sm mt-1">Start tracking your placement journey</p>
            </div>
          ) : (
            applications.map((app) => (
              <div key={app.id} className="bg-white rounded-xl p-4 shadow-card border border-gray-100 hover:shadow-card-hover transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{app.company_name}</h3>
                      {getStatusBadge(app.status)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{app.role}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      {app.package_lpa && <span>₹{app.package_lpa} LPA</span>}
                      {app.location && <span>📍 {app.location}</span>}
                      {app.days_left !== null && app.days_left >= 0 && (
                        <span className="text-amber-600">{app.days_left} days left</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <button onClick={() => handleEdit(app)} className="text-gray-400 hover:text-primary-600 text-sm">✏️</button>
                    <button onClick={() => handleDelete(app.id)} className="text-gray-400 hover:text-red-600 text-sm">🗑️</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Kanban View */}
      {activeTab === "kanban" && <KanbanBoard applications={applications} onStatusChange={handleStatusChange} />}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingApp ? "Edit Application" : "Add Application"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input type="text" required value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <input type="text" required value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Package (LPA)</label>
                  <input type="number" step="0.01" value={formData.package_lpa}
                    onChange={(e) => setFormData({ ...formData, package_lpa: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Application Date</label>
                  <input type="date" value={formData.application_date}
                    onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                  <input type="date" value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                  <select value={formData.job_type}
                    onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                    {JOB_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Link</label>
                  <input type="url" value={formData.job_link}
                    onChange={(e) => setFormData({ ...formData, job_link: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={3} value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-medium">
                  {editingApp ? "Update" : "Add Application"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingApp(null); }}
                  className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-green-50 text-green-700",
    red: "bg-red-50 text-red-700",
    gray: "bg-gray-50 text-gray-700",
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value || 0}</p>
      <p className="text-sm opacity-80">{label}</p>
    </div>
  );
}

function ReadinessItem({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600 mb-1">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function KanbanBoard({ applications, onStatusChange }) {
  const columns = STATUS_OPTIONS.slice(0, 6); // Show first 6 statuses in kanban
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((col) => {
        const items = applications.filter((a) => a.status === col.value);
        return (
          <div key={col.value} className="min-w-[250px] flex-shrink-0">
            <div className={`px-3 py-2 rounded-t-lg ${col.color} font-medium text-sm`}>
              {col.label} ({items.length})
            </div>
            <div className="bg-gray-50 rounded-b-lg p-2 space-y-2 min-h-[200px]">
              {items.map((app) => (
                <div key={app.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                  <p className="font-medium text-sm text-gray-900">{app.company_name}</p>
                  <p className="text-xs text-gray-500">{app.role}</p>
                  {app.package_lpa && <p className="text-xs text-green-600 mt-1">₹{app.package_lpa} LPA</p>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PlacementPage;
