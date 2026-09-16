import { useState } from "react";
import "../styles/global.css";

export default function StudentPage() {
  const [formData, setFormData] = useState({
    fullName: "", email: "", phone: "", institution: "",
    course: "", yearOfStudy: "", careerGoal: "", opportunityType: "",
    county: "", skills: "", bio: "", cv: null, consent: false,
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (event) => {
    const { name, value, type, checked, files } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : type === "file" ? files[0] : value,
    }));
    setSubmitted(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    console.log("Student profile:", formData);
    setSubmitted(true);
  };

  return (
    <div className="page-container-narrow">
      <div className="student-header">
        <p className="eyebrow-text student-eyebrow">STUDENT PROFILE</p>
        <h1 className="student-title">Build your SkillMatch profile</h1>
        <p className="student-subtitle">
          Tell us about yourself, your education, skills, and career interests.
          SkillMatch will use this information to identify relevant internships,
          jobs, and other opportunities.
        </p>
      </div>

      {submitted && (
        <div className="success-message">
          <strong>Profile information saved.</strong>
          <span>
            Your information has been collected successfully. Backend integration
            can be added next.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 01 PERSONAL INFORMATION */}
        <section className="student-card">
          <div className="student-section-header">
            <div className="student-section-number">01</div>
            <div>
              <h2 className="student-section-title">Personal Information</h2>
              <p className="student-section-desc">Provide the information an organization can use to contact you.</p>
            </div>
          </div>

          <div className="student-grid">
            <div className="form-group">
              <label>Full Name <span className="required-asterisk">*</span></label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="e.g. John Doe" required className="form-input" />
            </div>

            <div className="form-group">
              <label>Email Address <span className="required-asterisk">*</span></label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="e.g. john@example.com" required className="form-input" />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="e.g. +254 712 345 678" className="form-input" />
            </div>

            <div className="form-group">
              <label>County <span className="required-asterisk">*</span></label>
              <select name="county" value={formData.county} onChange={handleChange} required className="form-select">
                <option value="">Select your county</option>
                <option value="Nairobi">Nairobi</option>
                <option value="Mombasa">Mombasa</option>
                <option value="Kiambu">Kiambu</option>
                <option value="Nakuru">Nakuru</option>
                <option value="Kisumu">Kisumu</option>
                <option value="Machakos">Machakos</option>
                <option value="Kajiado">Kajiado</option>
                <option value="Uasin Gishu">Uasin Gishu</option>
                <option value="Kakamega">Kakamega</option>
                <option value="Nyeri">Nyeri</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </section>

        {/* 02 ACADEMIC INFORMATION */}
        <section className="student-card">
          <div className="student-section-header">
            <div className="student-section-number">02</div>
            <div>
              <h2 className="student-section-title">Academic Information</h2>
              <p className="student-section-desc">Help employers understand your current educational background.</p>
            </div>
          </div>

          <div className="student-grid">
            <div className="form-group">
              <label>School / Institution <span className="required-asterisk">*</span></label>
              <input type="text" name="institution" value={formData.institution} onChange={handleChange} placeholder="e.g. Strathmore University" required className="form-input" />
            </div>

            <div className="form-group">
              <label>Course / Program <span className="required-asterisk">*</span></label>
              <input type="text" name="course" value={formData.course} onChange={handleChange} placeholder="e.g. Bachelor of Informatics and Computer Science" required className="form-input" />
            </div>

            <div className="form-group">
              <label>Year of Study <span className="required-asterisk">*</span></label>
              <select name="yearOfStudy" value={formData.yearOfStudy} onChange={handleChange} required className="form-select">
                <option value="">Select year</option>
                <option value="First Year">First Year</option>
                <option value="Second Year">Second Year</option>
                <option value="Third Year">Third Year</option>
                <option value="Fourth Year">Fourth Year</option>
                <option value="Fifth Year">Fifth Year</option>
                <option value="Graduate">Graduate</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </section>

        {/* 03 CAREER INFORMATION */}
        <section className="student-card">
          <div className="student-section-header">
            <div className="student-section-number">03</div>
            <div>
              <h2 className="student-section-title">Career & Opportunity Preferences</h2>
              <p className="student-section-desc">These preferences help SkillMatch understand what kind of opportunities you are looking for.</p>
            </div>
          </div>

          <div className="student-grid">
            <div className="form-group">
              <label>Career Goal <span className="required-asterisk">*</span></label>
              <input type="text" name="careerGoal" value={formData.careerGoal} onChange={handleChange} placeholder="e.g. Software Developer" required className="form-input" />
            </div>

            <div className="form-group">
              <label>Opportunity Type <span className="required-asterisk">*</span></label>
              <select name="opportunityType" value={formData.opportunityType} onChange={handleChange} required className="form-select">
                <option value="">What are you looking for?</option>
                <option value="Internship">Internship</option>
                <option value="Attachment">Industrial Attachment</option>
                <option value="Graduate Job">Graduate Job</option>
                <option value="Part Time">Part-time Opportunity</option>
                <option value="Contract">Contract Work</option>
                <option value="Freelance">Freelance</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Skills <span className="required-asterisk">*</span></label>
              <input type="text" name="skills" value={formData.skills} onChange={handleChange} placeholder="e.g. Python, Java, SQL, React, Machine Learning" required className="form-input" />
              <p className="help-text">Separate multiple skills with commas. SkillMatch will later use Natural Language Processing to analyze these skills.</p>
            </div>

            <div className="form-group full-width">
              <label>About You</label>
              <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Briefly describe your experience, interests, projects, strengths, or the type of work you would like to pursue." rows="5" className="form-textarea" />
              <p className="help-text">This information helps the matching system understand your profile beyond individual keywords.</p>
            </div>
          </div>
        </section>

        {/* 04 CV / RESUME */}
        <section className="student-card">
          <div className="student-section-header">
            <div className="student-section-number">04</div>
            <div>
              <h2 className="student-section-title">CV / Resume</h2>
              <p className="student-section-desc">Upload your latest CV. SkillMatch will eventually extract relevant skills and experience from it.</p>
            </div>
          </div>

          <label className="upload-box">
            <div className="upload-icon">↑</div>
            <div>
              <strong className="upload-title">{formData.cv ? formData.cv.name : "Upload your CV / Resume"}</strong>
              <p className="upload-text">{formData.cv ? "File selected successfully." : "PDF, DOC or DOCX files are supported."}</p>
            </div>
            <input type="file" name="cv" accept=".pdf,.doc,.docx" onChange={handleChange} style={{ display: "none" }} />
          </label>
          <p className="help-text" style={{ marginTop: '8px' }}>Recommended: upload a current CV containing your education, projects, work experience, certifications, and skills.</p>
        </section>

        {/* 05 CONSENT */}
        <section className="student-card">
          <div className="student-section-header">
            <div className="student-section-number">05</div>
            <div>
              <h2 className="student-section-title">Profile Visibility & Consent</h2>
              <p className="student-section-desc">Control how your profile information is used for opportunity matching.</p>
            </div>
          </div>

          <div className="consent-box">
            <input type="checkbox" name="consent" checked={formData.consent} onChange={handleChange} required className="consent-checkbox" />
            <div>
              <label className="consent-label">I agree to the use of my profile information for opportunity matching.</label>
              <p className="help-text">Your information will be used to help identify relevant opportunities and allow organizations to contact you when appropriate.</p>
            </div>
          </div>
        </section>

        <div className="student-actions">
          <button type="submit" className="student-submit-btn">Create Student Profile</button>
        </div>
      </form>
    </div>
  );
}