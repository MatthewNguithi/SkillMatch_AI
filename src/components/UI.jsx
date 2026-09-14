// Shared reusable components used across multiple pages

export function Card({ children, style }) {
  return (
    <div style={{
      background: "#fff", borderRadius: "12px",
      border: "1px solid #e5e5e5", padding: "1.25rem",
      ...style
    }}>{children}</div>
  );
}

export function ScoreBar({ score, label }) {
  const pct   = Math.round(score * 100);
  const color = pct >= 70 ? "#0E7C7B" : pct >= 45 ? "#E8A838" : "#C0392B";
  return (
    <div style={{ marginBottom: "0.5rem" }}>
      {label && (
        <div style={{ fontSize: "0.78rem", color: "#666", marginBottom: "2px" }}>
          {label}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ flex: 1, height: "7px", background: "#eee", borderRadius: "4px", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "4px" }} />
        </div>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color, minWidth: "32px" }}>
          {pct}%
        </span>
      </div>
    </div>
  );
}

export function SkillPill({ text, type = "neutral" }) {
  const styles = {
    match:   { bg: "#E1F5EE", color: "#085041" },
    missing: { bg: "#FAECE7", color: "#712B13" },
    neutral: { bg: "#F1EFE8", color: "#444441" },
  };
  const s = styles[type] || styles.neutral;
  return (
    <span style={{
      background: s.bg, color: s.color, padding: "2px 10px",
      borderRadius: "12px", fontSize: "0.75rem", fontWeight: 500,
      display: "inline-block", margin: "2px"
    }}>{text}</span>
  );
}

export function Spinner({ message = "Matching with SBERT..." }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem", color: "#888" }}>
      <div style={{
        width: "32px", height: "32px", border: "3px solid #eee",
        borderTop: "3px solid #0E7C7B", borderRadius: "50%",
        animation: "spin 0.8s linear infinite", margin: "0 auto 1rem"
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {message}
    </div>
  );
}

export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div style={{
      background: "#FAECE7", border: "1px solid #F0997B",
      borderRadius: "8px", padding: "0.75rem 1rem",
      color: "#712B13", fontSize: "0.9rem",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      marginBottom: "1rem"
    }}>
      {message}
      {onDismiss && (
        <button onClick={onDismiss} style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#712B13", fontSize: "1.1rem", lineHeight: 1
        }}>×</button>
      )}
    </div>
  );
}

export function PrimaryButton({ children, onClick, type = "button", disabled, fullWidth }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: fullWidth ? "100%" : "auto",
        background: disabled ? "#aaa" : "#0E7C7B",
        color: "#fff", border: "none",
        padding: "0.75rem 1.5rem", borderRadius: "8px",
        fontSize: "0.95rem", fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >{children}</button>
  );
}

export function SecondaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "#f5f5f5", color: "#333",
        border: "none", padding: "0.5rem 1.1rem",
        borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem"
      }}
    >{children}</button>
  );
}

export const COUNTIES = [
  "Nairobi","Mombasa","Kisumu","Nakuru","Eldoret",
  "Thika","Kisii","Kakamega","Machakos","Meru",
  "Nyeri","Kitale","Malindi","Garissa","Kisii",
];