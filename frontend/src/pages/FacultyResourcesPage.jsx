import React, { useState, useEffect } from "react";
import facultyService from "../services/facultyService";

export default function FacultyResourcesPage() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [formData, setFormData] = useState({
    title: "", description: "", resource_type: "notes",
    subject: "", branch: "", semester: "", section: "",
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { fetchResources(); }, []);

  const fetchResources = async () => {
    try {
      const res = await facultyService.getResources({});
      setResources(res.data.results || res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadResource = async () => {
    if (!file || !formData.title || !formData.subject) return;
    setUploading(true);
    try {
      const data = new FormData();
      Object.entries(formData).forEach(([k, v]) => { if (v) data.append(k, v); });
      data.append("file", file);
      await facultyService.uploadResource(data);
      setShowUpload(false);
      setFormData({ title: "", description: "", resource_type: "notes", subject: "", branch: "", semester: "", section: "" });
      setFile(null);
      fetchResources();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const deleteResource = async (id) => {
    if (!window.confirm("Delete this resource?")) return;
    try {
      await facultyService.deleteResource(id);
      fetchResources();
    } catch (err) {
      console.error(err);
    }
  };

  const getTypeIcon = (type) => {
    const icons = { notes: "📝", ppt: "📊", pdf: "📄", recording: "🎥", syllabus: "📋", question_paper: "📑", other: "📁" };
    return icons[type] || "📁";
  };

  const getTypeColor = (type) => {
    const colors = { notes: "bg-blue-50 text-blue-700", ppt: "bg-orange-50 text-orange-700", pdf: "bg-red-50 text-red-700", recording: "bg-purple-50 text-purple-700", syllabus: "bg-green-50 text-green-700", question_paper: "bg-yellow-50 text-yellow-700" };
    return colors[type] || "bg-gray-50 text-gray-700";
  };

  const formatSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
          <p className="text-sm text-gray-500 mt-1">Upload and manage study materials for your students</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
          + Upload Resource
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Resources</p>
          <p className="text-xl font-bold text-gray-900">{resources.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Downloads</p>
          <p className="text-xl font-bold text-blue-600">{resources.reduce((sum, r) => sum + (r.download_count || 0), 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-sm text-gray-500">PDFs</p>
          <p className="text-xl font-bold text-red-600">{resources.filter((r) => r.resource_type === "pdf").length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-sm text-gray-500">Notes</p>
          <p className="text-xl font-bold text-green-600">{resources.filter((r) => r.resource_type === "notes").length}</p>
        </div>
      </div>

      {/* Resources List */}
      {resources.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <span className="text-4xl block mb-3">📁</span>
          <p className="text-gray-500">No resources uploaded yet. Start sharing materials with your students!</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Resource</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Downloads</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {resources.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getTypeIcon(r.resource_type)}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{r.title}</p>
                        {r.description && <p className="text-xs text-gray-500 truncate max-w-[200px]">{r.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{r.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(r.resource_type)}`}>
                      {r.resource_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatSize(r.file_size)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-medium">{r.download_count || 0}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.file && (
                        <a href={r.file} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-700">View</a>
                      )}
                      <button onClick={() => deleteResource(r.id)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">Upload Resource</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Title *" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-16 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Subject *" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <select value={formData.resource_type} onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="notes">Lecture Notes</option>
                  <option value="ppt">Presentation</option>
                  <option value="pdf">PDF Document</option>
                  <option value="recording">Recording</option>
                  <option value="syllabus">Syllabus</option>
                  <option value="question_paper">Question Paper</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input type="text" placeholder="Branch" value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="number" placeholder="Semester" value={formData.semester} onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="text" placeholder="Section" value={formData.section} onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                <input type="file" onChange={(e) => setFile(e.target.files[0])} className="hidden" id="resource-file" />
                <label htmlFor="resource-file" className="cursor-pointer">
                  {file ? (
                    <div>
                      <span className="text-2xl block mb-1">📎</span>
                      <p className="text-sm text-gray-700 font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                    </div>
                  ) : (
                    <div>
                      <span className="text-2xl block mb-1">📤</span>
                      <p className="text-sm text-gray-500">Click to select file</p>
                      <p className="text-xs text-gray-400">PDF, PPT, DOC, Video (max 20MB)</p>
                    </div>
                  )}
                </label>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-2">
                <span className="text-blue-600">✓</span>
                <p className="text-xs text-blue-700">Resources uploaded by faculty get the <strong>Faculty Verified</strong> badge</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={uploadResource} disabled={uploading || !file || !formData.title || !formData.subject}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
