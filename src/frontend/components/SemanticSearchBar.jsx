import React, { useState } from "react";

export default function SemanticSearchBar({
  target = "jobs",
  onSearchResults,
  onClear,
  placeholder,
  sampleQueries = []
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeQuery, setActiveQuery] = useState("");

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const executeSearch = async (searchString) => {
    if (!searchString.trim()) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(
        `${API_BASE_URL}/api/v1/search/semantic?q=${encodeURIComponent(searchString.trim())}&target=${target}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const data = await res.json();
      if (res.ok) {
        setActiveQuery(searchString.trim());
        onSearchResults(data.results || [], searchString.trim());
      }
    } catch (err) {
      console.error("Semantic search error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleChipClick = (sampleText) => {
    setQuery(sampleText);
    executeSearch(sampleText);
  };

  const handleReset = () => {
    setQuery("");
    setActiveQuery("");
    if (onClear) onClear();
  };

  return (
    <div className="semantic-search-box">
      <div className="semantic-search-header">
        <span className="eyebrow-text">AI Semantic Intent Search</span>
        <p className="semantic-search-subtitle">
          Search using natural sentences — SBERT matches core intent instead of exact word matches.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="semantic-search-form">
        <input
          type="text"
          className="form-input semantic-search-input"
          placeholder={placeholder || "Describe what you need in plain text..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="btn-primary semantic-search-btn" disabled={loading}>
          {loading ? "Analyzing..." : "🔍 Search Intent"}
        </button>
        {activeQuery && (
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary"
            style={{ padding: "0.75rem 1rem", fontSize: "0.85rem" }}
          >
            Clear
          </button>
        )}
      </form>

      {sampleQueries.length > 0 && (
        <div className="semantic-chips-container">
          <span className="semantic-chips-label">Preset Intents:</span>
          {sampleQueries.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              className="semantic-chip-btn"
              onClick={() => handleChipClick(sample)}
            >
              "{sample}"
            </button>
          ))}
        </div>
      )}
    </div>
  );
}