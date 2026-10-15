import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/global.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function LoginPage() {
  const navigate = useNavigate();

  // New state to track which tab is active
  const [loginType, setLoginType] = useState("student"); 
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const formData = new URLSearchParams();
    formData.append("username", form.email);
    formData.append("password", form.password);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Authentication failed.");
      }

      // STRICT ROLE CHECK: Ensure they are logging into the correct portal
      if (data.role !== loginType && data.role !== "admin") {
        throw new Error(`You are registered as a ${data.role}, but tried to log in as an ${loginType}.`);
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("skillmatch_role", data.role);
      localStorage.setItem("skillmatch_user_id", data.user_id);

      if (data.role === "employer") {
        navigate("/employer");
      } else {
        navigate("/student");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>{loginType === "student" ? "Student Login" : "Employer Login"}</h1>
          <p>Sign in to your {loginType} account.</p>
        </div>

        {/* TAB TOGGLE UI */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem", background: "#f1f5f9", padding: "5px", borderRadius: "8px" }}>
          <button 
            type="button"
            onClick={() => { setLoginType("student"); setError(""); }}
            style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", background: loginType === "student" ? "#fff" : "transparent", boxShadow: loginType === "student" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", color: loginType === "student" ? "#0E7C7B" : "#64748b" }}
          >
            Student
          </button>
          <button 
            type="button"
            onClick={() => { setLoginType("employer"); setError(""); }}
            style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", background: loginType === "employer" ? "#fff" : "transparent", boxShadow: loginType === "employer" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", color: loginType === "employer" ? "#0d2b55" : "#64748b" }}
          >
            Employer
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>

          <div className="login-options">
            <label className="remember-option">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <Link to="/reset-password" className="forgot-link">Forgot password?</Link>
          </div>

          <button type="submit" className="login-button" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="register-text">
          Don't have an account?{" "}
          <Link to="/signup" className="register-link">Create one here</Link>
        </p>
      </div>
    </section>
  );
}