const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Helper function to attach the JWT token automatically
async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem("skillmatch_token");

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid — clear storage and redirect to login
    localStorage.removeItem("skillmatch_token");
    localStorage.removeItem("skillmatch_role");
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "API request failed");
  }

  return data;
}

// Exported API calls for your components
export async function getStudentDashboard() {
  return fetchWithAuth("/api/v1/student/dashboard");
}

export async function saveStudentProfile(profileData) {
  return fetchWithAuth("/api/v1/student/profile", {
    method: "POST",
    body: JSON.stringify(profileData),
  });
}

export async function matchEmployerCandidates(opportunityData) {
  return fetchWithAuth("/api/v1/employer/match", {
    method: "POST",
    body: JSON.stringify(opportunityData),
  });
}