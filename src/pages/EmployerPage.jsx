import { useState } from "react";
// import { matchEmployer } from "../components/api";
import {
  Card,
  PrimaryButton,
  Spinner,
  ErrorBanner,
} from "../components/UI";
import { CandidateCard } from "../components/Matchcard";

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

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const response = await matchEmployer(form);

      const returnedResults =
        response.results ||
        response.matches ||
        response.candidates ||
        [];

      setResults(returnedResults);
    } catch (err) {
      setError(err.message || "Unable to find matching candidates.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.heading}>
        <div style={styles.eyebrow}>EMPLOYER MATCHING</div>
        <h1>Find candidates with the right skills</h1>
        <p>
          Describe your internship or job opportunity and receive a ranked
          list of candidates based on semantic skill alignment.
        </p>
      </div>

      <div style={styles.layout}>
        <Card>
          <form onSubmit={handleSubmit}>
            <h2>Opportunity details</h2>

            <div style={styles.formGroup}>
              <label htmlFor="company">Company or organisation</label>
              <input
                id="company"
                name="company"
                value={form.company}
                onChange={handleChange}
                placeholder="Enter company name"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="jobTitle">Job or internship title</label>
              <input
                id="jobTitle"
                name="jobTitle"
                value={form.jobTitle}
                onChange={handleChange}
                placeholder="e.g. Junior Software Developer"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="description">Opportunity description</label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the role, responsibilities and expectations"
                required
                rows={5}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="requiredSkills">Required skills</label>
              <textarea
                id="requiredSkills"
                name="requiredSkills"
                value={form.requiredSkills}
                onChange={handleChange}
                placeholder="e.g. Python, FastAPI, SQL, Git and REST APIs"
                required
                rows={3}
                style={styles.textarea}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="county">Opportunity county</label>
              <select
                id="county"
                name="county"
                value={form.county}
                onChange={handleChange}
                style={styles.input}
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

            <div style={styles.formGroup}>
              <label htmlFor="experienceLevel">Experience level</label>
              <select
                id="experienceLevel"
                name="experienceLevel"
                value={form.experienceLevel}
                onChange={handleChange}
                style={styles.input}
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
          <div style={styles.resultsHeader}>
            <h2>Recommended candidates</h2>
            <span style={styles.resultCount}>
              {results.length} candidate{results.length === 1 ? "" : "s"}
            </span>
          </div>

          <ErrorBanner
            message={error}
            onDismiss={() => setError("")}
          />

          {loading && (
            <Spinner message="Comparing the opportunity with candidate profiles..." />
          )}

          {!loading && !error && results.length === 0 && (
            <Card style={styles.emptyState}>
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

const styles = {
  page: {
    maxWidth: "1180px",
    margin: "0 auto",
    padding: "2rem",
  },

  heading: {
    maxWidth: "700px",
    marginBottom: "2rem",
  },

  eyebrow: {
    color: "#0E7C7B",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 0.85fr) minmax(0, 1.15fr)",
    gap: "2rem",
    alignItems: "start",
  },

  formGroup: {
    marginBottom: "1rem",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: "0.4rem",
    padding: "0.75rem",
    border: "1px solid #d8d8d8",
    borderRadius: "7px",
    fontSize: "0.9rem",
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    marginTop: "0.4rem",
    padding: "0.75rem",
    border: "1px solid #d8d8d8",
    borderRadius: "7px",
    fontSize: "0.9rem",
    resize: "vertical",
    fontFamily: "inherit",
  },

  resultsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    marginBottom: "1rem",
  },

  resultCount: {
    color: "#777",
    fontSize: "0.85rem",
  },

  emptyState: {
    textAlign: "center",
    padding: "2rem",
  },
};