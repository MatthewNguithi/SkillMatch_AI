import React, { useState } from "react";

export default function ScheduleInviteModal({ candidate, jobTitle, onClose, onInviteSuccess }) {
  const [formData, setFormData] = useState({
    interviewDate: "",
    interviewTime: "10:00",
    locationOrLink: "",
    notes: ""
  });
  const [submitting, setSubmitting] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
  const token = localStorage.getItem("access_token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/matching/employer/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: candidate.id,
          match_score: candidate.match_score || 85.0,
          job_title: jobTitle || "General Role",
          interview_date: formData.interviewDate,
          interview_time: formData.interviewTime,
          location_or_link: formData.locationOrLink,
          notes: formData.notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(`Interview invitation sent to ${candidate.full_name}!`);
        if (onInviteSuccess) onInviteSuccess();
        onClose();
      } else {
        alert(data.detail || "Failed to send invitation.");
      }
    } catch (err) {
      alert("Error sending invitation: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="otp-modal-backdrop">
      <div className="otp-modal-content" style={{ maxWidth: "480px" }}>
        <h3 className="otp-modal-title">Schedule Interview</h3>
        <p className="otp-modal-subtitle">
          Inviting <strong>{candidate.full_name}</strong> for <em>{jobTitle || "General Role"}</em>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Interview Date</label>
            <input
              type="date"
              required
              className="form-input"
              value={formData.interviewDate}
              onChange={(e) => setFormData({ ...formData, interviewDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Interview Time (24-hr)</label>
            <input
              type="time"
              required
              className="form-input"
              value={formData.interviewTime}
              onChange={(e) => setFormData({ ...formData, interviewTime: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Meeting Link or Physical Location</label>
            <input
              type="text"
              placeholder="e.g., https://meet.google.com/xyz or HQ Office Room 4"
              required
              className="form-input"
              value={formData.locationOrLink}
              onChange={(e) => setFormData({ ...formData, locationOrLink: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Additional Notes / Instructions</label>
            <textarea
              rows="2"
              placeholder="e.g., Please have your portfolio ready."
              className="form-textarea"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            ></textarea>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginTop: "1.25rem" }}>
            <button type="button" onClick={onClose} className="btn-secondary" style={{ background: "#64748b" }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Sending..." : "📅 Send Invitation & Schedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}