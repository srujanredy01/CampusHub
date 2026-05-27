import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import { toast } from "react-toastify";

// ── WebSocket Chat Hook ──────────────────────────────────────────────────────
function useChatWebSocket(channelSlug, onMessage, onTyping) {
  const wsRef = useRef(null);
  const { user } = useSelector((s) => s.auth);

  useEffect(() => {
    if (!channelSlug) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/chat/${channelSlug}/?token=${token}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "message") onMessage?.(data);
          else if (data.type === "typing") onTyping?.(data);
          else if (data.type === "user_join" || data.type === "user_leave") onMessage?.(data);
        } catch (e) { /* ignore parse errors */ }
      };

      ws.onerror = () => { /* WebSocket error, will fall back to polling */ };
      ws.onclose = () => { wsRef.current = null; };
    } catch (e) { /* WebSocket not available */ }

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
    };
  }, [channelSlug]);

  const sendMessage = useCallback((content, opts = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        action: "message",
        content,
        message_type: opts.message_type || "text",
        reply_to: opts.reply_to || null,
        mentions: opts.mentions || [],
      }));
      return true;
    }
    return false;
  }, []);

  const sendTyping = useCallback((isTyping) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: isTyping ? "typing" : "stop_typing", is_typing: isTyping }));
    }
  }, []);

  return { sendMessage, sendTyping, isConnected: wsRef.current?.readyState === WebSocket.OPEN };
}

// ── Channel Item ─────────────────────────────────────────────────────────────
function ChannelItem({ channel, active, onClick }) {
  const typeIcons = {
    academic_section: "📚", subject: "📖", coding_community: "💻",
    placement: "💼", study_group: "👥", general: "💬", club: "🎯",
  };
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left ${active ? "bg-primary-50 text-primary-700 font-medium shadow-sm" : "text-surface-600 hover:bg-surface-50"}`}>
      <span className="text-base flex-shrink-0">{channel.icon || typeIcons[channel.channel_type] || "#"}</span>
      <span className="truncate flex-1">{channel.name}</span>
      {channel.unread_count > 0 && (
        <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-2xs flex items-center justify-center font-bold flex-shrink-0">
          {channel.unread_count > 9 ? "9+" : channel.unread_count}
        </span>
      )}
    </button>
  );
}

// ── Message Component ────────────────────────────────────────────────────────
function MessageItem({ message, isOwn, onReact }) {
  const [showActions, setShowActions] = useState(false);

  if (message.type === "user_join" || message.type === "user_leave") {
    return (
      <div className="flex justify-center py-1">
        <span className="text-2xs text-surface-400 bg-surface-50 px-3 py-1 rounded-full">
          {message.user_name || message.sender_name} {message.type === "user_join" ? "joined" : "left"}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex gap-2.5 group ${isOwn ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setShowActions(true)} onMouseLeave={() => setShowActions(false)}>
      <div className="w-8 h-8 rounded-lg bg-surface-200 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-surface-600">
        {(message.sender_name || message.sender?.full_name || "U")[0].toUpperCase()}
      </div>
      <div className={`max-w-[70%] ${isOwn ? "items-end" : ""}`}>
        <div className={`flex items-center gap-2 mb-0.5 ${isOwn ? "flex-row-reverse" : ""}`}>
          <span className="text-xs font-medium text-surface-700">
            {message.sender_name || message.sender?.full_name || "User"}
          </span>
          <span className="text-2xs text-surface-400">
            {message.created_at ? new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
          {message.sender_role && message.sender_role !== "student" && (
            <span className="text-2xs px-1.5 py-0.5 rounded bg-primary-50 text-primary-600 font-medium">
              {message.sender_role}
            </span>
          )}
        </div>
        <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${isOwn ? "bg-primary-600 text-white rounded-tr-md" : "bg-surface-100 text-surface-800 rounded-tl-md"}`}>
          {message.content}
        </div>
      </div>
    </div>
  );
}

// ── Create Channel Modal ─────────────────────────────────────────────────────
function CreateChannelModal({ isOpen, onClose, onCreated }) {
  const [form, setForm] = useState({ name: "", description: "", channel_type: "general", visibility: "public" });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Channel name is required"); return; }
    setSubmitting(true);
    try {
      const res = await api.post("/communication/channels/create", form);
      toast.success("Channel created");
      onCreated(res.data?.data || res.data);
      onClose();
      setForm({ name: "", description: "", channel_type: "general", visibility: "public" });
    } catch (err) {
      toast.error(err?.response?.data?.error?.message || "Failed to create channel");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-surface-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-float w-full max-w-md p-6 animate-fade-up">
        <h3 className="text-lg font-semibold text-surface-900 mb-4">Create Channel</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Channel Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input-field" placeholder="e.g., DBMS Help" />
          </div>
          <div>
            <label className="text-xs font-medium text-surface-600 mb-1 block">Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field" placeholder="What's this channel about?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Type</label>
              <select value={form.channel_type} onChange={(e) => setForm({ ...form, channel_type: e.target.value })} className="input-field">
                <option value="general">General</option>
                <option value="academic_section">Academic</option>
                <option value="coding_community">Coding</option>
                <option value="placement">Placement</option>
                <option value="club">Club</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-surface-600 mb-1 block">Visibility</label>
              <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="input-field">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-medium text-surface-600 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50">
              {submitting ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function CommunicationPage() {
  const { user } = useSelector((s) => s.auth);
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // WebSocket
  const handleWsMessage = useCallback((data) => {
    if (data.type === "message") {
      setMessages((prev) => [...prev, data]);
    } else if (data.type === "user_join" || data.type === "user_leave") {
      setMessages((prev) => [...prev, data]);
    }
  }, []);

  const handleWsTyping = useCallback((data) => {
    if (data.user_id === user?.id) return;
    if (data.is_typing) {
      setTypingUsers((prev) => {
        if (prev.find((u) => u.user_id === data.user_id)) return prev;
        return [...prev, { user_id: data.user_id, user_name: data.user_name }];
      });
      // Auto-remove after 3s
      setTimeout(() => {
        setTypingUsers((prev) => prev.filter((u) => u.user_id !== data.user_id));
      }, 3000);
    } else {
      setTypingUsers((prev) => prev.filter((u) => u.user_id !== data.user_id));
    }
  }, [user?.id]);

  const { sendMessage: wsSend, sendTyping } = useChatWebSocket(
    activeChannel?.slug, handleWsMessage, handleWsTyping
  );

  // Fetch channels
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const res = await api.get("/communication/channels");
        const data = res.data?.data || res.data?.results || (Array.isArray(res.data) ? res.data : []);
        setChannels(data);
        if (data.length > 0 && !activeChannel) setActiveChannel(data[0]);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchChannels();
  }, []);

  // Fetch messages when channel changes
  useEffect(() => {
    if (!activeChannel?.slug) return;
    const fetchMessages = async () => {
      setMessagesLoading(true);
      try {
        const res = await api.get(`/communication/channels/${activeChannel.slug}/messages`);
        const data = res.data?.data || res.data?.results || (Array.isArray(res.data) ? res.data : []);
        setMessages(data);
      } catch (err) { console.error(err); }
      finally { setMessagesLoading(false); }
    };
    fetchMessages();
    setTypingUsers([]);
  }, [activeChannel?.slug]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;

    const content = newMessage.trim();
    setNewMessage("");

    // Try WebSocket first
    const sent = wsSend(content);
    if (!sent) {
      // Fallback to REST API
      try {
        const res = await api.post("/communication/messages", {
          channel_slug: activeChannel.slug,
          content,
        });
        const msg = res.data?.data || res.data;
        setMessages((prev) => [...prev, msg]);
      } catch (err) {
        toast.error("Failed to send message");
        setNewMessage(content); // Restore message
      }
    }
  };

  // Typing indicator
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    sendTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 2000);
  };

  const handleChannelCreated = (channel) => {
    setChannels((prev) => [channel, ...prev]);
    setActiveChannel(channel);
  };

  if (loading) {
    return (
      <div className="h-[calc(100vh-var(--header-height)-4rem)] flex gap-0 rounded-xl overflow-hidden border border-surface-200/60">
        <div className="w-60 skeleton" />
        <div className="flex-1 skeleton" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-var(--header-height)-4rem)] flex rounded-xl overflow-hidden border border-surface-200/60 bg-white shadow-card">
      {/* Channel Sidebar */}
      <div className={`${sidebarOpen ? "w-60" : "w-0"} flex-shrink-0 border-r border-surface-100 flex flex-col transition-all duration-200 overflow-hidden`}>
        <div className="p-3 border-b border-surface-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-surface-800">Channels</h3>
          <button onClick={() => setShowCreateModal(true)}
            className="w-6 h-6 rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 flex items-center justify-center transition-colors" title="Create channel">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {channels.length === 0 ? (
            <p className="text-xs text-surface-400 text-center py-4">No channels yet</p>
          ) : (
            channels.map((ch) => (
              <ChannelItem key={ch.id} channel={ch} active={activeChannel?.id === ch.id}
                onClick={() => setActiveChannel(ch)} />
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-100 flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-500 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          {activeChannel && (
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-surface-800 truncate">
                {activeChannel.icon || "#"} {activeChannel.name}
              </h4>
              <p className="text-xs text-surface-400 truncate">
                {activeChannel.description || `${activeChannel.member_count || 0} members`}
              </p>
            </div>
          )}
          {activeChannel && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-surface-400">{activeChannel.member_count || 0} members</span>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messagesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-surface-100 flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-surface-400">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-surface-700">No messages yet</p>
              <p className="text-xs text-surface-400 mt-1">Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <MessageItem key={msg.id || idx} message={msg}
                isOwn={msg.sender === user?.id || msg.sender?.id === user?.id} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-1">
            <p className="text-xs text-surface-400 animate-pulse">
              {typingUsers.map((u) => u.user_name).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </p>
          </div>
        )}

        {/* Input */}
        {activeChannel && (
          <form onSubmit={handleSend} className="p-3 border-t border-surface-100 flex-shrink-0">
            <div className="flex items-center gap-2 bg-surface-50 rounded-xl px-3 py-2 border border-surface-200 focus-within:border-primary-300 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder={`Message #${activeChannel.name}...`}
                className="flex-1 bg-transparent text-sm text-surface-800 placeholder:text-surface-400 focus:outline-none"
              />
              <button type="submit" disabled={!newMessage.trim()}
                className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center hover:bg-primary-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Create Channel Modal */}
      <CreateChannelModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={handleChannelCreated} />
    </div>
  );
}
