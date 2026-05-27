import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../services/api";
import { toast } from "react-toastify";

export default function EventDetailPage() {
  const { slug } = useParams();
  const { user } = useSelector((s) => s.auth);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await api.get(`/events/${slug}/`); setEvent(res.data); }
      catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [slug]);

  const handleRegister = async () => {
    setRegistering(true);
    try {
      await api.post(`/events/${slug}/register/`);
      setEvent({ ...event, is_registered: true });
      toast.success("Registered successfully!");
    } catch { toast.error("Registration failed"); }
    finally { setRegistering(false); }
  };

  if (loading) return <div className="page-container"><div className="skeleton h-64 rounded-xl" /></div>;
  if (!event) return <div className="page-container empty-state"><p className="empty-state-title">Event not found</p><Link to="/events" className="btn-primary mt-4">Back to Events</Link></div>;

  const date = event.date ? new Date(event.date) : null;

  return (
    <div className="page-container max-w-3xl space-y-6">
      <Link to="/events" className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Events
      </Link>

      {event.image && (
        <div className="rounded-xl overflow-hidden h-56 bg-surface-100">
          <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            {event.event_type && <span className="badge-primary">{event.event_type}</span>}
            {event.is_registered && <span className="badge-success">Registered</span>}
          </div>
          <h1 className="text-2xl font-display font-bold text-surface-900">{event.title}</h1>
        </div>
        {!event.is_registered && (
          <button onClick={handleRegister} disabled={registering} className="btn-primary flex-shrink-0">
            {registering ? "Registering..." : "Register Now"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {date && (
          <div className="card-padded flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            </div>
            <div>
              <p className="text-xs text-surface-400">Date</p>
              <p className="text-sm font-medium text-surface-800">{date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>
        )}
        {event.location && (
          <div className="card-padded flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-success-50 flex items-center justify-center text-success-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <div>
              <p className="text-xs text-surface-400">Location</p>
              <p className="text-sm font-medium text-surface-800">{event.location}</p>
            </div>
          </div>
        )}
        {event.organizer && (
          <div className="card-padded flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-warning-50 flex items-center justify-center text-warning-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M5.5 21a8.38 8.38 0 0 1 13 0"/></svg>
            </div>
            <div>
              <p className="text-xs text-surface-400">Organizer</p>
              <p className="text-sm font-medium text-surface-800">{event.organizer}</p>
            </div>
          </div>
        )}
      </div>

      <div className="card-padded">
        <h3 className="text-base font-semibold text-surface-900 mb-3">About this event</h3>
        <div className="text-sm text-surface-600 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: event.description || "" }} />
      </div>
    </div>
  );
}
