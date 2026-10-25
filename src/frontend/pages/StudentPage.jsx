import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStudentDashboard, uploadStudentCV } from "../services/api";
import "../styles/global.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function StudentPage() {
  const navigate = useNavigate();

  // Profile Form State
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    institution: "",
    course: "",
    yearOfStudy: "",
    careerGoal: "",
    opportunityType: "",
    county: "",
    skillsText: "",
    bio: "",
    consent: false,
  });
  const [cvFile, setCvFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // AI Matches State
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Load Dashboard and Fetch AI Matches on Mount
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    async function loadDashboardAndMatches() {
      try {
        // Load initial dashboard profile data
        const data = await getStudentDashboard();
        console.log("Protected student data:", data);

        // Fetch AI recommended job matches
        setLoadingMatches(true);
        const res = await fetch(`${API_BASE_URL}/api/v1/student/matches`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const matchData = await res.json();
        if (res.ok) setMatches(matchData.matches || []);
      } catch (err) {
        setError("Failed to load dashboard data. Please log in again.");
        navigate("/login");
      } finally {
        setLoadingMatches(false);
      }
    }

    loadDashboardAndMatches();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    setCvFile(e.target.files[0]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (!cvFile) {
      setError("Please attach your CV (PDF format).");
      setLoading(false);
      return;
    }

    // Map React state to Python snake_case expectations
    const payload = new FormData();
    payload.append("full_name", formData.fullName);
    payload.append("phone", formData.phone);
    payload.append("institution", formData.institution);
    payload.append("course", formData.course);
    payload.append("year_of_study", formData.yearOfStudy);
    payload.append("career_goal", formData.careerGoal);
    payload.append("opportunity_type", formData.opportunityType);
    payload.append("county", formData.county);
    payload.append("skills_text", formData.skillsText);
    payload.append("bio", formData.bio || "");
    payload.append("consent", formData.consent);
    payload.append("file", cvFile); // The file key must match UploadFile = File(...)

    try {
      const response = await uploadStudentCV(payload);
      setSuccess("Profile and CV submitted successfully! Analyzing your skills...");

      // Refresh matches after saving new profile data
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/api/v1/student/matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const matchData = await res.json();
      if (res.ok) setMatches(matchData.matches || []);
    } catch (err) {
      setError(err.message || "Failed to submit profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container-narrow">
      <header className="student-header">
        <h1 className="student-title">Student Dashboard</h1>
        <p className="student-subtitle">Complete your profile and upload your CV to get matched with employers.</p>
      </header>

      {/* SECTION 1: PROFILE FORM */}
      <div className="student-card">
        {error && <div className="login-error">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="profile-form">
          <div className="student-grid">
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} required className="form-input" />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="form-input" />
            </div>

            <div className="form-group">
              <label>Institution</label>
              <input type="text" name="institution" value={formData.institution} onChange={handleChange} required className="form-input" />
            </div>

            <div className="form-group">
              <label>Course of Study</label>
              <input type="text" name="course" value={formData.course} onChange={handleChange} required className="form-input" />
            </div>

            <div className="form-group">
              <label>Year of Study</label>
              <select name="yearOfStudy" value={formData.yearOfStudy} onChange={handleChange} required className="form-select">
                <option value="">Select Year...</option>
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
                <option value="Graduated">Graduated</option>
              </select>
            </div>

            <div className="form-group">
              <label>Opportunity Type</label>
              <select name="opportunityType" value={formData.opportunityType} onChange={handleChange} required className="form-select">
                <option value="">Select Type...</option>
                <option value="Internship">Internship</option>
                <option value="Part-time">Part-time</option>
                <option value="Full-time">Full-time</option>
              </select>
            </div>

            <div className="form-group">
              <label>County / Location</label>
              <input type="text" name="county" value={formData.county} onChange={handleChange} required className="form-input" />
            </div>

            <div className="form-group">
              <label>Career Goal</label>
              <input type="text" name="careerGoal" value={formData.careerGoal} onChange={handleChange} required className="form-input" />
            </div>
          </div>

          <div className="form-group full-width" style={{ marginTop: "1rem" }}>
            <label>Core Skills (Comma separated)</label>
            <textarea name="skillsText" rows="3" value={formData.skillsText} onChange={handleChange} placeholder="e.g., Python, React, Data Analysis" required className="form-textarea"></textarea>
          </div>

          <div className="form-group full-width">
            <label>Upload CV (PDF only)</label>
            <input type="file" accept="application/pdf" onChange={handleFileChange} required className="form-input" style={{ padding: "0.5rem" }} />
          </div>

          <div className="consent-box" style={{ marginTop: "1rem" }}>
            <input type="checkbox" name="consent" checked={formData.consent} onChange={handleChange} required className="consent-checkbox" />
            <span className="consent-label">I consent to having my CV processed by the SkillMatch AI model.</span>
          </div>

          <div className="student-actions" style={{ marginTop: "1.5rem" }}>
            <button type="submit" className="student-submit-btn" disabled={loading}>
              {loading ? "Analyzing Profile..." : "Save & Match"}
            </button>
          </div>
        </form>
      </div>

      <div className="student-card" style={{ marginTop: "2rem" }}>
        <h2>AI Recommended Opportunities</h2>
        {loadingMatches ? (
          <p>Analyzing your profile and matching with live jobs...</p>
        ) : matches.length === 0 ? (
          <p>No job matches found yet. Complete your profile above to generate recommendations!</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            {matches.map((job) => (
              <div key={job.id} style={{ border: "1px solid #e2e8f0", padding: "1.2rem", borderRadius: "10px", background: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0, color: "#0d2b55" }}>{job.title}</h3>
                  <span style={{ background: "#0E7C7B", color: "#fff", padding: "0.25rem 0.75rem", borderRadius: "12px", fontSize: "0.85rem", fontWeight: "bold" }}>
                    {job.match_score}% Match
                  </span>
                </div>
                <p style={{ margin: "0.5rem 0", color: "#64748b", fontSize: "0.9rem" }}>Location: {job.location}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
                  <span style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: job.source_type === "internal" ? "#FEF3C7" : "#E2E8F0", color: job.source_type === "internal" ? "#92400E" : "#475569" }}>
                    {job.source_type === "internal" ? "★ Verified Partner" : "Web Opportunity"}
                  </span>
                  {job.source_url ? (
                    <a href={job.source_url} target="_blank" rel="noreferrer" className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>Apply on Web</a>
                  ) : (
                    <button className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>Apply Directly</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}