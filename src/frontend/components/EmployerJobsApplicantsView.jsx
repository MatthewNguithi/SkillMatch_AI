import { useState, useEffect, useCallback } from "react";
import "../styles/global.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const STATUS_OPTIONS = ["submitted", "reviewed", "shortlisted", "hired", "rejected"];

export default function EmployerJobsApplicantsView({ refreshTrigger = 0 }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatingAppId, setUpdatingAppId] = useState(null);
  const [closingJobId, setClosingJobId] = useState(null);
  const [messageDrafts, setMessageDrafts] = useState({});
  const [sendingAppId, setSendingAppId] = useState(null);
  const [loadingCvAppId, setLoadingCvAppId] = useState(null);

  const fetchOverview = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/applications/employer/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to load posted jobs and applicants.");
      }
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview, refreshTrigger]);

  const handleCloseOrHireJob = async (job, hiredApplicant = null) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const confirmMessage = hiredApplicant
      ? `Mark ${hiredApplicant.full_name} as Hired for "${job.title}" and close this job posting? Other active applicants will be marked as Rejected.`
      : `Close "${job.title}" without hiring a candidate? It will be marked as Job Closed (No Hire) and removed from active student matches.`;

    if (!window.confirm(confirmMessage)) return;

    setClosingJobId(job.id);
    setError("");
    setNotice("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/employer/jobs/${job.id}/close`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          hired_student_user_id: hiredApplicant ? hiredApplicant.student_user_id : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to close job posting.");
      }

      const hiredUserId = hiredApplicant ? hiredApplicant.student_user_id : null;

      setJobs((prevJobs) =>
        prevJobs.map((j) => {
          if (j.id !== job.id) return j;
          return {
            ...j,
            status: "closed",
            closure_outcome: hiredUserId ? "hired" : "closed_no_hire",
            hired_student_user_id: hiredUserId,
            applicants: j.applicants.map((app) => {
              if (hiredUserId && app.student_user_id === hiredUserId) {
                return { ...app, status: "hired" };
              }
              if (
                app.status !== "hired" &&
                app.status !== "accepted" &&
                app.status !== "withdrawn"
              ) {
                return { ...app, status: hiredUserId ? "rejected" : "closed" };
              }
              return app;
            }),
          };
        })
      );

      setNotice(
        data.message ||
          (hiredApplicant
            ? `${hiredApplicant.full_name} marked as Hired and "${job.title}" closed.`
            : `"${job.title}" closed without hiring a candidate.`)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setClosingJobId(null);
    }
  };

  const handleStatusChange = async (job, applicant, newStatus) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const isClosed = (job.status || "open").toLowerCase() === "closed";
    if (isClosed) return;

    if (newStatus === "hired") {
      await handleCloseOrHireJob(job, applicant);
      return;
    }

    setUpdatingAppId(applicant.application_id);
    setError("");
    setNotice("");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/applications/${applicant.application_id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to update status.");
      }

      setJobs((prevJobs) =>
        prevJobs.map((j) => ({
          ...j,
          applicants: j.applicants.map((item) =>
            item.application_id === applicant.application_id
              ? { ...item, status: newStatus }
              : item
          ),
        }))
      );
      setNotice(`Application status updated to "${newStatus}".`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingAppId(null);
    }
  };

  const handleOpenOrDownloadCv = async (applicant, mode = "view") => {
    const token = localStorage.getItem("access_token");
    if (!token || !applicant.student_user_id) return;

    setLoadingCvAppId(applicant.application_id);
    setError("");

    const endpoint = applicant.cv_url
      ? `${API_BASE_URL}${applicant.cv_url}`
      : `${API_BASE_URL}/api/v1/applications/student/${applicant.student_user_id}/cv`;

    try {
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        let detail = "Unable to retrieve candidate CV.";
        try {
          const errData = await res.json();
          detail = errData.detail || detail;
        } catch {
          // ignore non-JSON error body
        }
        throw new Error(detail);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      if (mode === "download") {
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download =
          applicant.cv_filename ||
          `${(applicant.full_name || "candidate").replace(/\s+/g, "_")}_CV.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
      } else {
        window.open(objectUrl, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCvAppId(null);
    }
  };

  const handleSendMessage = async (applicant, jobTitle) => {
    const token = localStorage.getItem("access_token");
    const content = (messageDrafts[applicant.application_id] || "").trim();
    if (!token || !content || !applicant.student_user_id) return;

    setSendingAppId(applicant.application_id);
    setError("");
    setNotice("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_id: applicant.student_user_id,
          job_title: jobTitle,
          content,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to send message.");
      }

      setMessageDrafts((prev) => ({ ...prev, [applicant.application_id]: "" }));
      setNotice(`Message sent to ${applicant.full_name}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingAppId(null);
    }
  };

  const totalApplicants = jobs.reduce((sum, j) => sum + (j.applicant_count || 0), 0);

  return (
    <div className="student-card section-spaced">
      <div className="applicants-header-row">
        <div>
          <h2 className="applicants-heading">
            Posted Jobs &amp; Applicants ({jobs.length} {jobs.length === 1 ? "Job" : "Jobs"} •{" "}
            {totalApplicants} {totalApplicants === 1 ? "Applicant" : "Applicants"})
          </h2>
          <p className="applicants-subtitle">
            Select a candidate as Hired from the dropdown to close the role with a hire, or close the role directly if no candidate is selected.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOverview}
          className="btn-primary btn-compact-sm"
        >
          Refresh
        </button>
      </div>

      {error && <div className="login-error banner-top-spaced">{error}</div>}
      {notice && <div className="success-message banner-top-spaced">{notice}</div>}

      {loading ? (
        <p className="applicants-status-copy">Loading posted jobs and applicant profiles...</p>
      ) : jobs.length === 0 ? (
        <p className="applicants-empty-copy">
          You have not posted any jobs yet. Use the role posting form above to create your first listing.
        </p>
      ) : (
        <div className="applicants-jobs-list">
          {jobs.map((job) => {
            const isClosed = (job.status || "open").toLowerCase() === "closed";
            const isClosing = closingJobId === job.id;
            const hasHire = Boolean(job.hired_student_user_id);

            const badgeClass = !isClosed
              ? "open"
              : hasHire
              ? "closed-hired"
              : "closed-no-hire";

            const badgeLabel = !isClosed
              ? "Open"
              : hasHire
              ? "Job Closed • Hired"
              : "Job Closed • No Hire";

            return (
              <div
                key={job.id}
                className={`applicants-job-card${isClosed ? " closed" : ""}`}
              >
                <div className="applicants-job-top">
                  <div>
                    <div className="applicants-job-title-row">
                      <h3 className="applicants-job-title">{job.title}</h3>
                      <span className={`applicants-job-badge ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                    </div>
                    <p className="applicants-job-meta">
                      {[job.opportunity_type, job.location].filter(Boolean).join(" • ")}
                    </p>
                  </div>

                  <div className="applicants-job-right-actions">
                    <span
                      className={`applicants-count-pill ${
                        job.applicant_count > 0 ? "has-applicants" : "empty"
                      }`}
                    >
                      {job.applicant_count} {job.applicant_count === 1 ? "Applicant" : "Applicants"}
                    </span>

                    {!isClosed && (
                      <button
                        type="button"
                        disabled={isClosing}
                        onClick={() => handleCloseOrHireJob(job, null)}
                        className="applicants-close-no-hire-btn"
                      >
                        {isClosing ? "Closing..." : "Close Job (No Hire)"}
                      </button>
                    )}
                  </div>
                </div>

                {job.description && (
                  <p className="applicants-job-desc">{job.description}</p>
                )}

                {job.required_skills && (
                  <p className="applicants-job-skills">
                    <strong>Required Skills:</strong> {job.required_skills}
                  </p>
                )}

                <div className="applicants-list-wrap">
                  {job.applicants.length === 0 ? (
                    <p className="applicants-empty-msg">
                      0 applicants for this job so far.
                    </p>
                  ) : (
                    <div className="applicants-cards-stack">
                      {job.applicants.map((applicant) => {
                        const isCvLoading = loadingCvAppId === applicant.application_id;
                        const canAccessCv = applicant.has_cv !== false;
                        const isHired =
                          applicant.status === "hired" || applicant.status === "accepted";
                        const isInterviewAccepted =
                          !isHired &&
                          (applicant.status === "interview_accepted" ||
                            applicant.rsvp_status === "accepted");

                        const selectValue = isHired
                          ? "hired"
                          : STATUS_OPTIONS.includes(applicant.status)
                          ? applicant.status
                          : "submitted";

                        return (
                          <div
                            key={applicant.application_id}
                            className={`applicant-card${isHired ? " hired" : ""}`}
                          >
                            <div className="applicant-card-top">
                              <div>
                                <div className="applicant-name-row">
                                  <h4 className="applicant-name">{applicant.full_name}</h4>
                                  {isHired ? (
                                    <span className="applicant-hired-badge">Hired</span>
                                  ) : (
                                    isInterviewAccepted && (
                                      <span className="applicant-interview-badge">
                                        Interview Accepted
                                      </span>
                                    )
                                  )}
                                </div>
                                <p className="applicant-sub-line">
                                  {[                                    applicant.course,                                    applicant.institution,                                    applicant.year_of_study ? `Year ${applicant.year_of_study}` : null,                                    applicant.county,                                  ]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </p>
                                <p className="applicant-contact-line">
                                  {[applicant.email, applicant.phone].filter(Boolean).join(" • ")}
                                </p>
                              </div>

                              <div className="applicant-actions-group">
                                {applicant.match_score != null && (
                                  <span className="applicant-match-pill">
                                    {applicant.match_score}% Match
                                  </span>
                                )}

                                {canAccessCv ? (
                                  <>
                                    <button
                                      type="button"
                                      disabled={isCvLoading}
                                      onClick={() => handleOpenOrDownloadCv(applicant, "view")}
                                      className="applicant-cv-view-btn"
                                    >
                                      {isCvLoading ? "Loading CV..." : "View CV (PDF)"}
                                    </button>

                                    <button
                                      type="button"
                                      disabled={isCvLoading}
                                      onClick={() => handleOpenOrDownloadCv(applicant, "download")}
                                      className="applicant-cv-download-btn"
                                    >
                                      Download
                                    </button>
                                  </>
                                ) : (
                                  <span className="applicant-no-cv-badge">No CV PDF</span>
                                )}

                                <select
                                  value={selectValue}
                                  disabled={
                                    updatingAppId === applicant.application_id ||
                                    isClosing ||
                                    isClosed
                                  }
                                  onChange={(e) =>
                                    handleStatusChange(job, applicant, e.target.value)
                                  }
                                  className="form-select form-select-inline"
                                >
                                  {STATUS_OPTIONS.map((st) => (
                                    <option key={st} value={st}>
                                      {st.charAt(0).toUpperCase() + st.slice(1)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {applicant.skills_text && (
                              <p className="applicant-detail-line">
                                <strong>Skills:</strong> {applicant.skills_text}
                              </p>
                            )}

                            {applicant.career_goal && (
                              <p className="applicant-detail-line">
                                <strong>Career Goal:</strong> {applicant.career_goal}
                              </p>
                            )}

                            {applicant.bio && (
                              <p className="applicant-detail-line">
                                <strong>Bio / Summary:</strong> {applicant.bio}
                              </p>
                            )}

                            {applicant.note && (
                              <p className="applicant-detail-line">
                                <strong>Application Note:</strong> {applicant.note}
                              </p>
                            )}

                            {applicant.student_user_id && (
                              <div className="applicant-message-row">
                                <input
                                  type="text"
                                  placeholder={`Message ${applicant.full_name}...`}
                                  value={messageDrafts[applicant.application_id] || ""}
                                  onChange={(e) =>
                                    setMessageDrafts((prev) => ({
                                      ...prev,
                                      [applicant.application_id]: e.target.value,
                                    }))
                                  }
                                  className="form-input applicant-message-input"
                                />
                                <button
                                  type="button"
                                  disabled={
                                    sendingAppId === applicant.application_id ||
                                    !(messageDrafts[applicant.application_id] || "").trim()
                                  }
                                  onClick={() => handleSendMessage(applicant, job.title)}
                                  className="btn-primary btn-compact"
                                >
                                  {sendingAppId === applicant.application_id ? "Sending..." : "Message"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}