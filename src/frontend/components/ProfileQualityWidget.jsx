import React from "react";

export default function ProfileQualityWidget({ qualityData, onAddSkill }) {
  if (!qualityData) return null;

  const strengthClass =
    qualityData.strength === "Strong" ? "strength-strong" :
    qualityData.strength === "Medium" ? "strength-medium" : "strength-low";

  return (
    <div className={`student-card quality-widget-card ${strengthClass}`}>
      <div className="quality-header">
        <div>
          <span className="eyebrow-text">Live AI Profile Analysis</span>
          <h3 className="quality-title">
            Score:{" "}
            <span className={`quality-score-value ${strengthClass}`}>
              {qualityData.strength} ({qualityData.score}%)
            </span>
          </h3>
        </div>
        <div className={`quality-score-circle ${strengthClass}`}>
          {qualityData.score}%
        </div>
      </div>

      {qualityData.missing_suggested_skills?.length > 0 && (
        <div className="quality-skills-container">
          <strong className="quality-section-label">
            💡 High-demand skills missing for {qualityData.course}:
          </strong>
          <div className="quality-skills-list">
            {qualityData.missing_suggested_skills.map((skill, idx) => (
              <span
                key={idx}
                onClick={() => onAddSkill && onAddSkill(skill)}
                className="quality-skill-pill clickable"
                title="Click to insert into form"
              >
                + {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {qualityData.feedback_tips?.length > 0 && (
        <div className="quality-feedback-container">
          <strong className="quality-section-label">Suggestions before saving:</strong>
          <ul className="quality-tips-list">
            {qualityData.feedback_tips.map((tip, idx) => (
              <li key={idx} className="quality-tip-item">{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}