import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchResources } from "../store/slices/resourceSlice";
import { resourceService } from "../services/resourceService";
import { toast } from "react-toastify";
import LoadingSpinner from "../components/common/LoadingSpinner";
import api from "../services/api";

const YEAR_LABELS = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year" };
const YEAR_SEMESTERS = { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8] };
const FILE_TYPES = ["pdf", "presentation", "document", "spreadsheet", "other"];
const FILE_ICONS = {
  pdf: "📄", presentation: "📊", document: "📝", spreadsheet: "📈", other: "📁",
};

const EMPTY_FORM = {
  title: "", description: "", subject: "", branch: "",
  academic_year: "1", semester: "1", file_type: "pdf",
  tags: "", external_url: "", preview_supported: false, file: null,
};

// ── Upload / Edit Modal ───────────────────────────────────────────────────────
function ResourceModal({ resource, onClose, onSaved }) {
  const isEdit = !!resource;
  const [form, setForm] = useState(
    isEdit
      ? {
          title: resource.title || "",
          description: resource.description || "",
          subject: resource.subject || "",
          branch: resource.branch || "",
          academic_year: String(resource.academic_year || 1),
          semester: String(resource.semester || 1),
          file_type: resource.file_type || "pdf",
          tags: resource.tags || "",
          external_url: resource.external_url || "",
          preview_supported: resource.preview_supported || false,
          file: null,
        }
      : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);

  const availableSems = YEAR_SEMESTERS[parseInt(form.academic_year)] || [];

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === "file" && v) fd.append("file", v);
        else if (k !== "file") fd.append(k, v);
      });

      if (isEdit) {
        await api.put(`/admin/resources/${resource.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Resource updated.");
      } else {
        await api.post("/admin/resources/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.success("Resource uploaded.");
      }
      onSaved();
      onClose();
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) {
        Object.values(errors).flat().forEach((m) => toast.error(m));
      } else {
        toast.error(err.response?.data?.error?.message || "Save failed.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? "Edit Resource" : "Upload Resource"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input className="input-field" value={form.title} onChange={(e) => set("title", e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <input className="input-field" placeholder="e.g. Data Structures" value={form.subject} onChange={(e) => set("subject", e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
              <input className="input-field" placeholder="e.g. CSE" value={form.branch} onChange={(e) => set("branch", e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year *</label>
              <select className="input-field" value={form.academic_year}
                onChange={(e) => { set("academic_year", e.target.value); set("semester", String(YEAR_SEMESTERS[parseInt(e.target.value)][0])); }}>
                {[1, 2, 3, 4].map((y) => <option key={y} value={y}>{YEAR_LABELS[y]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Semester *</label>
              <select className="input-field" value={form.semester} onChange={(e) => set("semester", e.target.value)}>
                {availableSems.map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File Type *</label>
              <select className="input-field" value={form.file_type} onChange={(e) => set("file_type", e.target.value)}>
                {FILE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input className="input-field" placeholder="math, calculus, notes" value={form.tags} onChange={(e) => set("tags", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input-field resize-none" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
              <input type="file" className="input-field" accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx"
                onChange={(e) => set("file", e.target.files[0] || null)} />
              {isEdit && resource.file_name && !form.file && (
                <p className="text-xs text-gray-400 mt-1">Current: {resource.file_name}</p>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">External URL (optional)</label>
              <input type="url" className="input-field" placeholder="https://..." value={form.external_url} onChange={(e) => set("external_url", e.target.value)} />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="preview" checked={form.preview_supported}
                onChange={(e) => set("preview_supported", e.target.checked)} className="w-4 h-4 accent-primary-600" />
              <label htmlFor="preview" className="text-sm text-gray-700">Preview supported (PDF viewer)</label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50">
              {saving ? "Saving…" : isEdit ? "Update Resource" : "Upload Resource"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Admin Resources Page ─────────────────────────────────────────────────
export default function AdminResourcesPage() {
  const dispatch = useDispatch();
  const { items, loading, totalCount } = useSelector((s) => s.resources);

  const [search, setSearch]       = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterActive, setFilterActive] = useState("");
  const [modal, setModal]         = useState(null); // null | "create" | resource object
  const [stats, setStats]         = useState(null);

  const loadResources = () => {
    const params = {};
    if (search)       params.search        = search;
    if (filterYear)   params.academic_year = filterYear;
    if (filterType)   params.file_type     = filterType;
    if (filterActive !== "") params.is_active = filterActive;
    dispatch(fetchResources(params));
  };

  useEffect(() => { loadResources(); }, [search, filterYear, filterType, filterActive]);

  useEffect(() => {
    api.get("/admin/resources/stats").then((r) => setStats(r.data.data)).catch(() => {});
  }, []);

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    try {
      await api.delete(`/admin/resources/${id}`);
      toast.success("Resource deleted.");
      loadResources();
    } catch {
      toast.error("Delete failed.");
    }
  };

  const handleToggle = async (id, currentActive) => {
    try {
      await api.post(`/admin/resources/${id}/toggle`);
      toast.success(currentActive ? "Resource deactivated." : "Resource activated.");
      loadResources();
    } catch {
      toast.error("Toggle failed.");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resources Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Upload, edit, and manage study materials</p>
        </div>
        <button
          onClick={() => setModal("create")}
          className="bg-primary-600 hover:bg-primary-700 text-white font-medium px-4 py-2 rounded-xl transition-colors flex items-center gap-2"
        >
          + Upload Resource
        </button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Resources", value: stats.total, icon: "📚", color: "blue" },
            { label: "Active", value: stats.active, icon: "✅", color: "green" },
            { label: "Total Downloads", value: stats.total_downloads, icon: "⬇", color: "purple" },
            { label: "File Types", value: stats.by_file_type?.length || 0, icon: "📁", color: "orange" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-${s.color}-100 flex items-center justify-center text-xl`}>{s.icon}</div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text" className="input-field" placeholder="Search by title, subject, tags..."
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input-field" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            <option value="">All Years</option>
            {[1, 2, 3, 4].map((y) => <option key={y} value={y}>{YEAR_LABELS[y]}</option>)}
          </select>
          <select className="input-field" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">All File Types</option>
            {FILE_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <select className="input-field" value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <p className="text-4xl mb-3">📂</p>
          <p className="font-semibold text-gray-700">No resources found</p>
          <p className="text-sm text-gray-400 mt-1">Upload your first resource to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Resource</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Year / Sem</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Branch</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Downloads</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{FILE_ICONS[r.file_type] || "📁"}</span>
                        <div>
                          <p className="font-medium text-gray-900 max-w-[200px] truncate">{r.title}</p>
                          <p className="text-xs text-gray-400">{r.subject}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{YEAR_LABELS[r.academic_year]}</span>
                      <span className="ml-1 text-xs text-gray-400">Sem {r.semester}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full uppercase">{r.file_type}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{r.branch}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{r.download_count}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggle(r.id, r.is_active)}
                        className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                          r.is_active
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-red-100 text-red-700 hover:bg-red-200"
                        }`}
                      >
                        {r.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setModal(r)}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(r.id, r.title)}
                          className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {items.length} of {totalCount || items.length} resources
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <ResourceModal
          resource={modal === "create" ? null : modal}
          onClose={() => setModal(null)}
          onSaved={loadResources}
        />
      )}
    </div>
  );
}
