import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import adminService from "../services/adminService";

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", target: "all", priority: "normal", target_department: "", target_section: "" });

  const fetchData = useCallback(async () => {
    try {
      const [annRes, deptRes] = await Promise.all([
        adminService.getAnnouncements(),
        adminService.getDepartments(),
      ]);
      const annData = annRes.data?.data?.results || annRes.data?.data || annRes.data?.results || [];
      const deptData = deptRes.data?.data?.results || deptRes.data?.data || deptRes.data?.results || [];
      setAnnouncements(Array.isArray(annData) ? annData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
    } catch (err) { toast.error("Failed to load announcements"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminService.createAnnouncement(form);
      toast.success("Announcement sent! Real-time notifications dispatched.");
      setShowModal(false);
      setForm({ title: "", content: "", target: "all", priority: "normal", target_department: "", target_section: "" });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error?.message || "Failed to create"); }
  };

  const priorityColors = { low: "badge-neutral", normal: "badge-info", high: "badge-warning", urgent: "badge-danger" };
  const targetLabels = { all: "All Users", students: "All Students", faculty: "All Faculty", department: "Department", section: "Section" };

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Create targeted announcements with real-time delivery</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ New Announcement</button>
      </div>

      <div className="space-y-3">
        {loading ? [...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />) :
          announcements.length === 0 ? (
            <div className="text-center py-12 text-surface-400">No announcements yet</div>
          ) : announcements.map((ann) => (
            <div key={ann.id} className="card-padded flex items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-surface-900">{ann.title}</h3>
                  <span className={priorityColors[ann.priority] || "badge-neutral"}>{ann.priority}</span>
                </div>
                <p className="text-sm text-surface-600 line-clamp-2">{ann.content}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-surface-400">Target: {targetLabels[ann.target] || ann.target}</span>
                  <span className="text-xs text-surface-400">By: {ann.created_by_name}</span>
                  <span className="text-xs text-surface-400">{ann.created_at ? new Date(ann.created_at).toLocaleDateString() : ""}</span>
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 mx-4">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">New Announcement</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700">Title</label>
                <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-field mt-1" placeholder="Announcement title" />
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700">Content</label>
                <textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="input-field mt-1" rows={4} placeholder="Announcement content..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-surface-700">Target</label>
                  <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}
                    className="input-field mt-1">
                    <option value="all">All Users</option>
                    <option value="students">All Students</option>
                    <option value="faculty">All Faculty</option>
                    <option value="department">Specific Department</option>
                    <option value="section">Specific Section</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-surface-700">Priority</label>
                  <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}
                    className="input-field mt-1">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              {form.target === "department" && (
                <div>
                  <label className="text-sm font-medium text-surface-700">Department</label>
                  <select value={form.target_department} onChange={(e) => setForm({ ...form, target_department: e.target.value })}
                    className="input-field mt-1">
                    <option value="">Select Department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Send Announcement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
