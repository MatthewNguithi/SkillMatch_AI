import { ScoreBar, SkillPill, SecondaryButton } from "./UI";

// Used on the Student results page — one card per matched opportunity
export function OpportunityCard({ result, rank }) {
  const pct = Math.round(result.final_score * 100);
  const labelColor = {
    "match":         "#0E7C7B",
    "partial match": "#E8A838",
    "no match":      "#C0392B",
  }[result.match_label] || "#888";

  return (
    <div style={{
      background: "#fff", borderRadius: "12px",
      border: "1px solid #e5e5e5", padding: "1.25rem", marginBottom: "1rem"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "0.72rem", color: "#888", marginBottom: "2px" }}>Rank {rank}</div>
          <h3 style={{ margin: "0 0 0.15rem", color: "#0D2B55" }}>{result.job_title}</h3>
          <div style={{ color: "#555", fontSize: "0.88rem" }}>
            {result.company} · {result.job_county}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{
            background: labelColor, color: "#fff", borderRadius: "8px",
            padding: "0.35rem 0.7rem", fontWeight: 700, fontSize: "1.05rem"
          }}>{pct}%</div>
          <div style={{ fontSize: "0.7rem", color: labelColor, marginTop: "2px", fontWeight: 500 }}>
            {result.match_label}
          </div>
        </div>
      </div>

      <div style={{ margin: "1rem 0" }}>
        <ScoreBar score={result.semantic_score} label="Semantic match (SBERT)" />
        <ScoreBar score={result.skill_score}    label="Exact skill overlap" />
      </div>

      {result.matched_skills.length > 0 && (
        <div style={{ marginBottom: "0.5rem" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#085041", marginBottom: "3px" }}>
            Matching skills
          </div>
          {result.matched_skills.map(s => <SkillPill key={s} text={s} type="match" />)}
        </div>
      )}

      {result.missing_skills.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#712B13", marginBottom: "3px" }}>
            Skills to develop
          </div>
          {result.missing_skills.map(s => <SkillPill key={s} text={s} type="missing" />)}
        </div>
      )}

      <button style={{
        background: "#0D2B55", color: "#fff", border: "none",
        padding: "0.45rem 1.2rem", borderRadius: "6px",
        cursor: "pointer", fontSize: "0.85rem"
      }}>Apply now</button>
    </div>
  );
}

// Used on the Employer results page — one card per candidate
export function CandidateCard({ candidate, rank }) {
  const pct = Math.round(candidate.final_score * 100);

  return (
    <div style={{
      background: "#fff", borderRadius: "12px",
      border: "1px solid #e5e5e5", padding: "1.25rem", marginBottom: "1rem"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "0.72rem", color: "#888", marginBottom: "2px" }}>Candidate #{rank}</div>
          <h3 style={{ margin: "0 0 0.15rem", color: "#0D2B55" }}>{candidate.name}</h3>
          <div style={{ color: "#555", fontSize: "0.88rem" }}>{candidate.county}</div>
        </div>
        <div style={{
          background: "#0D2B55", color: "#fff", borderRadius: "8px",
          padding: "0.35rem 0.7rem", fontWeight: 700, fontSize: "1.05rem"
        }}>{pct}% fit</div>
      </div>

      <div style={{ margin: "1rem 0" }}>
        <ScoreBar score={candidate.semantic_score} label="Semantic role alignment (SBERT)" />
        <ScoreBar score={candidate.skill_score}    label="Exact skill match" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#085041", marginBottom: "3px" }}>
            Has these skills
          </div>
          {candidate.matched_skills.length > 0
            ? candidate.matched_skills.map(s => <SkillPill key={s} text={s} type="match" />)
            : <span style={{ fontSize: "0.78rem", color: "#aaa" }}>none detected</span>}
        </div>
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#712B13", marginBottom: "3px" }}>
            Would need training in
          </div>
          {candidate.missing_skills.length > 0
            ? candidate.missing_skills.map(s => <SkillPill key={s} text={s} type="missing" />)
            : <span style={{ fontSize: "0.78rem", color: "#0E7C7B", fontWeight: 500 }}>Full skill match</span>}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button style={{
          background: "#0E7C7B", color: "#fff", border: "none",
          padding: "0.45rem 1.1rem", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem"
        }}>Invite to interview</button>
        <SecondaryButton>View full profile</SecondaryButton>
      </div>
    </div>
  );
}