import { NavLink, useNavigate } from "react-router-dom";

export default function NavBar() {
  const navigate = useNavigate();

  // Fixed 'getItem' typo and matched the exact keys from your login script
  const token = localStorage.getItem("access_token"); 
  const role = localStorage.getItem("skillmatch_role");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

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

      {!token ? (
        // --- LOGGED OUT VIEW ---
        <NavLink to="/login" style={linkStyle}>Login</NavLink>
      ) : (
        // --- LOGGED IN VIEW ---
        <>
          {role === "student" && (
            <NavLink to="/student" style={linkStyle}>Students</NavLink>
          )}
          
          {role === "employer" && (
            <NavLink to="/employer" style={linkStyle}>Employers</NavLink>
          )}

          {role === "admin" && (
            <NavLink to="/admin" style={linkStyle}>Admin Panel</NavLink>
          )}

          <button 
            onClick={handleLogout} 
            style={{ 
              background: "transparent", 
              border: "1px solid rgba(255, 255, 255, 0.3)", 
              color: "#fff", 
              padding: "0.35rem 1rem", 
              borderRadius: "6px", 
              cursor: "pointer",
              fontSize: "0.9rem",
              marginLeft: "0.5rem"
            }}
          >
            Logout
          </button>
        </>
      )}
    </nav>
  );
}