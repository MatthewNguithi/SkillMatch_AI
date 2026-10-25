import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StudentReg from "./StudentReg";
import EmployerReg from "./EmployerReg";
import "../../styles/global.css";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function RegistrationPage() {
  const navigate = useNavigate();
  const [regType, setRegType] = useState("student");

  // OTP Modal State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegistrationSuccess = (userEmail) => {
    setRegisteredEmail(userEmail);
    setShowOtpModal(true);
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: registeredEmail,
          otp_code: otpCode,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Invalid or expired OTP code.");
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("skillmatch_role", data.role);
      localStorage.setItem("skillmatch_user_id", data.user_id);

      if (data.role === "employer") {
        navigate("/employer");
      } else if (data.role === "student") {
        navigate("/student");
      } else if (data.role === "admin") {
        navigate("/admin");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-page">
      <div className="login-card registration-card">
        <div className="login-header">
          <h1>Create an Account</h1>
          <p>Join SkillMatch as a {regType}.</p>
        </div>

        {/* TAB TOGGLE UI */}
        <div className="tab-toggle-container">
          <button 
            type="button"
            onClick={() => setRegType("student")}
            className={`tab-toggle-btn ${regType === "student" ? "active-student" : ""}`}
          >
            Student
          </button>
          <button 
            type="button"
            onClick={() => setRegType("employer")}
            className={`tab-toggle-btn ${regType === "employer" ? "active-employer" : ""}`}
          >
            Employer
          </button>
        </div>

        {/* DYNAMIC FORM LOADING */}
        {regType === "student" ? (
          <StudentReg onSuccess={handleRegistrationSuccess} />
        ) : (
          <EmployerReg onSuccess={handleRegistrationSuccess} />
        )}

        <p className="register-text">
          Already have an account?{" "}
          <Link to="/login" className="register-link">Sign in here</Link>
        </p>
      </div>

      {/* OTP POP-UP MODAL OVERLAY */}
      {showOtpModal && (
        <div className="otp-modal-backdrop">
          <div className="otp-modal-content">
            <h2 className="otp-modal-title">Verify Email OTP</h2>
            <p className="otp-modal-subtitle">
              Enter the 6-digit code sent to <strong>{registeredEmail}</strong>
            </p>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleOtpVerify}>
              <div className="form-group">
                <input
                  type="text"
                  maxLength="6"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  required
                  className="form-input otp-input"
                />
              </div>

              <button
                type="submit"
                className="login-button otp-submit-btn"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify & Log In"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}