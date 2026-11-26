import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Spinner, ErrorBanner } from "../components/UI";
import { CandidateCard, OpportunityCard } from "../components/Matchcard";
import "../styles/global.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const TERMINAL_STATES = new Set(["accepted", "declined", "rejected", "withdrawn"]);

export default function SavedMatchesPage() {
  const [savedItems, setSavedItems] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [applicationsByJobId, setApplicationsByJobId] = useState({});
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [userRole, setUserRole] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const role = localStorage.getItem("skillmatch_role");

    if (!token || (role !== "employer" && role !== "student")) {
      navigate("/login");
      return;
    }

    setUserRole(role);

    async function fetchSavedData() {
      try {
        const endpoint =
          role === "employer"
            ? "/api/v1/matching/saved"
            : "/api/v1/matching/student/saved";

        const requests = [
          fetch(`${API_BASE_URL}${endpoint}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ];

        if (role === "student") {
          requests.push(
            fetch(`${API_BASE_URL}/api/v1/applications/my`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          );
        }

        const [savedRes, appsRes] = await Promise.all(requests);

        if (!savedRes.ok) {
          throw new Error("Failed to load saved items.");
        }

        const savedData = await savedRes.json();
        setSavedItems(savedData.saved_candidates || savedData.saved_jobs || []);

        if (appsRes && appsRes.ok) {
          const appsData = await appsRes.json();
          setAppliedJobIds(new Set(appsData.applied_job_ids || []));

          const appMap = {};
          for (const appItem of appsData.applications || []) {
            if (appItem.job_id != null) {
              appMap[appItem.job_id] = appItem;
            }
          }
          setApplicationsByJobId(appMap);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchSavedData();
  }, [navigate]);

  async function handleApplyNow(item) {
    const token = localStorage.getItem("access_token");
    if (!token) {
      navigate("/login");
      return;
    }

    if (!item.job_id) {
      setError("This saved item does not have a linked job ID to apply to.");
      return;
    }

    setApplyingJobId(item.job_id);
    setError("");
    setNotice("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_id: item.job_id,
          match_score: item.match_score ?? null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to submit application.");
      }

      setAppliedJobIds((prev) => new Set(prev).add(item.job_id));
      if (data.application) {
        setApplicationsByJobId((prev) => ({
          ...prev,
          [item.job_id]: data.application,
        }));
      }
      setSavedItems((prev) =>
        prev.map((entry) =>
          entry.job_id === item.job_id && !entry.lifecycle_status
            ? { ...entry, lifecycle_status: "reviewed" }
            : entry
        )
      );
      setNotice(`Application submitted for ${item.title || item.job_title}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setApplyingJobId(null);
    }
  }

  function handleStatusUpdated(savedMatchId, nextStatus) {
    setSavedItems((prev) =>
      prev.map((entry) =>
        entry.id === savedMatchId
          ? {
              ...entry,
              rsvp_status: nextStatus,
              lifecycle_status: nextStatus,
            }
          : entry
      )
    );
    setNotice(`Invitation marked as ${nextStatus}.`);
  }

  async function handleWithdrawApplication(item, applicationId) {
    const token = localStorage.getItem("access_token");
    if (!token || !applicationId) return;

    if (!window.confirm(`Withdraw your application for "${item.title || item.job_title}"?`)) {
      return;
    }

    setWithdrawingId(applicationId);
    setError("");
    setNotice("");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/applications/${applicationId}/withdraw`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to withdraw application.");
      }

      if (item.job_id != null) {
        setApplicationsByJobId((prev) => {
          const existing = prev[item.job_id];
          if (!existing) return prev;
          return {
            ...prev,
            [item.job_id]: { ...existing, status: "withdrawn" },
          };
        });
      }

      setSavedItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id || (item.job_id != null && entry.job_id === item.job_id)
            ? { ...entry, lifecycle_status: "withdrawn" }
            : entry
        )
      );

      setNotice(`Application withdrawn for ${item.title || item.job_title}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setWithdrawingId(null);
    }
  }

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

      <div className="content-column-md">
        <ErrorBanner message={error} onDismiss={() => setError("")} />

        {notice && (
          <div className="success-message banner-spaced">
            {notice}
          </div>
        )}

        {loading && <Spinner message="Loading your saved matches..." />}

        {!loading && !error && savedItems.length === 0 && (
          <Card className="empty-state">
            <h3>No saved matches yet.</h3>
            <p>Go to your dashboard to evaluate and save top matches.</p>
          </Card>
        )}

        {!loading &&
          userRole === "employer" &&
          Object.entries(
            savedItems.reduce((groups, candidate) => {
              const title = candidate.job_title || "General Applications";
              if (!groups[title]) groups[title] = [];
              groups[title].push(candidate);
              return groups;
            }, {})
          ).map(([jobTitle, candidates]) => (
            <div key={jobTitle} className="saved-group">
              <h2 className="saved-group-heading">
                Role: {jobTitle}
              </h2>
              {candidates.map((candidate, index) => (
                <CandidateCard
                  key={`${jobTitle}-${candidate.id}-${index}`}
                  candidate={candidate}
                  rank={index + 1}
                  searchedJobTitle={candidate.job_title}
                />
              ))}
            </div>
          ))}

        {!loading &&
          userRole === "student" &&
          savedItems.map((item, index) => {
            const linkedApp = item.job_id ? applicationsByJobId[item.job_id] : null;
            const applicationId = item.application_id || linkedApp?.id || null;
            const effectiveStatus = (
              item.lifecycle_status ||
              linkedApp?.status ||
              ""
            ).toLowerCase();
            const canWithdraw =
              Boolean(applicationId) && !TERMINAL_STATES.has(effectiveStatus);

            return (
              <div key={item.id} className="saved-item-wrapper">
                <OpportunityCard
                  result={item}
                  rank={index + 1}
                  onApply={handleApplyNow}
                  onStatusUpdated={handleStatusUpdated}
                  isApplied={appliedJobIds.has(item.job_id)}
                  isApplying={applyingJobId === item.job_id}
                />

                {canWithdraw && (
                  <div className="withdraw-row">
                    <button
                      type="button"
                      disabled={withdrawingId === applicationId}
                      onClick={() => handleWithdrawApplication(item, applicationId)}
                      className="withdraw-btn"
                    >
                      {withdrawingId === applicationId
                        ? "Withdrawing..."
                        : "Withdraw Application"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}