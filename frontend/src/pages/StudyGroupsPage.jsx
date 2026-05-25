import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { groupsService } from "../services/groupsService";

function GroupCard({ group, onJoin, onLeave }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAction = async () => {
    setLoading(true);
    try {
      if (group.is_member) await onLeave(group.id);
      else await onJoin(group.id);
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-800 truncate">{group.name}</h3>
            <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${group.visibility === "private" ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
              {group.visibility}
            </span>
          </div>
          {group.subject && <p className="text-xs text-slate-500">{group.subject}</p>}
        </div>
        {group.user_role === "admin" && (
          <span className="text-2xs bg-primary-50 text-primary-700 border border-primary-200 px-2 py-0.5 rounded-full font-semibold ml-2 flex-shrink-0">Admin</span>
        )}
      </div>

      {group.description && (
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{group.description}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {group.branch && <span className="text-2xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{group.branch}</span>}
        {group.semester && <span className="text-2xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">Sem {group.semester}</span>}
        <span className="text-2xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{group.member_count} members</span>
      </div>

      <div className="flex gap-2 mt-auto pt-2 border-t border-slate-50">
        <button
          onClick={handleAction}
          disabled={loading}
          className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 ${
            group.is_member
              ? "bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600"
              : "bg-primary-600 hover:bg-primary-700 text-white"
          }`}
        >
          {loading ? "..." : group.is_member ? "Leave Group" : "Join Group"}
        </button>
        {group.is_member && (
          <button
            onClick={() => navigate(`/groups/${group.id}`)}
            className="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
          >
            Open
          </button>
        )}
      </div>
    </div>
  );
}

function CreateGroupModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", description: "", subject: "", branch: "", semester: "", visibility: "public", max_members: 50 });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await groupsService.create(form);
      toast.success("Group created.");
      onCreated();
      onClose();
    } catch (err) {
      const errs = err.response?.data?.errors;
      if (errs) Object.values(errs).flat().forEach(m => toast.error(m));
      else toast.error("Failed to create group.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Create Study Group</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="input-label">Group Name *</label>
            <input className="input-field" value={form.name} onChange={e => set("name", e.target.value)} required placeholder="e.g. DSA Study Circle" />
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea className="input-field resize-none" rows={2} value={form.description} onChange={e => set("description", e.target.value)} placeholder="What is this group about?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Subject</label>
              <input className="input-field" value={form.subject} onChange={e => set("subject", e.target.value)} placeholder="e.g. Data Structures" />
            </div>
            <div>
              <label className="input-label">Branch</label>
              <input className="input-field" value={form.branch} onChange={e => set("branch", e.target.value)} placeholder="e.g. CSE" />
            </div>
            <div>
              <label className="input-label">Semester</label>
              <select className="input-field" value={form.semester} onChange={e => set("semester", e.target.value)}>
                <option value="">Any</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Visibility</label>
              <select className="input-field" value={form.visibility} onChange={e => set("visibility", e.target.value)}>
                <option value="public">Public</option>
                <option value="private">Private (invite only)</option>
              </select>
            </div>
            <div>
              <label className="input-label">Max Members</label>
              <input type="number" className="input-field" min={2} max={200} value={form.max_members} onChange={e => set("max_members", Number(e.target.value))} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50">
              {saving ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StudyGroupsPage() {
  const [groups,    setGroups]    = useState([]);
  const [myGroups,  setMyGroups]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tab,       setTab]       = useState("discover");
  const [search,    setSearch]    = useState("");
  const [filters,   setFilters]   = useState({ branch: "", semester: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)          params.search   = search;
      if (filters.branch)  params.branch   = filters.branch;
      if (filters.semester) params.semester = filters.semester;
      const [allRes, myRes] = await Promise.all([
        groupsService.getAll(params),
        groupsService.getMine(),
      ]);
      setGroups(allRes.data.results || allRes.data.data || []);
      setMyGroups(myRes.data.results || myRes.data.data || []);
    } catch { toast.error("Failed to load groups."); }
    finally { setLoading(false); }
  }, [search, filters]);

  useEffect(() => { load(); }, [load]);

  const handleJoin = async (id) => {
    try {
      await groupsService.join(id);
      toast.success("Joined group.");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Failed to join.");
    }
  };

  const handleLeave = async (id) => {
    if (!window.confirm("Leave this group?")) return;
    try {
      await groupsService.leave(id);
      toast.success("Left group.");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || "Failed to leave.");
    }
  };

  const displayGroups = tab === "mine" ? myGroups : groups;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Study Groups</h1>
          <p className="text-sm text-slate-500 mt-0.5">Collaborate, discuss, and learn together</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Create Group
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {[["discover","Discover"],["mine","My Groups"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            {l} {k === "mine" && myGroups.length > 0 && <span className="ml-1 text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">{myGroups.length}</span>}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab === "discover" && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text" className="input-field pl-9" placeholder="Search groups..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <input type="text" className="input-field w-full sm:w-32" placeholder="Branch" value={filters.branch} onChange={e => setFilters(f => ({ ...f, branch: e.target.value }))} />
            <select className="input-field w-full sm:w-36" value={filters.semester} onChange={e => setFilters(f => ({ ...f, semester: e.target.value }))}>
              <option value="">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Groups grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse h-44" />
          ))}
        </div>
      ) : displayGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 text-slate-200 mb-4">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <p className="text-slate-500 font-semibold">
            {tab === "mine" ? "You haven't joined any groups yet" : "No groups found"}
          </p>
          <p className="text-slate-400 text-sm mt-1">
            {tab === "mine" ? "Discover and join groups below" : "Create the first group!"}
          </p>
          {tab === "mine" && (
            <button onClick={() => setTab("discover")} className="mt-4 text-sm text-primary-600 hover:underline">Browse groups</button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayGroups.map(g => (
            <GroupCard key={g.id} group={g} onJoin={handleJoin} onLeave={handleLeave} />
          ))}
        </div>
      )}

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}
