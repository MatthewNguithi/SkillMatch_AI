import { useState, useEffect } from "react";
import { getStudentDashboard, uploadStudentCV } from "../services/api"; // Ensure uploadStudentCV is exported from api.js
import {useNavigate} from "react-router-dom";
import "../styles/global.css";

export default function StudentPage() {
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

  const navigate = useNavigate();
  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await getStudentDashboard();
        console.log("Protected student data:", data);
        // If data contains an existing profile, you can populate setFormData here
      } catch (err) {
        setError("Failed to load dashboard data. Please log in again.");
        navigate("/login");
      }
    }
    if(!localStorage.getItem("access_token")) {
      navigate("/login");
    } else {
      loadDashboard();
    }
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

    // Package text fields and the PDF file together
    const payload = new FormData();
    Object.keys(formData).forEach((key) => {
      payload.append(key, formData[key]);
    });
    payload.append("cvFile", cvFile);

    try {
      // Pass the FormData payload to your API service
      const response = await uploadStudentCV(payload);
      setSuccess("Profile and CV submitted successfully! We are analyzing your skills.");
      console.log("Saved successfully:", response);
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
    </div>
  );
}