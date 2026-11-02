import React, { useState, useEffect, useRef } from "react";

export default function InboxPage() {
  const [inbox, setInbox] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const messagesEndRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const token = localStorage.getItem("access_token");

  // Fetch Conversation List
  const fetchInbox = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/messages/inbox`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setInbox(data.inbox || []);
        // Auto-select first thread if none is active
        if (!activeContact && data.inbox?.length > 0) {
          setActiveContact(data.inbox[0]);
        }
      }
    } catch (err) {
      console.error("Inbox fetch error:", err);
    } finally {
      setLoadingInbox(false);
    }
  };

  // Fetch Active Thread Messages
  const fetchThread = async (contactId) => {
    if (!contactId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/messages/thread/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Thread fetch error:", err);
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    fetchInbox();
    const inboxInterval = setInterval(fetchInbox, 6000);
    return () => clearInterval(inboxInterval);
  }, []);

  useEffect(() => {
    if (activeContact) {
      setLoadingThread(true);
      fetchThread(activeContact.contact_id);
      const threadInterval = setInterval(() => fetchThread(activeContact.contact_id), 3000);
      return () => clearInterval(threadInterval);
    }
  }, [activeContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_id: activeContact.contact_id,
          job_title: activeContact.job_title || "General Application",
          content: newMessage
        })
      });

      if (res.ok) {
        setNewMessage("");
        fetchThread(activeContact.contact_id);
        fetchInbox();
      }
    } catch (err) {
      alert("Failed to send message: " + err.message);
    }
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "2rem auto", padding: "0 1rem" }}>
      <h2>Messages</h2>
      <div style={{
        display: "grid", gridTemplateColumns: "320px 1fr", gap: "1rem",
        height: "650px", background: "#fff", borderRadius: "12px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden", border: "1px solid #e2e8f0"
      }}>
        {/* Left Sidebar: Inbox List */}
        <div style={{ borderRight: "1px solid #e2e8f0", overflowY: "auto" }}>
          <div style={{ padding: "1rem", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
            <strong style={{ color: "#0D2B55" }}>Conversations</strong>
          </div>

          {loadingInbox ? (
            <p style={{ padding: "1rem", color: "#64748b" }}>Loading conversations...</p>
          ) : inbox.length === 0 ? (
            <p style={{ padding: "1rem", color: "#94a3b8", fontSize: "0.9rem" }}>No messages yet.</p>
          ) : (
            inbox.map((item) => {
              const isActive = activeContact?.contact_id === item.contact_id;
              return (
                <div
                  key={item.contact_id}
                  onClick={() => setActiveContact(item)}
                  style={{
                    padding: "1rem", borderBottom: "1px solid #f1f5f9", cursor: "pointer",
                    background: isActive ? "#e6f4f1" : "transparent",
                    transition: "background 0.2s"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <strong style={{ fontSize: "0.95rem", color: "#0D2B55" }}>{item.contact_name}</strong>
                    {item.unread_count > 0 && (
                      <span style={{
                        background: "#0E7C7B", color: "#fff", fontSize: "0.7rem",
                        padding: "0.1rem 0.4rem", borderRadius: "10px", fontWeight: "bold"
                      }}>
                        {item.unread_count}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: "500" }}>{item.job_title}</div>
                  <div style={{
                    fontSize: "0.85rem", color: "#475569", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "0.25rem"
                  }}>
                    {item.last_message}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Pane: Active Thread */}
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {activeContact ? (
            <>
              {/* Header */}
              <div style={{ padding: "1rem", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0D2B55" }}>{activeContact.contact_name}</h3>
                <small style={{ color: "#64748b" }}>Role: {activeContact.job_title || "General Application"}</small>
              </div>

              {/* Messages Body */}
              <div style={{ flex: 1, padding: "1rem", overflowY: "auto", background: "#f8fafc" }}>
                {loadingThread ? (
                  <p style={{ textAlign: "center", color: "#64748b" }}>Loading messages...</p>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id !== activeContact.contact_id;
                    return (
                      <div key={msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", marginBottom: "0.75rem" }}>
                        <div style={{
                          maxWidth: "70%", padding: "0.65rem 1rem", borderRadius: "12px",
                          background: isMine ? "#0E7C7B" : "#e2e8f0",
                          color: isMine ? "#fff" : "#1e293b",
                          fontSize: "0.9rem"
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Form */}
              <form onSubmit={handleSend} style={{ padding: "0.75rem", borderTop: "1px solid #e2e8f0", display: "flex", gap: "0.5rem", background: "#fff" }}>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  style={{ flex: 1, padding: "0.6rem 1rem", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }}
                />
                <button type="submit" style={{ padding: "0.6rem 1.25rem", background: "#0E7C7B", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
                  Send
                </button>
              </form>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>
              Select a conversation to view messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}