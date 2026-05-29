import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import adminService from "../services/adminService";

export default function AdminSectionsPage() {
  const [sections, setSections] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editSection, setEditSection] = useState(null);
  const [deptFilter, setDeptFilter] = useState("");
  const [form, setForm] = useState({ name: "", department: "", semester: 1, faculty_advisor: "", moderator: "", max_students: 60 });

  const fetchData = useCallback(async () => {
    try {
      const [secRes, deptRes] = await Promise.all([
        adminService.getSections(deptFilter ? { department: deptFilter } : {}),
        adminService.getDepartments(),
      ]);
      const secData = secRes.data?.data?.results || secRes.data?.data || secRes.data?.results || [];
      const deptData = deptRes.data?.data?.results || deptRes.data?.data || deptRes.data?.results || [];
      setSections(Array.isArray(secData) ? secData : []);
      setDepartments(Array.isArray(deptData) ? deptData : []);
    } catch (err) { toast.error("Failed to load sections"); }
    finally { setLoading(false); }
  }, [deptFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editSection) {
        await adminService.updateSection(editSection.id, form);
        toast.success("Section updated");
      } else {
        await adminService.createSection(form);
        toast.success("Section created");
      }
      setShowModal(false); setEditSection(null);
      setForm({ name: "", department: "", semester: 1, faculty_advisor: "", moderator: "", max_students: 60 });
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error?.message || "Operation failed"); }
  };

  const handleArchive = async (sec) => {
    if (!window.confirm(`Archive section "${sec.display_name}"?`)) return;
    try { await adminService.archiveSection(sec.id); toast.success("Section archived"); fetchData(); }
    catch (err) { toast.error("Failed to archive"); }
  };

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Section Management</h1>
          <p className="page-subtitle">Manage academic sections, assign faculty and moderators</p>
        </div>
        <button onClick={() => { setEditSection(null); setForm({ name: "", department: "", semester: 1, faculty_advisor: "", moderator: "", max_students: 60 }); setShowModal(true); }}
          className="btn-primary">+ Create Section</button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
          className="input-field w-48">
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="w-full">
          <thead className="table-head">
            <tr>
              <th className="th">Section</th>
              <th className="th">Department</th>
              <th className="th">Semester</th>
              <th className="th">Faculty Advisor</th>
              <th className="th">Moderator</th>
              <th className="th">Students</th>
              <th className="th">Status</th>
              <th className="th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? [...Array(6)].map((_, i) => (
              <tr key={i} className="tr"><td colSpan={8} className="td"><div className="skeleton h-8 rounded-md" /></td></tr>
            )) : sections.length === 0 ? (
              <tr><td colSpan={8} className="td text-center py-12 text-surface-400">No sections found</td></tr>
            ) : sections.map((sec) => (
              <tr key={sec.id} className="tr">
                <td className="td font-medium text-surface-800">{sec.display_name || sec.name}</td>
                <td className="td text-sm text-surface-600">{sec.department_name || sec.department_code}</td>
                <td className="td text-sm text-surface-600">{sec.semester}</td>
                <td className="td text-sm text-surface-600">{sec.faculty_advisor_name || "—"}</td>
                <td className="td text-sm text-surface-600">{sec.moderator_name || "—"}</td>
                <td className="td text-sm text-surface-600">{sec.student_count ?? 0}/{sec.max_students}</td>
                <td className="td">
                  <span className={sec.is_active ? "status-online" : "status-offline"} />
                </td>
                <td className="td">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditSection(sec); setForm({ name: sec.name, department: sec.department, semester: sec.semester, faculty_advisor: sec.faculty_advisor || "", moderator: sec.moderator || "", max_students: sec.max_students }); setShowModal(true); }}
                      className="text-xs px-2 py-1 rounded bg-primary-50 text-primary-700 hover:bg-primary-100 font-medium">Edit</button>
                    {sec.is_active && <button onClick={() => handleArchive(sec)}
                      className="text-xs px-2 py-1 rounded bg-warning-50 text-warning-700 hover:bg-warning-100 font-medium">Archive</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
            <h2 className="text-lg font-semibold text-surface-900 mb-4">
              {editSection ? "Edit Section" : "Create Section"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-700">Section Name</label>
                <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field mt-1" placeholder="A, B, C..." />
              </div>
              <div>
                <label className="text-sm font-medium text-surface-700">Department</label>
                <select required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="input-field mt-1">
                  <option value="">Select Department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-surface-700">Semester</label>
                  <input type="number" min={1} max={8} required value={form.semester}
                    onChange={(e) => setForm({ ...form, semester: parseInt(e.target.value) || 1 })}
                    className="input-field mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-surface-700">Max Students</label>
                  <input type="number" min={1} value={form.max_students}
                    onChange={(e) => setForm({ ...form, max_students: parseInt(e.target.value) || 60 })}
                    className="input-field mt-1" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">{editSection ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
