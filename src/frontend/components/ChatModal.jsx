import React, { useState, useEffect, useRef } from "react";

export function ChatModal({ recipientId, recipientName, jobTitle, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const token = localStorage.getItem("access_token");

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchThread = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/messages/thread/${recipientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThread();
    const interval = setInterval(fetchThread, 4000); // Poll every 4s for fresh replies
    return () => clearInterval(interval);
  }, [recipientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_id: recipientId,
          job_title: jobTitle || "General Communication",
          content: newMessage
        })
      });

      if (res.ok) {
        setNewMessage("");
        fetchThread();
      }
    } catch (err) {
      alert("Failed to send message: " + err.message);
    }
  };

  return (
    <div className="chat-modal-overlay" style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
    }}>
      <div className="chat-modal-container" style={{
        background: "#fff", width: "90%", maxWidth: "500px", height: "600px",
        borderRadius: "12px", display: "flex", flexDirection: "column", overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{ padding: "1rem", background: "#0D2B55", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{recipientName}</h3>
            <small style={{ color: "#cbd5e1" }}>Role: {jobTitle}</small>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
        </div>

        {/* Message Body */}
        <div style={{ flex: 1, padding: "1rem", overflowY: "auto", background: "#f8fafc" }}>
          {loading ? (
            <p style={{ textAlign: "center", color: "#64748b" }}>Loading messages...</p>
          ) : messages.length === 0 ? (
            <p style={{ textAlign: "center", color: "#94a3b8", marginTop: "2rem" }}>No messages yet. Start the conversation!</p>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id !== recipientId;
              return (
                <div key={msg.id} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", marginBottom: "0.75rem" }}>
                  <div style={{
                    maxWidth: "75%", padding: "0.6rem 1rem", borderRadius: "12px",
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

        {/* Footer Input */}
        <form onSubmit={handleSend} style={{ padding: "0.75rem", borderTop: "1px solid #e2e8f0", display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            style={{ flex: 1, padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", outline: "none" }}
          />
          <button type="submit" style={{ padding: "0.6rem 1.2rem", background: "#0E7C7B", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}