import { useState } from "react";

export default function StudentPage() {
    const [formData, setFormData] = useState({
        fullName: "",
        email: "",
        phone: "",
        institution: "",
        course: "",
        yearOfStudy: "",
        careerGoal: "",
        opportunityType: "",
        county: "",
        skills: "",
        bio: "",
        cv: null,
        consent: false,
    });

    const [submitted, setSubmitted] = useState(false);

    const handleChange = (event) => {
        const { name, value, type, checked, files } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]:
                type === "checkbox"
                    ? checked
                    : type === "file"
                        ? files[0]
                        : value,
        }));

        setSubmitted(false);
    };

    const handleSubmit = (event) => {
        event.preventDefault();

        console.log("Student profile:", formData);

        setSubmitted(true);
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>

                {/* =========================
                    PAGE HEADER
                ========================== */}
                <div style={styles.header}>
                    <p style={styles.eyebrow}>STUDENT PROFILE</p>

                    <h1 style={styles.title}>
                        Build your SkillMatch profile
                    </h1>

                    <p style={styles.subtitle}>
                        Tell us about yourself, your education, skills, and
                        career interests. SkillMatch will use this information
                        to identify relevant internships, jobs, and other
                        opportunities.
                    </p>
                </div>

                {/* Success message */}
                {submitted && (
                    <div style={styles.successMessage}>
                        <strong>Profile information saved.</strong>

                        <span>
                            Your information has been collected successfully.
                            Backend integration can be added next.
                        </span>
                    </div>
                )}

                {/* =========================
                    MAIN FORM
                ========================== */}
                <form onSubmit={handleSubmit}>

                    {/* =========================
                        01 PERSONAL INFORMATION
                    ========================== */}
                    <section style={styles.card}>

                        <div style={styles.sectionHeader}>
                            <div style={styles.sectionNumber}>
                                01
                            </div>

                            <div>
                                <h2 style={styles.sectionTitle}>
                                    Personal Information
                                </h2>

                                <p style={styles.sectionDescription}>
                                    Provide the information an organization can
                                    use to contact you.
                                </p>
                            </div>
                        </div>

                        <div style={styles.grid}>

                            {/* Full Name */}
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Full Name{" "}
                                    <span style={styles.required}>*</span>
                                </label>

                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="e.g. John Doe"
                                    required
                                    style={styles.input}
                                />
                            </div>

                            {/* Email */}
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Email Address{" "}
                                    <span style={styles.required}>*</span>
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="e.g. john@example.com"
                                    required
                                    style={styles.input}
                                />
                            </div>

                            {/* Phone */}
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Phone Number
                                </label>

                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="e.g. +254 712 345 678"
                                    style={styles.input}
                                />
                            </div>

                            {/* County */}
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    County{" "}
                                    <span style={styles.required}>*</span>
                                </label>

                                <select
                                    name="county"
                                    value={formData.county}
                                    onChange={handleChange}
                                    required
                                    style={styles.input}
                                >
                                    <option value="">
                                        Select your county
                                    </option>

                                    <option value="Nairobi">
                                        Nairobi
                                    </option>

                                    <option value="Mombasa">
                                        Mombasa
                                    </option>

                                    <option value="Kiambu">
                                        Kiambu
                                    </option>

                                    <option value="Nakuru">
                                        Nakuru
                                    </option>

                                    <option value="Kisumu">
                                        Kisumu
                                    </option>

                                    <option value="Machakos">
                                        Machakos
                                    </option>

                                    <option value="Kajiado">
                                        Kajiado
                                    </option>

                                    <option value="Uasin Gishu">
                                        Uasin Gishu
                                    </option>

                                    <option value="Kakamega">
                                        Kakamega
                                    </option>

                                    <option value="Nyeri">
                                        Nyeri
                                    </option>

                                    <option value="Other">
                                        Other
                                    </option>
                                </select>
                            </div>

                        </div>
                    </section>

                    {/* =========================
                        02 ACADEMIC INFORMATION
                    ========================== */}
                    <section style={styles.card}>

                        <div style={styles.sectionHeader}>
                            <div style={styles.sectionNumber}>
                                02
                            </div>

                            <div>
                                <h2 style={styles.sectionTitle}>
                                    Academic Information
                                </h2>

                                <p style={styles.sectionDescription}>
                                    Help employers understand your current
                                    educational background.
                                </p>
                            </div>
                        </div>

                        <div style={styles.grid}>

                            {/* Institution */}
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    School / Institution{" "}
                                    <span style={styles.required}>*</span>
                                </label>

                                <input
                                    type="text"
                                    name="institution"
                                    value={formData.institution}
                                    onChange={handleChange}
                                    placeholder="e.g. Strathmore University"
                                    required
                                    style={styles.input}
                                />
                            </div>

                            {/* Course */}
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Course / Program{" "}
                                    <span style={styles.required}>*</span>
                                </label>

                                <input
                                    type="text"
                                    name="course"
                                    value={formData.course}
                                    onChange={handleChange}
                                    placeholder="e.g. Bachelor of Informatics and Computer Science"
                                    required
                                    style={styles.input}
                                />
                            </div>

                            {/* Year */}
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Year of Study{" "}
                                    <span style={styles.required}>*</span>
                                </label>

                                <select
                                    name="yearOfStudy"
                                    value={formData.yearOfStudy}
                                    onChange={handleChange}
                                    required
                                    style={styles.input}
                                >
                                    <option value="">
                                        Select year
                                    </option>

                                    <option value="First Year">
                                        First Year
                                    </option>

                                    <option value="Second Year">
                                        Second Year
                                    </option>

                                    <option value="Third Year">
                                        Third Year
                                    </option>

                                    <option value="Fourth Year">
                                        Fourth Year
                                    </option>

                                    <option value="Fifth Year">
                                        Fifth Year
                                    </option>

                                    <option value="Graduate">
                                        Graduate
                                    </option>

                                    <option value="Other">
                                        Other
                                    </option>
                                </select>
                            </div>

                        </div>
                    </section>

                    {/* =========================
                        03 CAREER INFORMATION
                    ========================== */}
                    <section style={styles.card}>

                        <div style={styles.sectionHeader}>
                            <div style={styles.sectionNumber}>
                                03
                            </div>

                            <div>
                                <h2 style={styles.sectionTitle}>
                                    Career & Opportunity Preferences
                                </h2>

                                <p style={styles.sectionDescription}>
                                    These preferences help SkillMatch
                                    understand what kind of opportunities
                                    you are looking for.
                                </p>
                            </div>
                        </div>

                        <div style={styles.grid}>

                            {/* Career Goal */}
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Career Goal{" "}
                                    <span style={styles.required}>*</span>
                                </label>

                                <input
                                    type="text"
                                    name="careerGoal"
                                    value={formData.careerGoal}
                                    onChange={handleChange}
                                    placeholder="e.g. Software Developer"
                                    required
                                    style={styles.input}
                                />
                            </div>

                            {/* Opportunity Type */}
                            <div style={styles.field}>
                                <label style={styles.label}>
                                    Opportunity Type{" "}
                                    <span style={styles.required}>*</span>
                                </label>

                                <select
                                    name="opportunityType"
                                    value={formData.opportunityType}
                                    onChange={handleChange}
                                    required
                                    style={styles.input}
                                >
                                    <option value="">
                                        What are you looking for?
                                    </option>

                                    <option value="Internship">
                                        Internship
                                    </option>

                                    <option value="Attachment">
                                        Industrial Attachment
                                    </option>

                                    <option value="Graduate Job">
                                        Graduate Job
                                    </option>

                                    <option value="Part Time">
                                        Part-time Opportunity
                                    </option>

                                    <option value="Contract">
                                        Contract Work
                                    </option>

                                    <option value="Freelance">
                                        Freelance
                                    </option>
                                </select>
                            </div>

                            {/* Skills */}
                            <div
                                style={{
                                    ...styles.field,
                                    gridColumn: "1 / -1",
                                }}
                            >
                                <label style={styles.label}>
                                    Skills{" "}
                                    <span style={styles.required}>*</span>
                                </label>

                                <input
                                    type="text"
                                    name="skills"
                                    value={formData.skills}
                                    onChange={handleChange}
                                    placeholder="e.g. Python, Java, SQL, React, Machine Learning"
                                    required
                                    style={styles.input}
                                />

                                <p style={styles.helpText}>
                                    Separate multiple skills with commas.
                                    SkillMatch will later use Natural Language
                                    Processing to analyze these skills.
                                </p>
                            </div>

                            {/* About */}
                            <div
                                style={{
                                    ...styles.field,
                                    gridColumn: "1 / -1",
                                }}
                            >
                                <label style={styles.label}>
                                    About You
                                </label>

                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleChange}
                                    placeholder="Briefly describe your experience, interests, projects, strengths, or the type of work you would like to pursue."
                                    rows="5"
                                    style={styles.textarea}
                                />

                                <p style={styles.helpText}>
                                    This information helps the matching system
                                    understand your profile beyond individual
                                    keywords.
                                </p>
                            </div>

                        </div>
                    </section>

                    {/* =========================
                        04 CV / RESUME
                    ========================== */}
                    <section style={styles.card}>

                        <div style={styles.sectionHeader}>
                            <div style={styles.sectionNumber}>
                                04
                            </div>

                            <div>
                                <h2 style={styles.sectionTitle}>
                                    CV / Resume
                                </h2>

                                <p style={styles.sectionDescription}>
                                    Upload your latest CV. SkillMatch will
                                    eventually extract relevant skills and
                                    experience from it.
                                </p>
                            </div>
                        </div>

                        <label style={styles.uploadBox}>

                            <div style={styles.uploadIcon}>
                                ↑
                            </div>

                            <div>
                                <strong style={styles.uploadTitle}>
                                    {formData.cv
                                        ? formData.cv.name
                                        : "Upload your CV / Resume"}
                                </strong>

                                <p style={styles.uploadText}>
                                    {formData.cv
                                        ? "File selected successfully."
                                        : "PDF, DOC or DOCX files are supported."}
                                </p>
                            </div>

                            <input
                                type="file"
                                name="cv"
                                accept=".pdf,.doc,.docx"
                                onChange={handleChange}
                                style={{ display: "none" }}
                            />

                        </label>

                        <p style={styles.helpText}>
                            Recommended: upload a current CV containing your
                            education, projects, work experience,
                            certifications, and skills.
                        </p>

                    </section>

                    {/* =========================
                        05 CONSENT
                    ========================== */}
                    <section style={styles.card}>

                        <div style={styles.sectionHeader}>
                            <div style={styles.sectionNumber}>
                                05
                            </div>

                            <div>
                                <h2 style={styles.sectionTitle}>
                                    Profile Visibility & Consent
                                </h2>

                                <p style={styles.sectionDescription}>
                                    Control how your profile information is
                                    used for opportunity matching.
                                </p>
                            </div>
                        </div>

                        <div style={styles.consent}>

                            <input
                                type="checkbox"
                                name="consent"
                                checked={formData.consent}
                                onChange={handleChange}
                                required
                                style={styles.checkbox}
                            />

                            <div>
                                <label style={styles.consentLabel}>
                                    I agree to the use of my profile information
                                    for opportunity matching.
                                </label>

                                <p style={styles.helpText}>
                                    Your information will be used to help
                                    identify relevant opportunities and allow
                                    organizations to contact you when
                                    appropriate.
                                </p>
                            </div>

                        </div>
                    </section>

                    {/* =========================
                        SUBMIT
                    ========================== */}
                    <div style={styles.actions}>

                        <button
                            type="submit"
                            style={styles.button}
                        >
                            Create Student Profile
                        </button>

                    </div>

                </form>
            </div>
        </div>
    );
}


/* =====================================================
   STYLES
===================================================== */

const styles = {

    page: {
        minHeight: "100vh",
        background: "#f7f8fa",
        padding: "40px 20px 80px",
    },

    container: {
        maxWidth: "1000px",
        margin: "0 auto",
    },

    header: {
        marginBottom: "32px",
    },

    eyebrow: {
        margin: "0 0 8px",
        fontSize: "13px",
        fontWeight: "700",
        letterSpacing: "1.5px",
        color: "#2563eb",
    },

    title: {
        margin: "0 0 12px",
        fontSize: "36px",
        lineHeight: "1.2",
        color: "#111827",
    },

    subtitle: {
        maxWidth: "720px",
        margin: 0,
        fontSize: "16px",
        lineHeight: "1.7",
        color: "#6b7280",
    },

    card: {
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        padding: "28px",
        marginBottom: "20px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
    },

    sectionHeader: {
        display: "flex",
        gap: "16px",
        alignItems: "flex-start",
        marginBottom: "26px",
    },

    sectionNumber: {
        width: "38px",
        height: "38px",
        minWidth: "38px",
        borderRadius: "10px",
        background: "#eff6ff",
        color: "#2563eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "13px",
        fontWeight: "700",
    },

    sectionTitle: {
        margin: "0 0 5px",
        fontSize: "20px",
        color: "#111827",
    },

    sectionDescription: {
        margin: 0,
        fontSize: "14px",
        lineHeight: "1.5",
        color: "#6b7280",
    },

    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: "20px",
    },

    field: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },

    label: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#374151",
    },

    required: {
        color: "#dc2626",
    },

    input: {
        width: "100%",
        boxSizing: "border-box",
        padding: "12px 14px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "14px",
        color: "#111827",
        background: "#ffffff",
        outline: "none",
    },

    textarea: {
        width: "100%",
        boxSizing: "border-box",
        padding: "12px 14px",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "14px",
        color: "#111827",
        background: "#ffffff",
        resize: "vertical",
        fontFamily: "inherit",
        lineHeight: "1.5",
        outline: "none",
    },

    helpText: {
        margin: 0,
        fontSize: "12px",
        lineHeight: "1.5",
        color: "#6b7280",
    },

    uploadBox: {
        minHeight: "120px",
        border: "2px dashed #cbd5e1",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        cursor: "pointer",
        background: "#f8fafc",
        padding: "20px",
        boxSizing: "border-box",
    },

    uploadIcon: {
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        background: "#eff6ff",
        color: "#2563eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "22px",
        fontWeight: "700",
    },

    uploadTitle: {
        display: "block",
        fontSize: "15px",
        color: "#111827",
        marginBottom: "4px",
    },

    uploadText: {
        margin: 0,
        fontSize: "13px",
        color: "#6b7280",
    },

    consent: {
        display: "flex",
        gap: "12px",
        alignItems: "flex-start",
    },

    checkbox: {
        width: "18px",
        height: "18px",
        marginTop: "2px",
        cursor: "pointer",
    },

    consentLabel: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#374151",
    },

    actions: {
        display: "flex",
        justifyContent: "flex-end",
        marginTop: "8px",
    },

    button: {
        border: "none",
        borderRadius: "9px",
        padding: "13px 24px",
        background: "#2563eb",
        color: "#ffffff",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
    },

    successMessage: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        background: "#ecfdf5",
        border: "1px solid #a7f3d0",
        color: "#065f46",
        borderRadius: "10px",
        padding: "14px 16px",
        marginBottom: "20px",
        fontSize: "14px",
    },
};
