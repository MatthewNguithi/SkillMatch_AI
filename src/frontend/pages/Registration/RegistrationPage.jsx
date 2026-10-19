import { useState } from "react";
import { Link } from "react-router-dom";
import StudentReg from "./StudentReg";
import EmployerReg from "./EmployerReg";
import "../../styles/global.css";

export default function RegistrationPage() {
  const [regType, setRegType] = useState("student");

  return (
    <section className="login-page">
      <div className="login-card" style={{ maxWidth: "500px" }}>
        <div className="login-header">
          <h1>Create an Account</h1>
          <p>Join SkillMatch as a {regType}.</p>
        </div>

        {/* TAB TOGGLE UI */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem", background: "#f1f5f9", padding: "5px", borderRadius: "8px" }}>
          <button 
            type="button"
            onClick={() => setRegType("student")}
            style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", background: regType === "student" ? "#fff" : "transparent", boxShadow: regType === "student" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", color: regType === "student" ? "#0E7C7B" : "#64748b" }}
          >
            Student
          </button>
          <button 
            type="button"
            onClick={() => setRegType("employer")}
            style={{ flex: 1, padding: "8px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", background: regType === "employer" ? "#fff" : "transparent", boxShadow: regType === "employer" ? "0 1px 3px rgba(0,0,0,0.1)" : "none", color: regType === "employer" ? "#0d2b55" : "#64748b" }}
          >
            Employer
          </button>
        </div>

        {/* DYNAMIC FORM LOADING */}
        {regType === "student" ? <StudentReg /> : <EmployerReg />}

        <p className="register-text">
          Already have an account?{" "}
          <Link to="/login" className="register-link">Sign in here</Link>
        </p>
      </div>
    </section>
  );
}