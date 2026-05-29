import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import adminService from "../services/adminService";

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [form, setForm] = useState({ name: "", code: "", description: "", head: "" });

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await adminService.getDepartments();
      const data = res.data?.data?.results || res.data?.data || res.data?.results || [];
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load departments");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editDept) {
        await adminService.updateDepartment(editDept.id, form);
        toast.success("Department updated");
      } else {
        await adminService.createDepartment(form);
        toast.success("Department created");
      }
      setShowModal(false);
      setEditDept(null);
      setForm({ name: "", code: "", description: "", head: "" });
      fetchDepartments();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Operation failed");
    }
  };

  const handleArchive = async (dept) => {
    if (!window.confirm(`Archive "${dept.name}"? This will hide it from active lists.`)) return;
    try {
      await adminService.archiveDepartment(dept.id);
      toast.success("Department archived");
      fetchDepartments();
    } catch (err) { toast.error("Failed to archive"); }
  };

  const openEdit = (dept) => {
    setEditDept(dept);
    setForm({ name: dept.name, code: dept.code, description: dept.description || "", head: dept.head || "" });
    setShowModal(true);
  };

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Department Management</h1>
          <p className="page-subtitle">Create and manage academic departments</p>
        </div>
        <button onClick={() => { setEditDept(null); setForm({ name: "", code: "", description: "", head: "" }); setShowModal(true); }}
          className="btn-primary">+ Create Department</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? [...Array(6)].map((_, i) => <div key={i} className="skeleton h-40 rounded-xl" />) :
          departments.map((dept) => (
            <div key={dept.id} className="card-padded hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-sm">
                    {dept.code?.slice(0, 3)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-surface-900">{dept.name}</h3>
                    <p className="text-xs text-surface-400">{dept.code}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${dept.is_active ? "bg-success-50 text-success-700" : "bg-surface-100 text-surface-500"}`}>
                  {dept.is_active ? "Active" : "Archived"}
                </span>
              </div>
              {dept.description && <p className="text-xs text-surface-500 mb-3 line-clamp-2">{dept.description}</p>}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center p-2 rounded bg-surface-50">
                  <p className="text-lg font-bold text-surface-900">{dept.student_count ?? 0}</p>
                  <p className="text-2xs text-surface-500">Students</p>
                </div>
                <div className="text-center p-2 rounded bg-surface-50">
                  <p className="text-lg font-bold text-surface-900">{dept.faculty_count ?? 0}</p>
                  <p className="text-2xs text-surface-500">Faculty</p>
                </div>
                <div className="text-center p-2 rounded bg-surface-50">
                  <p className="text-lg font-bold text-surface-900">{dept.section_count ?? 0}</p>
                  <p className="text-2xs text-surface-500">Sections</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(dept)} className="flex-1 text-xs py-1.5 rounded bg-primary-50 text-primary-700 hover:bg-primary-100 font-medium">Edit</button>
                {dept.is_active && (
                  <button onClick={() => handleArchive(dept)} className="flex-1 text-xs py-1.5 rounded bg-warning-50 text-warning-700 hover:bg-warning-100 font-medium">Archive</button>
                )}
              </div>
            </div>
          ))
        }
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">
              {editDept ? "Edit Department" : "Create Department"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700">Name</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field mt-1" placeholder="Computer Science & Engineering" />
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700">Code</label>
                <input type="text" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="input-field mt-1" placeholder="CSE" />
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field mt-1" rows={3} placeholder="Optional description..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">{editDept ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
