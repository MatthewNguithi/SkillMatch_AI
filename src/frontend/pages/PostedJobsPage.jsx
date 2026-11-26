import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/global.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function PostedJobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [companyName, setCompanyName] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "open" | "closed"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchPostedJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const query = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const res = await fetch(`${API_BASE_URL}/api/v1/employer/jobs${query}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to load posted jobs.");
      }
      setCompanyName(data.company_name || "Your Company");
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostedJobs();
  }, [statusFilter]);

  const handleConfirmHire = async (job, cand) => {
    const confirmed = window.confirm(
      `Confirm ${cand.full_name} as Hired for "${job.title}"? You can close the job right after.`
    );
    if (!confirmed) return;

    setSubmittingAction(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${API_BASE_URL}/api/v1/employer/jobs/${job.id}/hire/${cand.student_user_id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to confirm hire.");
      }
      await fetchPostedJobs();
      alert(data.message);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCloseJob = async (job) => {
    const hiredCand = (job.candidates || []).find(
      (c) =>
        Boolean(c.is_hired) ||
        (c.hire_status || "").toLowerCase() === "hired" ||
        (c.application_status || "").toLowerCase() === "hired"
    );
    const confirmMsg = hiredCand
      ? `Close "${job.title}"? ${hiredCand.full_name} will stay marked as Hired.`
      : `Close "${job.title}"?`;

    if (!window.confirm(confirmMsg)) return;

    setSubmittingAction(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${API_BASE_URL}/api/v1/employer/jobs/${job.id}/close`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            selected_student_user_id: hiredCand ? hiredCand.student_user_id : null,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to close job.");
      }
      await fetchPostedJobs();
      alert(data.message);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="posted-jobs-container">
      <div className="posted-jobs-header">
        <div>
          <h1 className="posted-jobs-title">
            Posted Jobs — {companyName}
          </h1>
          <p className="posted-jobs-subtitle">
            Job open/closed state and candidate hire status (Hired / Not Hired) are tracked separately.
          </p>
        </div>

        <div className="posted-jobs-tabs">
          {["all", "open", "closed"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`posted-jobs-tab${statusFilter === tab ? " active" : ""}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="posted-jobs-error">{error}</div>}

      {loading ? (
        <p className="posted-jobs-loading">Loading your posted jobs...</p>
      ) : jobs.length === 0 ? (
        <div className="posted-jobs-empty">
          <p className="posted-jobs-empty-text">
            No posted jobs found for this filter.
          </p>
          <button
            type="button"
            onClick={() => navigate("/employer")}
            className="match-card-primary-btn posted-jobs-dashboard-btn"
          >
            Go to Employer Dashboard
          </button>
        </div>
      ) : (
        <div className="posted-jobs-list">
          {jobs.map((job) => {
            const jobStatus = (job.status || "open").toLowerCase();
            const isClosed = jobStatus === "closed";

            return (
              <div
                key={job.id}
                className={`posted-job-card${isClosed ? " closed" : ""}`}
              >
                <div className="posted-job-top">
                  <div>
                    <div className="posted-job-title-row">
                      <h2 className="posted-job-title">{job.title}</h2>
                      <span
                        className={`posted-job-status-pill ${isClosed ? "closed" : "open"}`}
                      >
                        Job: {isClosed ? "Closed" : "Open"}
                      </span>
                    </div>
                    <div className="posted-job-meta">
                      {job.location || "Kenya"} • {job.opportunity_type || "Opportunity"}
                    </div>
                  </div>

                  {!isClosed && (
                    <div className="posted-job-actions">
                      <button
                        type="button"
                        disabled={submittingAction}
                        onClick={() => handleCloseJob(job)}
                        className="posted-job-close-btn"
                      >
                        {submittingAction ? "Closing..." : "Close Job"}
                      </button>
                    </div>
                  )}
                </div>

                {job.description && (
                  <p className="posted-job-description">{job.description}</p>
                )}

                {job.required_skills && (
                  <div className="posted-job-skills-bar">
                    <span>
                      <strong>Skills:</strong> {job.required_skills}
                    </span>
                  </div>
                )}

                {job.candidates && job.candidates.length > 0 && (
                  <div className="posted-job-candidates-section">
                    <div className="posted-job-candidates-heading">
                      Candidates ({job.candidates.length})
                    </div>
                    <div className="posted-job-candidates-list">
                      {job.candidates.map((cand) => {
                        const isHired =
                          Boolean(cand.is_hired) ||
                          (cand.hire_status || "").toLowerCase() === "hired" ||
                          (cand.application_status || "").toLowerCase() === "hired";
                        const hireLabel = isHired ? "Hired" : "Not Hired";

                        const rsvp = (cand.rsvp_status || "").toLowerCase();
                        const awaitingInviteAccept =
                          !isHired &&
                          !isClosed &&
                          Boolean(cand.itv_invite) &&
                          rsvp !== "accepted" &&
                          rsvp !== "declined";

                        return (
                          <div
                            key={cand.student_user_id}
                            className={`posted-job-candidate-row${isHired ? " hired" : ""}`}
                          >
                            <div>
                              <strong>{cand.full_name}</strong>{" "}
                              <span className="posted-job-candidate-meta">
                                ({cand.course || "Student"}
                                {cand.institution ? ` • ${cand.institution}` : ""})
                              </span>
                            </div>

                            <div className="posted-job-candidate-controls">
                              {cand.match_score != null && (
                                <span className="posted-job-fit-score">
                                  {Math.round(cand.match_score)}% fit
                                </span>
                              )}

                              <span
                                className={`hire-status-badge ${isHired ? "hired" : "not-hired"}`}
                              >
                                {hireLabel}
                              </span>

                              <span
                                className={`job-state-badge ${isClosed ? "closed" : "open"}`}
                              >
                                Job {isClosed ? "Closed" : "Open"}
                              </span>

                              {awaitingInviteAccept && (
                                <span className="awaiting-invite-badge">
                                  Awaiting Invite Accept
                                </span>
                              )}

                              {cand.can_confirm_hire && (
                                <button
                                  type="button"
                                  disabled={submittingAction}
                                  onClick={() => handleConfirmHire(job, cand)}
                                  className="confirm-hire-btn"
                                >
                                  Confirm Hired
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  navigate(
                                    `/employer/candidate/${cand.student_user_id}?jobId=${job.id}&jobTitle=${encodeURIComponent(
                                      job.title || ""
                                    )}`
                                  )
                                }
                                className="profile-cv-btn"
                              >
                                Profile &amp; CV
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}