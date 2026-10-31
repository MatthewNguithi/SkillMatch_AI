import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Spinner, ErrorBanner } from "../components/UI";
import { CandidateCard, OpportunityCard } from "../components/Matchcard";
import "../styles/global.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function SavedMatchesPage() {
  const [savedItems, setSavedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("skillmatch_role");

    // Secure the route: kick out unauthenticated or invalid roles
    if (!token || (role !== "employer" && role !== "student")) {
      navigate("/login");
      return;
    }

    setUserRole(role);

    async function fetchSavedData() {
      try {
        // Dynamically route the fetch request based on the role
        const endpoint = role === "employer"
          ? "/api/v1/matching/saved"
          : "/api/v1/matching/student/saved";

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error("Failed to load saved items.");
        }

        const data = await response.json();

        // Handle the payload key differences between the two endpoints
        setSavedItems(data.saved_candidates || data.saved_jobs || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchSavedData();
  }, [navigate]);

  return (
    <div className="page-container">
      <div className="employer-heading">
        <div className="eyebrow-text">SAVED MATCHES</div>
        <h1>
          {userRole === "employer"
            ? "Your Shortlisted Candidates"
            : "Your Saved Opportunities"}
        </h1>
        <p>
          {userRole === "employer"
            ? "Review and contact the candidates you have saved for your roles."
            : "Review the job and internship opportunities you have saved."}
        </p>
      </div>

      <div style={{ maxWidth: "850px", margin: "0 auto" }}>
        <ErrorBanner message={error} onDismiss={() => setError("")} />

        {loading && <Spinner message="Loading your saved matches..." />}

        {!loading && !error && savedItems.length === 0 && (
          <Card className="empty-state">
            <h3>No saved matches yet.</h3>
            <p>Go to your dashboard to evaluate and save top matches.</p>
          </Card>
        )}

        {/* Group candidates for employers */}
        {!loading && userRole === "employer" && (
          Object.entries(
            savedItems.reduce((groups, candidate) => {
              const title = candidate.job_title || "General Applications";
              if (!groups[title]) groups[title] = [];
              groups[title].push(candidate);
              return groups;
            }, {})
          ).map(([jobTitle, candidates]) => (
            <div key={jobTitle} style={{ marginBottom: "2.5rem" }}>
              <h2 style={{
                borderBottom: "3px solid #0E7C7B",
                paddingBottom: "0.5rem",
                color: "#0d2b55",
                marginBottom: "1.5rem"
              }}>
                Role: {jobTitle}
              </h2>
              {candidates.map((candidate, index) => (
                <CandidateCard key={candidate.id} candidate={candidate} rank={index + 1} />
              ))}
            </div>
          ))
        )}

        {/* List workplaces for students */}
        {!loading && userRole === "student" && (
          savedItems.map((item, index) => (
            <OpportunityCard key={item.id} result={item} rank={index + 1} />
          ))
        )}
      </div>
    </div>
  );
}