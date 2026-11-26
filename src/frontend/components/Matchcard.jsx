import { ScoreBar } from "./UI";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChatModal } from "./ChatModal";
import "../styles/global.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function resolveLifecycleStatus(result, isApplied) {
  const explicit = (result.status_key || result.lifecycle_status || "").toLowerCase();
  const jobClosed = (result.job_status || "").toLowerCase() === "closed";

  if (explicit === "hired" || explicit === "accepted") return "hired";
  if (explicit === "withdrawn") return "withdrawn";
  if (jobClosed) {
    if (explicit === "rejected") return "rejected";
    return "closed";
  }
  if (explicit) return explicit;

  const rsvp = (result.rsvp_status || "").toLowerCase();
  if (rsvp === "accepted") return "interview_accepted";
  if (rsvp === "declined") return "declined";
  if (result.itv_invite || result.invited_to_interview) {
    return "invited";
  }
  if (isApplied) {
    return "reviewed";
  }
  return null;
}

function getStatusBadgeConfig(status) {
  switch (status) {
    case "hired":
    case "accepted":
      return { className: "hired", label: "Hired" };
    case "interview_accepted":
      return { className: "interview_accepted", label: "Interview Accepted" };
    case "declined":
      return { className: "declined", label: "Declined Invite" };
    case "rejected":
      return { className: "rejected", label: "Job Closed • Not Selected" };
    case "closed":
      return { className: "closed", label: "Job Closed (No Hire)" };
    case "withdrawn":
      return { className: "withdrawn", label: "Withdrawn" };
    case "invited":
      return { className: "invited", label: "Invited to Interview" };
    case "reviewed":
    case "applied":
      return { className: "reviewed", label: "Applied / Reviewed" };
    default:
      return null;
  }
}

function resolveCandidateStatus(candidate) {
  const explicit = (candidate.candidate_status || "").toLowerCase();
  const jobClosed = (candidate.job_status || "").toLowerCase() === "closed";

  if (explicit === "hired" || explicit === "accepted") return "hired";
  if (explicit === "withdrawn") return "withdrawn";
  if (explicit === "rejected") return "rejected";
  if (jobClosed) return "closed";
  if (
    explicit === "declined" ||
    explicit === "invited" ||
    explicit === "applied" ||
    explicit === "interview_accepted"
  ) {
    return explicit;
  }

  const rsvp = (candidate.rsvp_status || "").toLowerCase();
  if (rsvp === "declined") return "declined";
  if (rsvp === "accepted") return "interview_accepted";
  if (candidate.itv_invite) return "invited";
  if (candidate.already_applied) return "applied";
  return null;
}

export function OpportunityCard({
  result,
  rank,
  onApply,
  onStatusUpdated,
  isApplied = false,
  isApplying = false,
  hideCleared = false,
  onDismissCleared,
}) {
  const [showChat, setShowChat] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState(null);
  const pct = Math.round(result.match_score || 0);

  let labelColor = "#C0392B";
  let matchLabel = "no match";
  if (pct >= 80) {
    labelColor = "#0E7C7B";
    matchLabel = "match";
  } else if (pct >= 50) {
    labelColor = "#E8A838";
    matchLabel = "partial match";
  }

  const lifecycleStatus = resolveLifecycleStatus(result, isApplied);
  const badge = getStatusBadgeConfig(lifecycleStatus);

  const isJobClosed =
    (result.job_status || "").toLowerCase() === "closed" ||
    lifecycleStatus === "closed";

  const canReapply =
    !isJobClosed &&
    (lifecycleStatus === "declined" || lifecycleStatus === "withdrawn");

  const isClearedState =
    lifecycleStatus === "declined" || lifecycleStatus === "withdrawn";

  const isLockedTerminal =
    lifecycleStatus === "hired" ||
    lifecycleStatus === "accepted" ||
    lifecycleStatus === "rejected" ||
    isJobClosed;

  if (dismissed || (hideCleared && isClearedState)) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismissCleared) {
      onDismissCleared(result);
    }
  };

  const handleRsvp = async (nextStatus) => {
    if (!result.id) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    setRsvpLoading(nextStatus);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/matching/student/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          saved_match_id: result.id,
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to update interview response.");
      }
      if (onStatusUpdated) {
        onStatusUpdated(
          result.id,
          nextStatus === "accepted" ? "interview_accepted" : "declined"
        );
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setRsvpLoading(null);
    }
  };

  const cardExtraClass =
    lifecycleStatus === "invited" || lifecycleStatus === "interview_accepted"
      ? " highlighted"
      : isClearedState || lifecycleStatus === "rejected" || isJobClosed
      ? " muted-card"
      : "";

  return (
    <>
      <div className={`match-card${cardExtraClass}`}>
        {badge && (
          <div className="match-card-status-row">
            <span className={`match-card-status-pill ${badge.className}`}>
              Status: {badge.label}
            </span>

            {isClearedState && (
              <button
                type="button"
                onClick={handleDismiss}
                className="match-card-hide-btn"
              >
                Hide from view
              </button>
            )}
          </div>
        )}

        <div className="match-card-header">
          <div>
            <div className="match-card-rank">Rank {rank}</div>
            <h3 className="match-card-title">
              {result.title || result.job_title}
            </h3>
            <div className="match-card-subtitle">
              {result.location || result.county || "Nairobi"}
            </div>
          </div>
          <div className="match-card-score-container">
            <div className="match-card-score" style={{ background: labelColor }}>
              {pct}%
            </div>
            <div className="match-card-label" style={{ color: labelColor }}>
              {matchLabel}
            </div>
          </div>
        </div>

        <div className="match-card-bars">
          <ScoreBar score={pct / 100} label="Semantic match (SBERT)" />
        </div>

        {!isJobClosed && lifecycleStatus === "invited" && result.id ? (
          <div className="match-card-rsvp-actions">
            <button
              type="button"
              className="match-card-primary-btn"
              disabled={rsvpLoading !== null}
              onClick={() => handleRsvp("accepted")}
            >
              {rsvpLoading === "accepted" ? "Accepting..." : "Accept Invite"}
            </button>
            <button
              type="button"
              className="match-card-primary-btn-alt"
              disabled={rsvpLoading !== null}
              onClick={() => handleRsvp("declined")}
            >
              {rsvpLoading === "declined" ? "Declining..." : "Decline"}
            </button>
          </div>
        ) : canReapply ? (
          <button
            type="button"
            className="match-card-primary-btn"
            disabled={isApplying || !result.job_id}
            onClick={() => onApply && onApply(result)}
          >
            {isApplying ? "Submitting..." : "Reapply"}
          </button>
        ) : isLockedTerminal ? (
          <button
            type="button"
            className="match-card-primary-btn btn-disabled-muted"
            disabled
          >
            {badge ? badge.label : "Job Closed"}
          </button>
        ) : lifecycleStatus === "interview_accepted" ? (
          <button
            type="button"
            className="match-card-primary-btn btn-disabled-muted"
            disabled
          >
            Interview Accepted
          </button>
        ) : lifecycleStatus === "reviewed" ||
          lifecycleStatus === "applied" ||
          isApplied ? (
          <button
            type="button"
            className="match-card-primary-btn btn-disabled-muted"
            disabled
          >
            Reviewed
          </button>
        ) : (
          <button
            type="button"
            className="match-card-primary-btn"
            disabled={isApplying || !result.job_id}
            onClick={() => onApply && onApply(result)}
          >
            {isApplying ? "Submitting..." : "Apply now"}
          </button>
        )}
      </div>

      {showChat && (
        <ChatModal
          recipientId={result.employer_id}
          recipientName={result.title || "Employer Partner"}
          jobTitle={result.title || result.job_title}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
}

export function CandidateCard({
  candidate,
  rank,
  searchedJobTitle,
  hideDeclined = false,
  onDismissDeclined,
}) {
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [invited, setInvited] = useState(Boolean(candidate.itv_invite));
  const [inviting, setInviting] = useState(false);
  const pct = Math.round(candidate.match_score || 0);
  const alreadyApplied = Boolean(candidate.already_applied);
  const candidateStatus = resolveCandidateStatus(candidate);
  const isJobClosed =
    (candidate.job_status || "").toLowerCase() === "closed" ||
    candidateStatus === "closed";
  const isHired = candidateStatus === "hired" || candidateStatus === "accepted";
  const isInterviewAccepted = candidateStatus === "interview_accepted";
  const isDeclined = candidateStatus === "declined";
  const isRejected = candidateStatus === "rejected";
  const isWithdrawn = candidateStatus === "withdrawn";
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

  if (dismissed || (hideDeclined && isDeclined)) {
    return null;
  }

  const badgeConfig =
    candidateStatus === "hired" || candidateStatus === "accepted"
      ? { className: "hired", label: "Hired" }
      : candidateStatus === "interview_accepted"
      ? { className: "interview_accepted", label: "Interview Accepted" }
      : candidateStatus === "declined"
      ? { className: "declined", label: "Declined Invite" }
      : candidateStatus === "rejected"
      ? { className: "rejected", label: "Job Closed • Not Selected" }
      : candidateStatus === "closed"
      ? { className: "closed", label: "Job Closed (No Hire)" }
      : candidateStatus === "withdrawn"
      ? { className: "withdrawn", label: "Withdrawn" }
      : null;

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismissDeclined) {
      onDismissDeclined(candidate);
    }
  };

  const openFullProfile = () => {
    const params = new URLSearchParams();
    if (candidate.job_id) params.set("jobId", String(candidate.job_id));
    const roleTitle = searchedJobTitle || candidate.job_title;
    if (roleTitle) params.set("jobTitle", roleTitle);
    if (candidate.match_score != null) {
      params.set("matchScore", String(candidate.match_score));
    }
    const qs = params.toString() ? `?${params.toString()}` : "";
    navigate(`/employer/candidate/${candidate.id}${qs}`);
  };

  const inviteCandidate = async () => {
    if (isInviteBlocked) return;
    setInviting(true);
    try {
      const token = localStorage.getItem("access_token");
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
            job_id: candidate.job_id || null,
            match_score: candidate.match_score,
            job_title:
              searchedJobTitle || candidate.job_title || "General Application",
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to send invitation");
      }

      setInvited(true);
      alert(`Interview invitation sent to ${candidate.full_name}!`);
    } catch (err) {
      alert(err.message);
    } finally {
      setInviting(false);
    }
  };

  const candidateCardExtraClass = isHired
    ? " hired-border"
    : isDeclined || isRejected
    ? " declined-border"
    : isJobClosed
    ? " muted-card"
    : "";

  return (
    <>
      <div className={`match-card${candidateCardExtraClass}`}>
        {badgeConfig && (
          <div className="match-card-status-row">
            <span className={`match-card-status-pill ${badgeConfig.className}`}>
              Status: {badgeConfig.label}
            </span>

            {isDeclined && (
              <button
                type="button"
                onClick={handleDismiss}
                className="match-card-hide-btn"
              >
                Hide from view
              </button>
            )}
          </div>
        )}

        <div className="match-card-header">
          <div>
            <div className="match-card-rank">Candidate #{rank}</div>
            <h3 className="match-card-title">{candidate.full_name}</h3>
            <div className="match-card-subtitle">
              {candidate.course} • {candidate.institution}
              {candidate.county ? ` • ${candidate.county}` : ""}
            </div>
          </div>
          <div className="match-card-score-container">
            <div className="match-card-score employer-theme-score">
              {pct}% fit
            </div>
          </div>
        </div>

        <div className="match-card-bars">
          <ScoreBar score={pct / 100} label="Semantic role alignment (SBERT)" />
        </div>

        {candidate.career_goal && (
          <p className="match-card-goal">
            <strong>Goal:</strong> {candidate.career_goal}
          </p>
        )}

        <div className="match-card-skills-section">
          <div>
            <div className="skill-section-title success">Top Skills</div>
            <p className="skills-text-block">
              {candidate.skills || "None detected"}
            </p>
          </div>
        </div>

        <div className="match-card-actions">
          <button
            type="button"
            onClick={openFullProfile}
            className="match-card-primary-btn-alt match-card-profile-btn"
          >
            View Full Profile &amp; CV
          </button>

          <button
            type="button"
            disabled={isInviteBlocked}
            onClick={inviteCandidate}
            className={`match-card-primary-btn-alt${isInviteBlocked ? " btn-blocked" : ""}`}
          >
            {isHired
              ? "Hired"
              : isInterviewAccepted
              ? "Interview Accepted"
              : isDeclined
              ? "Declined"
              : isRejected
              ? "Not Selected"
              : isWithdrawn
              ? "Withdrawn"
              : isJobClosed
              ? "Job Closed"
              : alreadyApplied
              ? "Already Applied"
              : invited
              ? "Invitation Sent"
              : inviting
              ? "Sending..."
              : "Invite to interview"}
          </button>

          <button
            type="button"
            onClick={() => setShowChat(true)}
            className="match-card-primary-btn posted-jobs-dashboard-btn"
          >
            💬 Message Candidate
          </button>
        </div>
      </div>

      {showChat && (
        <ChatModal
          recipientId={candidate.id}
          recipientName={candidate.full_name}
          jobTitle={searchedJobTitle || candidate.job_title || "General Inquiry"}
          onClose={() => setShowChat(false)}
        />
      )}
    </>
  );
}