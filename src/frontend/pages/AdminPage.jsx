import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/global.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function AdminPage() {
  const navigate = useNavigate();
  const [pendingEmployers, setPendingEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchPendingEmployers = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return navigate("/login");

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/pending-employers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403 || res.status === 401) {
        setError("Unauthorized access. Admin privileges required.");
        return;
      }

      const data = await res.json();
      if (res.ok) {
        setPendingEmployers(data.pending_employers || []);
      } else {
        setError(data.detail || "Failed to load pending employers.");
      }
    } catch (err) {
      setError("Network error while loading pending applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingEmployers();
  }, [navigate]);

  const handleAction = async (userId, action) => {
    const token = localStorage.getItem("access_token");
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/${action}-employer/${userId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setPendingEmployers((prev) => prev.filter((emp) => emp.user_id !== userId));
      } else {
        setError(data.detail || `Failed to ${action} employer.`);
      }
    } catch (err) {
      setError(`Error executing ${action} action.`);
    }
  };

  return (
    <div className="page-container">
      <header className="student-header">
        <h1 className="student-title">Admin Management Portal</h1>
        <p className="student-subtitle">Review and verify employer accounts to grant platform posting access.</p>
      </header>

      {error && <div className="login-error" style={{ marginBottom: "1rem" }}>{error}</div>}
      {message && <div className="success-message" style={{ marginBottom: "1rem" }}>{message}</div>}

      <div className="student-card">
        <h2>Pending Employer Approvals</h2>

        {loading ? (
          <p>Loading pending accounts...</p>
        ) : pendingEmployers.length === 0 ? (
          <p style={{ color: "#64748b", marginTop: "1rem" }}>No pending employer accounts awaiting verification.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", marginTop: "1rem" }}>
            {pendingEmployers.map((emp) => (
              <div
                key={emp.user_id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  background: "#f8fafc",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: 0, color: "#0d2b55" }}>{emp.company_name}</h3>
                    <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "#475569" }}>
                      <strong>Contact:</strong> {emp.first_name} {emp.last_name} ({emp.email})
                    </p>
                    <p style={{ margin: "0.25rem 0", fontSize: "0.9rem", color: "#475569" }}>
                      <strong>Phone:</strong> {emp.phone_number || "N/A"}
                    </p>
                    {emp.company_website && (
                      <p style={{ margin: "0.25rem 0", fontSize: "0.9rem" }}>
                        <strong>Website:</strong>{" "}
                        <a href={emp.company_website} target="_blank" rel="noreferrer" style={{ color: "#0E7C7B" }}>
                          {emp.company_website}
                        </a>
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => handleAction(emp.user_id, "approve")}
                      className="btn-primary"
                      style={{ background: "#10b981", padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(emp.user_id, "reject")}
                      className="btn-primary"
                      style={{ background: "#ef4444", padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                    >
                      Reject
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #cbd5e1" }}>
                  <strong style={{ fontSize: "0.85rem", color: "#334155" }}>Company Overview:</strong>
                  <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>{emp.company_description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}