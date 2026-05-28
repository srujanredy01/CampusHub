import React, { useState, useEffect } from "react";
import facultyService from "../services/facultyService";

export default function FacultyEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState({ type: "", status: "" });
  const [formData, setFormData] = useState({
    title: "", description: "", event_type: "workshop", status: "draft",
    target_branch: "", target_semester: "", target_section: "",
    starts_at: "", ends_at: "", venue: "", is_online: false,
    meeting_link: "", max_participants: 100,
  });

  useEffect(() => { fetchEvents(); }, [filter]);

  const fetchEvents = async () => {
    try {
      const res = await facultyService.getEvents(filter);
      setEvents(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    try {
      await facultyService.createEvent(formData);
      setShowCreate(false);
      setFormData({ title: "", description: "", event_type: "workshop", status: "draft", target_branch: "", target_semester: "", target_section: "", starts_at: "", ends_at: "", venue: "", is_online: false, meeting_link: "", max_participants: 100 });
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteEvent = async (id) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await facultyService.deleteEvent(id);
      fetchEvents();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: "bg-gray-100 text-gray-700",
      published: "bg-blue-100 text-blue-700",
      registration_open: "bg-green-100 text-green-700",
      ongoing: "bg-yellow-100 text-yellow-700",
      completed: "bg-purple-100 text-purple-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getTypeIcon = (type) => {
    const icons = {
      workshop: "🔧", hackathon: "💻", seminar: "🎤", coding_contest: "🏆",
      guest_lecture: "👨‍🏫", department_meeting: "📋", lab_session: "🔬",
      project_review: "📊", other: "📌",
    };
    return icons[type] || "📌";
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage workshops, hackathons, seminars, and more</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
          + Create Event
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Types</option>
          <option value="workshop">Workshop</option>
          <option value="hackathon">Hackathon</option>
          <option value="seminar">Seminar</option>
          <option value="coding_contest">Coding Contest</option>
          <option value="guest_lecture">Guest Lecture</option>
          <option value="department_meeting">Department Meeting</option>
        </select>
        <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="registration_open">Registration Open</option>
          <option value="ongoing">Ongoing</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Events Grid */}
      {events.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <span className="text-4xl block mb-3">🗓️</span>
          <p className="text-gray-500">No events found. Create your first event!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <div key={event.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
              {event.poster && (
                <img src={event.poster} alt={event.title} className="w-full h-32 object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getTypeIcon(event.event_type)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                    {event.status?.replace("_", " ")}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{event.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{event.description}</p>

                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{new Date(event.starts_at).toLocaleDateString()} — {new Date(event.ends_at).toLocaleDateString()}</span>
                  </div>
                  {event.venue && (
                    <div className="flex items-center gap-2">
                      <span>📍</span>
                      <span>{event.venue}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span>👥</span>
                    <span>{event.registered_count}/{event.max_participants} registered</span>
                  </div>
                  {event.target_branch && (
                    <div className="flex items-center gap-2">
                      <span>🎯</span>
                      <span>{event.target_branch} {event.target_section && `Sec ${event.target_section}`}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-50">
                  <button onClick={() => deleteEvent(event.id)} className="text-xs text-red-600 hover:text-red-700">Delete</button>
                  <span className="text-gray-200">|</span>
                  <span className="text-xs text-gray-400">{event.attended_count} attended</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create Event</h3>
            <div className="space-y-3">
              <input type="text" placeholder="Event Title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <textarea placeholder="Description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm h-20 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <select value={formData.event_type} onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="workshop">Workshop</option>
                  <option value="hackathon">Hackathon</option>
                  <option value="seminar">Seminar</option>
                  <option value="coding_contest">Coding Contest</option>
                  <option value="guest_lecture">Guest Lecture</option>
                  <option value="department_meeting">Department Meeting</option>
                  <option value="lab_session">Lab Session</option>
                  <option value="project_review">Project Review</option>
                </select>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="registration_open">Registration Open</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Starts At</label>
                  <input type="datetime-local" value={formData.starts_at} onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ends At</label>
                  <input type="datetime-local" value={formData.ends_at} onChange={(e) => setFormData({ ...formData, ends_at: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <input type="text" placeholder="Venue" value={formData.venue} onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-3 gap-3">
                <input type="text" placeholder="Branch" value={formData.target_branch} onChange={(e) => setFormData({ ...formData, target_branch: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="text" placeholder="Semester" value={formData.target_semester} onChange={(e) => setFormData({ ...formData, target_semester: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input type="text" placeholder="Section" value={formData.target_section} onChange={(e) => setFormData({ ...formData, target_section: e.target.value })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-3">
                <input type="number" placeholder="Max Participants" value={formData.max_participants} onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) || 100 })}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={formData.is_online} onChange={(e) => setFormData({ ...formData, is_online: e.target.checked })} className="rounded" />
                  Online
                </label>
              </div>
              {formData.is_online && (
                <input type="url" placeholder="Meeting Link" value={formData.meeting_link} onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={createEvent} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
