import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Card, Spinner, ErrorBanner, ScoreBar } from "../components/UI";
import { ChatModal } from "../components/ChatModal";
import "../styles/global.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function CandidateProfilePage() {
  const { studentUserId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const jobId = searchParams.get("jobId");
  const jobTitle = searchParams.get("jobTitle") || "";
  const queryScore = searchParams.get("matchScore");

  const [candidate, setCandidate] = useState(null);
  const [cvBlobUrl, setCvBlobUrl] = useState(null);
  const [cvError, setCvError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inviting, setInviting] = useState(false);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("skillmatch_role");
    if (!token || (role !== "employer" && role !== "admin")) {
      navigate("/login");
      return;
    }

    let activeBlobUrl = null;

    async function loadProfileAndCv() {
      setLoading(true);
      setError("");
      setCvError("");

      try {
        const params = new URLSearchParams();
        if (jobId) params.set("job_id", jobId);
        if (jobTitle) params.set("job_title", jobTitle);

        const qs = params.toString() ? `?${params.toString()}` : "";
        const res = await fetch(
          `${API_BASE_URL}/api/v1/matching/employer/candidate/${studentUserId}${qs}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || "Unable to load candidate profile.");
        }

        if (data.match_score == null && queryScore) {
          data.match_score = Number(queryScore);
        }
        setCandidate(data);

        if (data.has_cv && data.cv_url) {
          const cvRes = await fetch(`${API_BASE_URL}${data.cv_url}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (cvRes.ok) {
            const blob = await cvRes.blob();
            activeBlobUrl = URL.createObjectURL(blob);
            setCvBlobUrl(activeBlobUrl);
          } else {
            const errJson = await cvRes.json().catch(() => ({}));
            setCvError(errJson.detail || "Could not load CV preview.");
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProfileAndCv();

    return () => {
      if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
      }
    };
  }, [studentUserId, jobId, jobTitle, queryScore, navigate]);

  async function handleInvite() {
    if (!candidate || inviting) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setInviting(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/matching/employer/invite`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            student_id: candidate.id,
            job_id: jobId ? Number(jobId) : candidate.job_id || null,
            match_score: candidate.match_score || 0,
            job_title: jobTitle || candidate.job_title || "General Application",
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to send interview invitation.");
      }

      setCandidate((prev) => ({
        ...prev,
        itv_invite: true,
        candidate_status: "invited",
      }));
      setNotice(`Interview invitation sent to ${candidate.full_name}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  }

  const pct = Math.round(candidate?.match_score || 0);
  const status = (candidate?.candidate_status || "").toLowerCase();
  const isJobClosed = (candidate?.job_status || "").toLowerCase() === "closed";
  const isHired = status === "hired" || status === "accepted";
  const isInterviewAccepted =
    status === "interview_accepted" ||
    (!isHired && candidate?.rsvp_status === "accepted");
  const isDeclined =
    !isJobClosed &&
    (status === "declined" || candidate?.rsvp_status === "declined");
  const isRejected = status === "rejected";
  const isWithdrawn = status === "withdrawn";
  const alreadyApplied = Boolean(candidate?.already_applied);
  const invited = Boolean(candidate?.itv_invite);
  const isInviteBlocked =
    isJobClosed ||
    isHired ||
    isInterviewAccepted ||
    isDeclined ||
    isRejected ||
    isWithdrawn ||
    alreadyApplied ||
    invited ||
    inviting;

  const skillChips = (candidate?.skills || "")
    .split(/[,|/;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="page-container">
      <div className="content-column-lg">
        <div className="candidate-back-bar">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="match-card-primary-btn-alt candidate-back-btn"
          >
            ← Back to Candidates
          </button>
        </div>

        <ErrorBanner message={error} onDismiss={() => setError("")} />

        {notice && (
          <div className="success-message banner-spaced">
            {notice}
          </div>
        )}

        {loading && <Spinner message="Loading full candidate profile and CV..." />}

        {!loading && candidate && (
          <div className="candidate-profile-grid">
            <Card>
              <div className="candidate-profile-header">
                <div>
                  <div className="eyebrow-text">CANDIDATE PROFILE REVIEW</div>
                  <h1 className="candidate-profile-name">
                    {candidate.full_name}
                  </h1>
                  <div className="candidate-profile-sub">
                    {candidate.course || "Course not specified"} •{" "}
                    {candidate.institution || "Institution not specified"}
                  </div>
                </div>

                {candidate.match_score != null && (
                  <div className="match-card-score employer-theme-score">
                    {pct}% fit
                  </div>
                )}
              </div>

              {candidate.match_score != null && (
                <div className="candidate-score-wrap">
                  <ScoreBar score={pct / 100} label="Semantic role alignment (SBERT)" />
                </div>
              )}

              {(jobTitle || candidate.job_title) && (
                <div className="candidate-target-role">
                  <strong>Target Role:</strong> {jobTitle || candidate.job_title}
                </div>
              )}

              <div className="candidate-meta-grid">
                <div>
                  <strong>Year of Study:</strong>
                  <div>{candidate.year_of_study || "Not specified"}</div>
                </div>
                <div>
                  <strong>Opportunity Type:</strong>
                  <div>{candidate.opportunity_type || "Not specified"}</div>
                </div>
                <div>
                  <strong>County:</strong>
                  <div>{candidate.county || "Not specified"}</div>
                </div>
                <div>
                  <strong>Phone:</strong>
                  <div>{candidate.phone || "Not provided"}</div>
                </div>
                {candidate.email && (
                  <div className="candidate-meta-span-full">
                    <strong>Email:</strong>
                    <div>{candidate.email}</div>
                  </div>
                )}
              </div>

              <div className="candidate-section-block">
                <h3 className="candidate-section-heading">Career Goal</h3>
                <p className="candidate-body-copy">
                  {candidate.career_goal || "No career goal stated."}
                </p>
              </div>

              <div className="candidate-section-block">
                <h3 className="candidate-section-heading">Bio &amp; Project Experience</h3>
                <p className="candidate-body-copy-pre">
                  {candidate.bio || "No bio or project summary provided."}
                </p>
              </div>

              {candidate.application_note && (
                <div className="candidate-section-block">
                  <h3 className="candidate-section-heading">Application Note</h3>
                  <p className="candidate-body-copy">
                    {candidate.application_note}
                  </p>
                </div>
              )}

              <div className="candidate-section-block-lg">
                <h3 className="candidate-section-heading-skills">
                  Posted Skills ({skillChips.length})
                </h3>
                {skillChips.length > 0 ? (
                  <div className="skill-chip-list">
                    {skillChips.map((skill, idx) => (
                      <span key={`${skill}-${idx}`} className="skill-chip">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="candidate-empty-copy">No skills listed.</p>
                )}
              </div>

              <div className="match-card-actions">
                <button
                  type="button"
                  disabled={isInviteBlocked}
                  onClick={handleInvite}
                  className={`match-card-primary-btn${isInviteBlocked ? " btn-blocked" : ""}`}
                >
                  {isHired
                    ? "Hired"
                    : isInterviewAccepted
                    ? "Interview Accepted"
                    : isRejected
                    ? "Rejected"
                    : isWithdrawn
                    ? "Withdrawn"
                    : isDeclined
                    ? "Candidate Declined"
                    : isJobClosed
                    ? "Job Closed"
                    : alreadyApplied
                    ? "Already Applied"
                    : invited
                    ? "Invitation Sent"
                    : inviting
                    ? "Sending..."
                    : "Invite to Interview"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowChat(true)}
                  className="match-card-primary-btn-alt"
                >
                  💬 Message Candidate
                </button>
              </div>
            </Card>

            <Card>
              <div className="cv-viewer-header">
                <div>
                  <h2 className="cv-viewer-title">Curriculum Vitae (PDF)</h2>
                  {candidate.cv_filename && (
                    <div className="cv-viewer-filename">
                      {candidate.cv_filename}
                    </div>
                  )}
                </div>

                {cvBlobUrl && (
                  <div className="cv-viewer-actions">
                    <a
                      href={cvBlobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="match-card-primary-btn-alt cv-viewer-action-btn"
                    >
                      Open in New Tab
                    </a>
                    <a
                      href={cvBlobUrl}
                      download={
                        candidate.cv_filename ||
                        `${candidate.full_name || "candidate"}_cv.pdf`
                      }
                      className="match-card-primary-btn cv-viewer-action-btn"
                    >
                      Download PDF
                    </a>
                  </div>
                )}
              </div>

              {cvBlobUrl ? (
                <iframe
                  src={cvBlobUrl}
                  title={`${candidate.full_name} CV`}
                  className="cv-viewer-frame"
                />
              ) : (
                <div className="cv-viewer-empty">
                  {cvError || "This student has not uploaded a PDF CV yet."}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>

      {showChat && candidate && (
        <ChatModal
          recipientId={candidate.id}
          recipientName={candidate.full_name}
          jobTitle={jobTitle || candidate.job_title || "General Inquiry"}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}