import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function StudyGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetch = async () => {
      try {
        const params = search ? { search } : {};
        const res = await api.get("/groups/", { params });
        setGroups(Array.isArray(res.data) ? res.data : res.data.results || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [search]);

  return (
    <div className="page-container space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Study Groups</h1>
          <p className="page-subtitle">Collaborate and learn together</p>
        </div>
      </div>

      <div className="search-container max-w-md">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input type="text" className="search-input" placeholder="Search groups..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-36 rounded-xl" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <p className="empty-state-title">No study groups</p>
          <p className="empty-state-desc">Create or join a group to start collaborating</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <Link key={group.id} to={`/groups/${group.id}`} className="card-interactive p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-sm">
                  {group.name?.[0] || "G"}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-surface-800 truncate">{group.name}</h3>
                  <p className="text-xs text-surface-400">{group.members_count || 0} members</p>
                </div>
              </div>
              <p className="text-xs text-surface-400 line-clamp-2">{group.description}</p>
              {group.subject && (
                <div className="mt-3">
                  <span className="badge-neutral">{group.subject}</span>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
