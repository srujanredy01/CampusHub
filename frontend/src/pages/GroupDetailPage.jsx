import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../services/api";

export default function GroupDetailPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await api.get(`/groups/${id}`); setGroup(res.data?.data || res.data); }
      catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  if (loading) return <div className="page-container"><div className="skeleton h-64 rounded-xl" /></div>;
  if (!group) return <div className="page-container empty-state"><p className="empty-state-title">Group not found</p><Link to="/groups" className="btn-primary mt-4">Back to Groups</Link></div>;

  return (
    <div className="page-container max-w-3xl space-y-6">
      <Link to="/groups" className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        Back to Groups
      </Link>

      <div className="card-padded">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-xl">
            {group.name?.[0] || "G"}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-display font-bold text-surface-900">{group.name}</h1>
            <p className="text-sm text-surface-500 mt-0.5">{group.members_count || 0} members • {group.subject || "General"}</p>
          </div>
          {!group.is_member && <button className="btn-primary">Join Group</button>}
        </div>
        {group.description && <p className="text-sm text-surface-600 mt-4 leading-relaxed">{group.description}</p>}
      </div>

      {/* Members */}
      {group.members && group.members.length > 0 && (
        <div className="card-padded">
          <h3 className="text-base font-semibold text-surface-900 mb-3">Members</h3>
          <div className="space-y-2">
            {group.members.map((m, idx) => (
              <div key={m.id || idx} className="flex items-center gap-2.5 py-1.5">
                <div className="avatar-sm text-xs">{(m.first_name || m.username || "U")[0]}</div>
                <span className="text-sm text-surface-700">{m.first_name || m.username}</span>
                {m.is_admin && <span className="badge-primary">Admin</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
