import { ScoreBar, SkillPill, SecondaryButton } from "./UI";

// Used on the Student results page — one card per matched opportunity
export function OpportunityCard({ result, rank }) {
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

  const isInvited = result.itv_invite || result.invited_to_interview;

  return (
    <div
      className="match-card"
      style={isInvited ? { borderColor: "#0E7C7B", borderWidth: "2px" } : {}}
    >
      {isInvited && (
        <div style={{
          background: "#e6f4f1",
          color: "#0E7C7B",
          display: "inline-block",
          padding: "0.25rem 0.65rem",
          borderRadius: "20px",
          fontSize: "0.75rem",
          fontWeight: "700",
          marginBottom: "0.6rem"
        }}>
          🎉 Interview Invited!
        </div>
      )}

      <div className="match-card-header">
        <div>
          <div className="match-card-rank">Rank {rank}</div>
          <h3 className="match-card-title">{result.title || result.job_title}</h3>
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

      <button className="match-card-primary-btn">
        {isInvited ? "Accept & Respond" : "Apply now"}
      </button>
    </div>
  );
}
export function CandidateCard({ candidate, rank, searchedJobTitle }) {
  const pct = Math.round(candidate.match_score || 0);

  const inviteCandidate = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

      const response = await fetch(`${API_BASE_URL}/api/v1/matching/employer/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: candidate.id,
          match_score: candidate.match_score,
          job_title: searchedJobTitle || "General Application"
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to send Interview Invitation");

      alert("Candidate has successfully received Interview Invitation.");
    } catch (err) {
      alert("error saving candidate:" + err.message)
    }
  };

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

      const response = await fetch(`${API_BASE_URL}/api/v1/matching/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          student_id: candidate.id,
          match_score: candidate.match_score,
          job_title: searchedJobTitle || "General Application"
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Failed to save");

      alert("Candidate successfully saved for this role!");
    } catch (err) {
      alert("Error saving candidate: " + err.message);
    }
  };

  return (
    <div className="match-card">
      <div className="match-card-header">
        <div>
          <div className="match-card-rank">Candidate #{rank}</div>
          <h3 className="match-card-title">{candidate.full_name}</h3>
          <div className="match-card-subtitle">
            {candidate.course} • {candidate.institution}
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

      <div className="match-card-skills-section">
        <div>
          <div className="skill-section-title success">Top Skills</div>
          <p className="skills-text-block">{candidate.skills || "None detected"}</p>
        </div>
      </div>

      <div className="match-card-actions">
        <button onClick={inviteCandidate} className="match-card-primary-btn-alt">Invite to interview</button>
        <button onClick={handleSave} className="match-card-primary-btn" style={{ background: "#64748b" }}>
          Save Candidate
        </button>
      </div>
    </div>
  );
}