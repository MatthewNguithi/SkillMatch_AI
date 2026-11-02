import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";

export default function NavBar() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const token = localStorage.getItem("access_token");
  const role = localStorage.getItem("skillmatch_role");

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (!token) return;

    const fetchUnread = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/messages/unread-count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setUnreadCount(data.unread_count || 0);
        }
      } catch (err) {
        console.error("Error fetching unread message count:", err);
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [token, API_BASE_URL]);

  const handleLogout = () => {
    localStorage.clear();
    setUnreadCount(0);
    navigate("/login");
  };

  const getLinkClass = ({ isActive }) =>
    `navbar-link${isActive ? " active" : ""}`;

  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <span className="navbar-logo-text">
          Skill<span className="navbar-logo-accent">Match</span>
        </span>
      </NavLink>

      <NavLink to="/" className={getLinkClass}>
        Home
      </NavLink>

      {token ? (
        <>
          {role === "student" && (
            <NavLink to="/student" className={getLinkClass}>
              Find Jobs
            </NavLink>
          )}
          {role === "employer" && (
            <NavLink to="/employer" className={getLinkClass}>
              Find Candidates
            </NavLink>
          )}
          
          <NavLink to="/saved-matches" className={getLinkClass}>
            Matches
          </NavLink>

          <NavLink to="/inbox" className={getLinkClass}>
            Messages
            {unreadCount > 0 && (
              <span className="navbar-badge">{unreadCount}</span>
            )}
          </NavLink>

          <button onClick={handleLogout} className="navbar-logout-btn">
            Logout
          </button>
        </>
      ) : (
        <>
          <NavLink to="/login" className={getLinkClass}>
            Login
          </NavLink>
          <NavLink to="/signup" className={getLinkClass}>
            Sign Up
          </NavLink>
        </>
      )}
    </nav>
  );
}