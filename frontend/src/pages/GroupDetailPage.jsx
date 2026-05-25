import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { groupsService } from "../services/groupsService";

function Composer({ onSubmit }) {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState("discussion");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("post_type", postType);
      fd.append("title", title);
      fd.append("content", content);
      if (file) fd.append("attachment", file);
      await onSubmit(fd);
      setTitle("");
      setContent("");
      setFile(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <select className="input-field" value={postType} onChange={(e) => setPostType(e.target.value)}>
          <option value="discussion">Discussion</option>
          <option value="announcement">Announcement</option>
          <option value="resource">File Share</option>
        </select>
        <input className="input-field md:col-span-2" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <textarea className="input-field resize-none" rows={3} placeholder="Write your message..." value={content} onChange={(e) => setContent(e.target.value)} />
      <div className="flex items-center justify-between gap-2">
        <input type="file" className="input-field" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button disabled={saving} className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
          {saving ? "Posting..." : "Post"}
        </button>
      </div>
    </form>
  );
}

export default function GroupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [invEmail, setInvEmail] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [g, p, m, mt] = await Promise.all([
        groupsService.getById(id),
        groupsService.getPosts(id),
        groupsService.getMembers(id),
        groupsService.getMeetings(id),
      ]);
      setGroup(g.data.data || g.data);
      setPosts(p.data.results || p.data.data || p.data);
      setMembers(m.data.results || m.data.data || m.data);
      setMeetings(mt.data.results || mt.data.data || mt.data);
    } catch (e) {
      toast.error(e.response?.data?.error?.message || "Failed to load group.");
      navigate("/groups");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePost = async (formData) => {
    try {
      await groupsService.createPost(id, formData);
      await load();
      toast.success("Posted.");
    } catch (e) {
      toast.error(e.response?.data?.error?.message || "Post failed.");
    }
  };

  const handleInvite = async () => {
    if (!invEmail.trim()) return;
    try {
      await groupsService.createInvite(id, { invited_student_id: invEmail.trim() });
      toast.success("Invitation sent.");
      setInvEmail("");
    } catch (e) {
      toast.error(e.response?.data?.error?.message || "Invite failed. Check the student ID.");
    }
  };

  const scheduleMeeting = async () => {
    const title = prompt("Meeting title");
    if (!title) return;
    const startsAt = prompt("Start datetime (YYYY-MM-DDTHH:mm)");
    const endsAt = prompt("End datetime (YYYY-MM-DDTHH:mm)");
    const meetingLink = prompt("Meeting link (optional)") || "";
    try {
      await groupsService.createMeeting(id, {
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        meeting_link: meetingLink,
      });
      toast.success("Meeting scheduled.");
      await load();
    } catch (e) {
      toast.error(e.response?.data?.error?.message || "Failed to schedule.");
    }
  };

  if (loading) return <div className="py-16 text-center text-slate-500">Loading group...</div>;
  if (!group) return null;

  return (
    <div className="space-y-4 animate-fade-up">
      <button onClick={() => navigate("/groups")} className="text-sm text-slate-500 hover:text-slate-700">Back to Groups</button>
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{group.name}</h1>
            <p className="text-sm text-slate-500">{group.subject} · {group.branch} · Sem {group.semester || "Any"}</p>
            <p className="text-sm text-slate-600 mt-2">{group.description}</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>{group.member_count} members</p>
            <p>Room: {group.websocket_room}</p>
            {group.visibility === "private" && <p>Invite Code: {group.invite_code}</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Composer onSubmit={handlePost} />
          <div className="space-y-3">
            {posts.map((p) => (
              <div key={p.id} className="bg-white border border-slate-100 rounded-xl p-4">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span className="font-semibold text-slate-700">{p.author_name}</span>
                  <span>{new Date(p.created_at).toLocaleString()}</span>
                </div>
                {p.title && <p className="font-semibold text-slate-800">{p.title}</p>}
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{p.content}</p>
                {p.attachment_url && <a href={p.attachment_url} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline mt-2 inline-block">Open attachment</a>}
              </div>
            ))}
            {posts.length === 0 && <div className="bg-white border border-slate-100 rounded-xl p-8 text-center text-slate-500">No discussions yet.</div>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-slate-800 text-sm">Members</h2>
            </div>
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {members.map((m) => (
                <div key={m.id} className="text-sm text-slate-600 flex items-center justify-between">
                  <span>{m.user_name}</span>
                  <span className="text-xs text-slate-400">{m.role}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <h2 className="font-semibold text-slate-800 text-sm mb-2">Meeting Scheduler</h2>
            <button onClick={scheduleMeeting} className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold">Schedule Meeting</button>
            <div className="mt-3 space-y-2 max-h-44 overflow-y-auto">
              {meetings.map((m) => (
                <div key={m.id} className="text-xs bg-slate-50 rounded-lg p-2">
                  <p className="font-semibold text-slate-700">{m.title}</p>
                  <p className="text-slate-500">{new Date(m.starts_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl p-4">
            <h2 className="font-semibold text-slate-800 text-sm mb-2">Invitations</h2>
            <div className="flex gap-2">
              <input className="input-field" placeholder="Student ID to invite" value={invEmail} onChange={(e) => setInvEmail(e.target.value)} />
              <button onClick={handleInvite} className="px-3 bg-slate-800 text-white rounded-lg text-sm">Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
