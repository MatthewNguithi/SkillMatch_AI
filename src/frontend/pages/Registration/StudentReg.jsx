import { useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function StudentReg({ onSuccess }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone_number: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: "student" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Registration failed.");
      }

      setSuccess("Success! Check your email for the OTP.");
      
      // FIXED: Corrected reference from formData.email to form.email and triggered parent pop-up
      if (onSuccess) {
        onSuccess(form.email);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {error && <div className="login-error">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="form-grid-2col">
        <div className="form-group">
          <label>First Name</label>
          <input type="text" name="first_name" value={form.first_name} onChange={handleChange} required className="form-input" />
        </div>
        <div className="form-group">
          <label>Last Name</label>
          <input type="text" name="last_name" value={form.last_name} onChange={handleChange} required className="form-input" />
        </div>
      </div>

      <div className="form-group">
        <label>Phone Number</label>
        <input type="tel" name="phone_number" value={form.phone_number} onChange={handleChange} required className="form-input" />
      </div>

      <div className="form-group">
        <label>Email Address</label>
        <input type="email" name="email" value={form.email} onChange={handleChange} required className="form-input" />
      </div>

      <div className="form-group">
        <label>Password</label>
        <input type="password" name="password" value={form.password} onChange={handleChange} required className="form-input" />
      </div>

      <button type="submit" className="login-button" disabled={loading}>
        {loading ? "Creating Account..." : "Register as Student"}
      </button>
    </form>
  );
}