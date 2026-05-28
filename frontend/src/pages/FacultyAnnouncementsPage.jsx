import React, { useState, useEffect } from "react";
import facultyService from "../services/facultyService";

export default function FacultyAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", priority: "normal", target_branch: "", target_semester: "", target_section: "" });

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await facultyService.getAnnouncements({});
      setAnnouncements(res.data.results || res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const createAnnouncement = async () => {
    try {
      await facultyService.createAnnouncement(form);
      setShowCreate(false);
      setForm({ title: "", content: "", priority: "normal", target_branch: "", target_semester: "", target_section: "" });
      fetchAnnouncements();
    } catch (err) { console.error(err); }
  };

  const deleteAnnouncement = async (id) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await facultyService.deleteAnnouncement(id);
      fetchAnnouncements();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">New Announcement</button>
      </div>

      <div className="space-y-4">
        {announcements.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{a.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    a.priority === "urgent" ? "bg-red-100 text-red-700" :
                    a.priority === "high" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-600"
                  }`}>{a.priority}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2 line-clamp-2">{a.content}</p>
                <div className="flex gap-3 mt-3 text-xs text-gray-400">
                  {a.target_section && <span>Section: {a.target_section}</span>}
                  {a.target_branch && <span>Branch: {a.target_branch}</span>}
                  <span>{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button onClick={() => deleteAnnouncement(a.id)} className="text-red-400 hover:text-red-600 text-sm">Delete</button>
            </div>
          </div>
        ))}
        {announcements.length === 0 && <div className="text-center text-gray-400 py-8">No announcements yet</div>}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">New Announcement</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Title" value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <textarea placeholder="Content" value={form.content} onChange={(e) => setForm({...form, content: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-32 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <select value={form.priority} onChange={(e) => setForm({...form, priority: e.target.value})}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <input type="text" placeholder="Target Section" value={form.target_section} onChange={(e) => setForm({...form, target_section: e.target.value})}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
              <button onClick={createAnnouncement} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Post</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
