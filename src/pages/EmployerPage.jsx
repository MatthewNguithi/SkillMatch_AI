import { useState } from "react";
// import { matchEmployer } from "../components/api";
import { Card, PrimaryButton, Spinner, ErrorBanner } from "../components/UI";
import { CandidateCard } from "../components/Matchcard";
import "../styles/global.css";

export default function EmployerPage() {
  const [form, setForm] = useState({
    company: "",
    jobTitle: "",
    description: "",
    requiredSkills: "",
    county: "Nairobi",
    experienceLevel: "Entry level",
  });

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResults([]);

    try {
      const response = await matchEmployer(form);
      const returnedResults = response.results || response.matches || response.candidates || [];
      setResults(returnedResults);
    } catch (err) {
      setError(err.message || "Unable to find matching candidates.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-container">
      <div className="employer-heading">
        <div className="eyebrow-text">EMPLOYER MATCHING</div>
        <h1>Find candidates with the right skills</h1>
        <p>
          Describe your internship or job opportunity and receive a ranked
          list of candidates based on semantic skill alignment.
        </p>
      </div>

      <div className="employer-layout">
        <Card>
          <form onSubmit={handleSubmit}>
            <h2>Opportunity details</h2>

            <div className="form-group">
              <label htmlFor="company">Company or organisation</label>
              <input
                id="company"
                name="company"
                value={form.company}
                onChange={handleChange}
                placeholder="Enter company name"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="jobTitle">Job or internship title</label>
              <input
                id="jobTitle"
                name="jobTitle"
                value={form.jobTitle}
                onChange={handleChange}
                placeholder="e.g. Junior Software Developer"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Opportunity description</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the role, responsibilities and expectations"
                required
                rows={5}
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label htmlFor="requiredSkills">Required skills</label>
              <textarea
                id="requiredSkills"
                name="requiredSkills"
                value={form.requiredSkills}
                onChange={handleChange}
                placeholder="e.g. Python, FastAPI, SQL, Git and REST APIs"
                required
                rows={3}
                className="form-textarea"
              />
            </div>

            <div className="form-group">
              <label htmlFor="county">Opportunity county</label>
              <select
                id="county"
                name="county"
                value={form.county}
                onChange={handleChange}
                className="form-select"
              >
                <option value="Nairobi">Nairobi</option>
                <option value="Mombasa">Mombasa</option>
                <option value="Kisumu">Kisumu</option>
                <option value="Nakuru">Nakuru</option>
                <option value="Kiambu">Kiambu</option>
                <option value="Machakos">Machakos</option>
                <option value="Meru">Meru</option>
                <option value="Uasin Gishu">Uasin Gishu</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="experienceLevel">Experience level</label>
              <select
                id="experienceLevel"
                name="experienceLevel"
                value={form.experienceLevel}
                onChange={handleChange}
                className="form-select"
              >
                <option value="Entry level">Entry level</option>
                <option value="Internship">Internship</option>
                <option value="Graduate">Graduate</option>
                <option value="Junior">Junior</option>
                <option value="Mid level">Mid level</option>
              </select>
            </div>

            <PrimaryButton type="submit" fullWidth disabled={loading}>
              {loading ? "Finding candidates..." : "Find matching candidates"}
            </PrimaryButton>
          </form>
        </Card>

        <div>
          <div className="results-header">
            <h2>Recommended candidates</h2>
            <span className="result-count">
              {results.length} candidate{results.length === 1 ? "" : "s"}
            </span>
          </div>

          <ErrorBanner message={error} onDismiss={() => setError("")} />

          {loading && <Spinner message="Comparing the opportunity with candidate profiles..." />}

          {!loading && !error && results.length === 0 && (
            <Card className="empty-state">
              <h3>Your candidate recommendations will appear here</h3>
              <p>
                Enter the opportunity requirements and click the matching
                button to generate ranked candidates.
              </p>
            </Card>
          )}

          {!loading &&
            results.map((candidate, index) => (
              <CandidateCard
                key={candidate.id || candidate.candidate_id || index}
                candidate={candidate}
                rank={index + 1}
              />
            ))}
        </div>
      </div>
    </div>
  );
}