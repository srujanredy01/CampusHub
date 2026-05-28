import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import facultyService from "../services/facultyService";
import WebSocketService from "../services/websocketService";

const chatWS = new WebSocketService();

export default function FacultyChatPage() {
  const { user } = useSelector((s) => s.auth);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [students, setStudents] = useState([]);
  const [searchStudent, setSearchStudent] = useState("");
  const [typingUser, setTypingUser] = useState(null);
  const [filter, setFilter] = useState("all");
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  const fetchChats = useCallback(async () => {
    try {
      const params = filter !== "all" ? { type: filter } : {};
      const res = await facultyService.getChats(params);
      setChats(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  const openChat = async (chat) => {
    setActiveChat(chat);
    try {
      const res = await facultyService.getChatMessages(chat.id);
      setMessages(res.data.data || []);
      scrollToBottom();
    } catch (err) {
      console.error(err);
    }

    // Connect WebSocket for this chat
    const token = localStorage.getItem("access_token");
    if (token) {
      chatWS.disconnect();
      chatWS.connect(`/ws/faculty/chat/${chat.id}/`, token);
      chatWS.on("new_message", (data) => {
        setMessages((prev) => [...prev, data.data || data]);
        scrollToBottom();
      });
      chatWS.on("typing", (data) => {
        setTypingUser(data.data?.user_name || null);
        setTimeout(() => setTypingUser(null), 3000);
      });
      chatWS.on("read_receipt", () => {
        setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
      });
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;
    setSending(true);
    try {
      await facultyService.sendMessage(activeChat.id, { content: newMessage, message_type: "text" });
      setNewMessage("");
      // Message will arrive via WebSocket, but also fetch as fallback
      if (!chatWS.isConnected) {
        const res = await facultyService.getChatMessages(activeChat.id);
        setMessages(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (chatWS.isConnected) {
      chatWS.send({ action: "typing", is_typing: true });
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => {
        chatWS.send({ action: "typing", is_typing: false });
      }, 2000);
    }
  };

  const createNewChat = async (studentId) => {
    try {
      const res = await facultyService.createChat({
        chat_type: "private",
        student_id: studentId,
      });
      setShowNewChat(false);
      fetchChats();
      openChat(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await facultyService.getStudents({ search: searchStudent });
      setStudents(res.data.results || res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (showNewChat) fetchStudents();
  }, [showNewChat, searchStudent]);

  useEffect(() => {
    return () => { chatWS.disconnect(); };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Chat List Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            <button onClick={() => setShowNewChat(true)} className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-lg hover:bg-blue-700">+</button>
          </div>
          <div className="flex gap-1">
            {["all", "private", "subject", "section"].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${filter === f ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:bg-gray-100"}`}>
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No conversations yet</div>
          ) : (
            chats.map((chat) => (
              <div key={chat.id} onClick={() => openChat(chat)}
                className={`px-4 py-3 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition-colors ${activeChat?.id === chat.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""}`}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {chat.chat_type === "private" ? (user?.role === "faculty" ? chat.student_name : chat.faculty_name) : chat.title || chat.subject}
                  </p>
                  {(chat.unread_count_faculty > 0 || chat.unread_count_student > 0) && (
                    <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
                      {user?.role === "faculty" ? chat.unread_count_faculty : chat.unread_count_student}
                    </span>
                  )}
                </div>
                {chat.last_message && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{chat.last_message.content}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    chat.chat_type === "private" ? "bg-green-50 text-green-700" :
                    chat.chat_type === "subject" ? "bg-blue-50 text-blue-700" :
                    "bg-purple-50 text-purple-700"
                  }`}>{chat.chat_type}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {!activeChat ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <span className="text-5xl block mb-3">💬</span>
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm mt-1">Choose from your existing chats or start a new one</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-5 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">
                  {activeChat.chat_type === "private" ? (user?.role === "faculty" ? activeChat.student_name : activeChat.faculty_name) : activeChat.title || activeChat.subject}
                </h3>
                <p className="text-xs text-gray-500">
                  {activeChat.chat_type === "private" ? "Direct Message" : `${activeChat.chat_type} chat`}
                  {activeChat.subject && ` • ${activeChat.subject}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {chatWS.isConnected && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-50 text-green-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>Live
                  </span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === user?.id || msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                    msg.sender === user?.id || msg.sender_id === user?.id
                      ? "bg-blue-600 text-white rounded-br-md"
                      : "bg-white text-gray-900 border border-gray-100 rounded-bl-md shadow-sm"
                  }`}>
                    {msg.sender !== user?.id && msg.sender_id !== user?.id && (
                      <p className="text-xs font-medium text-blue-600 mb-0.5">{msg.sender_name}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    {msg.file && (
                      <a href={msg.file} target="_blank" rel="noopener noreferrer" className="text-xs underline mt-1 block">
                        📎 {msg.file_name || "Attachment"}
                      </a>
                    )}
                    <div className={`flex items-center gap-1 mt-1 ${msg.sender === user?.id || msg.sender_id === user?.id ? "justify-end" : ""}`}>
                      <span className={`text-[10px] ${msg.sender === user?.id || msg.sender_id === user?.id ? "text-blue-200" : "text-gray-400"}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {(msg.sender === user?.id || msg.sender_id === user?.id) && msg.is_read && (
                        <span className="text-[10px] text-blue-200">✓✓</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {typingUser && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                  </span>
                  {typingUser} is typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="px-4 py-3 bg-white border-t border-gray-200">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                />
                <button onClick={sendMessage} disabled={sending || !newMessage.trim()}
                  className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  {sending ? "..." : "→"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">New Conversation</h3>
            <input
              type="text"
              placeholder="Search students..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
            />
            <div className="max-h-60 overflow-y-auto space-y-1">
              {students.map((s) => (
                <button key={s.id} onClick={() => createNewChat(s.id)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors">
                  <p className="text-sm font-medium text-gray-900">{s.full_name}</p>
                  <p className="text-xs text-gray-500">{s.student_id} • {s.branch} • Sec {s.section}</p>
                </button>
              ))}
              {students.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No students found</p>}
            </div>
            <button onClick={() => setShowNewChat(false)} className="mt-4 w-full py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
