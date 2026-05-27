import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../services/api";
import { toast } from "react-toastify";

function EventCard({ event }) {
  const date = event.date ? new Date(event.date) : null;
  return (
    <Link to={`/events/${event.slug || event.id}`} className="card-interactive overflow-hidden">
      {event.image && (
        <div className="h-36 bg-surface-100 overflow-hidden">
          <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
        </div>
      )}
      {!event.image && (
        <div className="h-36 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary-300">
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="12" cy="16" r="2"/>
          </svg>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {event.event_type && <span className="badge-primary">{event.event_type}</span>}
          {date && (
            <span className="text-xs text-surface-400">
              {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-surface-800 line-clamp-2">{event.title}</h3>
        <p className="text-xs text-surface-400 mt-1 line-clamp-2">{event.description}</p>
        {event.location && (
          <div className="flex items-center gap-1 mt-2 text-xs text-surface-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {event.location}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function EventsPage() {
  const { user } = useSelector((s) => s.auth);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const params = { status: filter };
        if (search) params.search = search;
        const res = await api.get("/events/", { params });
        setEvents(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchEvents();
  }, [filter, search]);

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Events</h1>
          <p className="page-subtitle">Campus events, workshops, and activities</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="search-container flex-1">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input type="text" className="search-input" placeholder="Search events..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="tab-pills">
          {[{ id: "upcoming", label: "Upcoming" }, { id: "past", label: "Past" }, { id: "registered", label: "Registered" }].map((t) => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className={filter === t.id ? "tab-pill-active" : "tab-pill-inactive"}>{t.label}</button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-64 rounded-xl" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          </div>
          <p className="empty-state-title">No events found</p>
          <p className="empty-state-desc">Check back later for upcoming campus events</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      )}
    </div>
  );
}
