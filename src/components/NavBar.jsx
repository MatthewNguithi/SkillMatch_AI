import { NavLink } from "react-router-dom";

export default function NavBar() {
  const linkStyle = ({ isActive }) => ({
    color: isActive ? "#0E7C7B" : "#fff",
    background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
    padding: "0.35rem 1rem",
    borderRadius: "6px",
    textDecoration: "none",
    fontSize: "0.9rem",
    fontWeight: isActive ? 600 : 400,
    transition: "background 0.15s",
  });

  return (
    <nav style={{
      background: "#0D2B55", display: "flex",
      alignItems: "center", padding: "0 2rem", height: "56px", gap: "0.5rem"
    }}>
      <NavLink to="/" style={{ marginRight: "auto", textDecoration: "none" }}>
        <span style={{ color: "#0E7C7B", fontWeight: 700, fontSize: "1.2rem" }}>
          Skill<span style={{ color: "#E8A838" }}>Match</span>
        </span>
      </NavLink>
      <NavLink to="/" style={linkStyle}>Home</NavLink>
      <NavLink to="/student" style={linkStyle}>Students</NavLink>
      <NavLink to="/employer" style={linkStyle}>Employers</NavLink>
      <NavLink to="/login" style={linkStyle}>Login</NavLink>
    </nav>
  );
}