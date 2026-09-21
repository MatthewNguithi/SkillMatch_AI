import { useState, useEffect } from "react";
import { getStudentDashboard, saveStudentProfile } from "../components/api";

export default function StudentPage() {
  const [formData, setFormData] = useState({ /* ... */ });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Example: Fetch student data on page load
  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await getStudentDashboard();
        console.log("Protected student data:", data);
      } catch (err) {
        setError(err.message);
      }
    }
    loadDashboard();
  }, []);

  // Submit profile to protected FastAPI route
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await saveStudentProfile(formData);
      console.log("Saved successfully:", response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Your Student Form JSX */}
    </div>
  );
}