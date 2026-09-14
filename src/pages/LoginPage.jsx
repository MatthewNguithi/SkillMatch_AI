import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../styles/global.css";

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Please enter your email and password.");
      return;
    }

    // Temporary frontend-only login.
    // This will later be replaced with a backend API request.
    console.log("Login details:", form);

    navigate("/student");
  }

  return (
    <section className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>Welcome back</h1>
          <p>Sign in to continue to SkillMatch.</p>
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
            />
          </div>

          <div className="login-options">
            <label className="remember-option">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>

            <Link to="/login" className="forgot-link">
              Forgot password?
            </Link>
          </div>

          <button type="submit" className="login-button">
            Sign in
          </button>
        </form>

        <p className="register-text">
          Don't have an account?{" "}
          <Link to="/student" className="register-link">
            Get started
          </Link>
        </p>
      </div>
    </section>
  );
}