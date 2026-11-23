import React, { useState } from "react";

export default function InterviewRsvpCard({ inviteRecord, onRsvpUpdate }) {
  const [status, setStatus] = useState(inviteRecord.rsvp_status || "pending");
  const [updating, setUpdating] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const token = localStorage.getItem("access_token");

  const handleRSVP = async (newStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/matching/student/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          saved_match_id: inviteRecord.id,
          status: newStatus
        })
      });

      const data = await res.json();
      if (res.ok) {
        setStatus(newStatus);
        if (onRsvpUpdate) onRsvpUpdate(newStatus);
      } else {
        alert(data.detail || "Failed to update RSVP status.");
      }
    } catch (err) {
      alert("Error processing RSVP: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const icsDownloadUrl = `${API_BASE_URL}/api/v1/matching/interview/${inviteRecord.id}/ics`;

  return (
    <div className="interview-card">
      <div className="interview-card-header">
        <h4 className="interview-card-title">
          📅 Interview Invitation: {inviteRecord.title || inviteRecord.job_title}
        </h4>
        <span className={`rsvp-badge ${status}`}>
          RSVP: {status}
        </span>
      </div>

      <div className="interview-details-grid">
        <div className="interview-detail-item">
          <strong>Date:</strong> {inviteRecord.interview_date || "To be confirmed"}
        </div>
        <div className="interview-detail-item">
          <strong>Time:</strong> {inviteRecord.interview_time || "TBD"}
        </div>
        <div className="interview-detail-item" style={{ gridColumn: "1 / -1" }}>
          <strong>Location / Link:</strong>{" "}
          {inviteRecord.location_or_link?.startsWith("http") ? (
            <a href={inviteRecord.location_or_link} target="_blank" rel="noreferrer" style={{ color: "#0E7C7B" }}>
              {inviteRecord.location_or_link}
            </a>
          ) : (
            inviteRecord.location_or_link || "Online"
          )}
        </div>
      </div>

      <div className="interview-actions">
        {status !== "accepted" && (
          <button
            onClick={() => handleRSVP("accepted")}
            disabled={updating}
            className="btn-accept"
          >
            ✓ Accept
          </button>
        )}

        {status !== "declined" && (
          <button
            onClick={() => handleRSVP("declined")}
            disabled={updating}
            className="btn-decline"
          >
            ✕ Decline
          </button>
        )}

        <a
          href={icsDownloadUrl}
          download={`interview_${inviteRecord.id}.ics`}
          className="btn-ics-download"
        >
          📥 Add to Calendar (.ics)
        </a>
      </div>
    </div>
  );
}