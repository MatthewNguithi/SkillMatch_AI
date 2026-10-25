import { ScoreBar, SkillPill, SecondaryButton } from "./UI";

// Used on the Student results page — one card per matched opportunity
export function OpportunityCard({ result, rank }) {
  // Gracefully handle the single match_score from the backend payload
  const pct = Math.round(result.match_score || 0);
  
  // Basic logic to determine match label color based on score
  let labelColor = "#C0392B"; // No match default
  let matchLabel = "no match";
  if (pct >= 80) {
    labelColor = "#0E7C7B";
    matchLabel = "match";
  } else if (pct >= 50) {
    labelColor = "#E8A838";
    matchLabel = "partial match";
  }

  return (
    <div className="match-card">
      <div className="match-card-header">
        <div>
          <div className="match-card-rank">Rank {rank}</div>
          <h3 className="match-card-title">{result.title || result.job_title}</h3>
          <div className="match-card-subtitle">
            {result.location || result.county}
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

      <button className="match-card-primary-btn">Apply now</button>
    </div>
  );
}

// Used on the Employer results page — one card per candidate
export function CandidateCard({ candidate, rank }) {
  // Use candidate.match_score directly from the API payload
  const pct = Math.round(candidate.match_score || 0);

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
        <button className="match-card-primary-btn-alt">Invite to interview</button>
        <SecondaryButton>View full profile</SecondaryButton>
      </div>
    </div>
  );
}