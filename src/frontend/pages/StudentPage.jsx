import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getStudentDashboard, uploadStudentCV } from "../services/api";
import ProfileQualityWidget from "../components/ProfileQualityWidget";
import SemanticSearchBar from "../components/SemanticSearchBar";
import "../styles/global.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function StudentPage() {
  const navigate = useNavigate();

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
  const [hasProfile, setHasProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [displayedJobs, setDisplayedJobs] = useState([]);
  const [resultsHeading, setResultsHeading] = useState("");
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [savingJobId, setSavingJobId] = useState(null);

  const [qualityPreview, setQualityPreview] = useState(null);
  const [analyzingPreview, setAnalyzingPreview] = useState(false);
  const [parsingCV, setParsingCV] = useState(false);
  const [parsedMeta, setParsedMeta] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    async function initDashboard() {
      try {
        const dashData = await getStudentDashboard();
        if (dashData?.has_profile) {
          setHasProfile(true);
          if (dashData.profile) {
            setFormData((prev) => ({
              ...prev,
              fullName: dashData.profile.full_name || prev.fullName,
              phone: dashData.profile.phone || prev.phone,
              institution: dashData.profile.institution || prev.institution,
              course: dashData.profile.course || prev.course,
              yearOfStudy: dashData.profile.year_of_study || prev.yearOfStudy,
              careerGoal: dashData.profile.career_goal || prev.careerGoal,
              opportunityType: dashData.profile.opportunity_type || prev.opportunityType,
              county: dashData.profile.county || prev.county,
              skillsText: dashData.profile.skills_text || prev.skillsText,
              bio: dashData.profile.bio || prev.bio,
            }));
          }
        }

        const savedRes = await fetch(`${API_BASE_URL}/api/v1/matching/student/saved`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (savedRes.ok) {
          const savedData = await savedRes.json();
          const ids = (savedData.saved_jobs || [])
            .filter((item) => !item.can_reapply)
            .map((item) => item.job_id)
            .filter(Boolean);
          setSavedJobIds(new Set(ids));
        }
      } catch (err) {
        setError("Failed to load dashboard data. Please log in again.");
        navigate("/login");
      }
    }

    initDashboard();
  }, [navigate]);

  const handleSearchResults = (results, queryText) => {
    setDisplayedJobs(results || []);
    setResultsHeading(`Search Results for "${queryText}"`);
  };

  const handleClearSearch = () => {
    setDisplayedJobs([]);
    setResultsHeading("");
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setCvFile(selectedFile);
    setParsingCV(true);
    setError("");

    const token = localStorage.getItem("access_token");
    const parsePayload = new FormData();
    parsePayload.append("file", selectedFile);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/student/parse-cv`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: parsePayload,
      });
      const result = await res.json();

      if (res.ok && result.data) {
        const { extracted_skills, institution, phone } = result.data;
        setParsedMeta(result.data);

        setFormData((prev) => {
          const existingSkills = prev.skillsText
            ? prev.skillsText.split(",").map((s) => s.trim()).filter(Boolean)
            : [];
          const combinedSkills = Array.from(
            new Set([...existingSkills, ...(extracted_skills || [])])
          ).join(", ");

          return {
            ...prev,
            phone: prev.phone || phone || "",
            institution: prev.institution || institution || "",
            skillsText: combinedSkills || prev.skillsText,
          };
        });
      }
    } catch (err) {
      console.error("CV Parsing Error:", err);
    } finally {
      setParsingCV(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCheckSuggestions = async () => {
    setAnalyzingPreview(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/api/v1/student/profile-quality/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          career_goal: formData.careerGoal,
          skills_text: formData.skillsText,
          bio: formData.bio,
          course: formData.course,
          opportunity_type: formData.opportunityType,
          institution: formData.institution,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setQualityPreview(data);
      } else {
        setError(data.detail || "Failed to analyze profile suggestions.");
      }
    } catch (err) {
      setError("Error running profile analysis.");
    } finally {
      setAnalyzingPreview(false);
    }
  };

  const handleAddSkillToForm = (skill) => {
    setFormData((prev) => {
      const currentSkills = prev.skillsText
        ? prev.skillsText.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      if (!currentSkills.includes(skill)) {
        const updated = [...currentSkills, skill].join(", ");
        return { ...prev, skillsText: updated };
      }
      return prev;
    });
  };

  const handleSaveMatch = async (job) => {
    if (!hasProfile) {
      setError("Please complete and save your profile & CV below before saving a match.");
      return;
    }

    const resolvedJobId = job.job_id ?? job.id;
    if (!resolvedJobId) {
      setError("Invalid job identifier. Please refresh and try again.");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    setSavingJobId(resolvedJobId);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/matching/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_id: resolvedJobId,
          job_title: job.title,
          match_score: job.match_score ?? 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to save match.");
      }

      setSavedJobIds((prev) => new Set(prev).add(resolvedJobId));
      setDisplayedJobs((prev) =>
        prev.map((item) =>
          (item.job_id ?? item.id) === resolvedJobId
            ? { ...item, can_reapply: false, already_applied: true, status_key: "applied" }
            : item
        )
      );
      setSuccess(`Match saved for "${job.title}". The employer can now view your profile.`);
    } catch (err) {
      setError(err.message || "Could not save match.");
    } finally {
      setSavingJobId(null);
    }
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
    payload.append("file", cvFile);

    try {
      await uploadStudentCV(payload);
      setHasProfile(true);
      setSuccess("Profile and CV submitted! Finding matching opportunities...");

      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/api/v1/student/matches`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const matchData = await res.json();
      if (res.ok) {
        setDisplayedJobs(matchData.matches || []);
        setResultsHeading("Matched Opportunities");
      }
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
        <p className="student-subtitle">
          Search opportunities or complete your profile and CV to match with employers.
        </p>
      </header>

      {error && <div className="login-error banner-spaced">{error}</div>}
      {success && <div className="success-message banner-spaced">{success}</div>}

      {qualityPreview && (
        <ProfileQualityWidget
          qualityData={qualityPreview}
          onAddSkill={handleAddSkillToForm}
        />
      )}

      {/* SEARCH & MATCH RESULTS */}
      <div className="student-card section-spaced">
        <SemanticSearchBar
          target="jobs"
          onSearchResults={handleSearchResults}
          onClear={handleClearSearch}
          placeholder="e.g., Remote entry-level React developer with state management"
          sampleQueries={[            "Remote entry-level React developer with state management",            "Legal intern with contract drafting experience",            "Part-time data analyst using SQL and Python",          ]}
        />

        {!hasProfile && (
          <p className="student-profile-notice">
            Complete and submit your profile &amp; CV below to unlock <strong>Save Match</strong> on search results.
          </p>
        )}

        {resultsHeading && (
          <h2 className="student-results-heading">{resultsHeading}</h2>
        )}

        {displayedJobs.length > 0 && (
          <div className="student-results-list">
            {displayedJobs.map((job, idx) => {
              const resolvedJobId = job.job_id ?? job.id;
              const isSaved =
                Boolean(resolvedJobId && savedJobIds.has(resolvedJobId)) ||
                (Boolean(job.already_applied) && !job.can_reapply);
              const isSaving =
                resolvedJobId != null && savingJobId === resolvedJobId;

              return (
                <div
                  key={resolvedJobId ?? `${job.title}-${idx}`}
                  className="student-job-card"
                >
                  <div className="student-job-card-header">
                    <h3 className="student-job-title">{job.title}</h3>
                    <span className="student-job-score">
                      {job.match_score}% Match
                    </span>
                  </div>
                  <p className="student-job-location">Location: {job.location}</p>
                  <div className="student-job-footer">
                    <span
                      className={`student-source-badge ${
                        job.source_type === "internal" ? "internal" : "external"
                      }`}
                    >
                      {job.source_type === "internal" ? "★ Verified Partner" : "Web Opportunity"}
                    </span>

                    {job.source_url ? (
                      <a
                        href={job.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary btn-compact"
                      >
                        Apply on Web
                      </a>
                    ) : isSaved ? (
                      <button
                        type="button"
                        disabled
                        className="btn-primary btn-compact btn-disabled-muted"
                      >
                        ✓ Match Saved
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSaveMatch(job)}
                        disabled={!hasProfile || isSaving}
                        title={!hasProfile ? "Submit your profile & CV first to save a match" : "Save match and notify employer"}
                        className={`btn-primary btn-compact${!hasProfile ? " btn-blocked" : ""}`}
                      >
                        {isSaving
                          ? "Saving..."
                          : !hasProfile
                          ? "Complete Profile to Match"
                          : job.can_reapply
                          ? "Reapply / Save Match"
                          : "Save Match"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PROFILE FORM */}
      <div className="student-card section-spaced">
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

          <div className="form-group full-width banner-top-spaced">
            <label>Core Skills (Comma separated)</label>
            <textarea
              name="skillsText"
              rows="3"
              value={formData.skillsText}
              onChange={handleChange}
              placeholder="e.g., Python, React, Data Analysis"
              required
              className="form-textarea"
            />
          </div>

          <div className="form-group full-width">
            <label>Upload CV (PDF or DOCX)</label>
            <input
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileChange}
              required
              className="form-input form-input-file"
            />
            {parsingCV && <small className="student-parsing-status">⚡ Extracting skills &amp; details using spaCy NER...</small>}
          </div>

          {parsedMeta && (
            <div className="cv-parser-banner">
              <div className="cv-parser-header">
                <h4 className="cv-parser-title">✨ Automatically Extracted from {cvFile?.name}</h4>
                <span className="cv-parsed-tag">{parsedMeta.extracted_skills?.length || 0} Skills Detected</span>
              </div>
              {parsedMeta.extracted_skills?.length > 0 && (
                <div className="student-parsed-skills">
                  {parsedMeta.extracted_skills.map((skill, idx) => (
                    <span key={idx} className="quality-skill-pill">
                      ✓ {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="consent-box">
            <input
              type="checkbox"
              name="consent"
              checked={formData.consent}
              onChange={handleChange}
              required
              className="consent-checkbox"
            />
            <span className="consent-label">I consent to having my CV processed by the SkillMatch AI model.</span>
          </div>

          <div className="action-row-spaced">
            <button
              type="button"
              onClick={handleCheckSuggestions}
              className="match-card-primary-btn-alt"
              disabled={analyzingPreview}
            >
              {analyzingPreview ? "Analyzing Unsaved Inputs..." : "💡 Get AI Suggestions"}
            </button>

            <button type="submit" className="student-submit-btn" disabled={loading}>
              {loading ? "Analyzing Profile..." : "Save & Match"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}