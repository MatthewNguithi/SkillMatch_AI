import { Link } from "react-router-dom";
import { Card } from "../components/UI";

export default function HomePage() {
  return (
    <div style={styles.page}>
      <section style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.badge}>AI-powered opportunity matching</div>

          <h1 style={styles.heroTitle}>
            Connect your skills with the right opportunities.
          </h1>

          <p style={styles.heroText}>
            SkillMatch helps undergraduate students and informally trained
            individuals discover internships and employment opportunities
            based on their skills, interests and location.
          </p>

          <div style={styles.heroActions}>
            <Link to="/student" style={styles.primaryButton}>
              Find opportunities
            </Link>

            <Link to="/employer" style={styles.secondaryButton}>
              Find suitable candidates
            </Link>
          </div>
        </div>

        <div style={styles.heroVisual}>
          <div style={styles.visualCard}>
            <div style={styles.visualHeader}>
              <span style={styles.visualDot}></span>
              <span style={styles.visualDot}></span>
              <span style={styles.visualDot}></span>
            </div>

            <div style={styles.visualTitle}>Your skill match</div>

            <div style={styles.matchScore}>87%</div>

            <div style={styles.visualBar}>
              <div style={{ ...styles.visualBarFill, width: "87%" }} />
            </div>

            <div style={styles.visualLabel}>
              Strong semantic match
            </div>

            <div style={styles.skillRow}>
              <span>Python</span>
              <span>SQL</span>
              <span>Machine Learning</span>
            </div>
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <div style={styles.sectionHeading}>
          <h2>How SkillMatch works</h2>
          <p>
            A simple process for discovering opportunities or identifying
            suitable candidates.
          </p>
        </div>

        <div style={styles.featureGrid}>
          <Card style={styles.featureCard}>
            <div style={styles.featureNumber}>01</div>
            <h3>Create your profile</h3>
            <p>
              Enter your skills, education, experience, interests and
              preferred location.
            </p>
          </Card>

          <Card style={styles.featureCard}>
            <div style={styles.featureNumber}>02</div>
            <h3>Analyse skills semantically</h3>
            <p>
              SkillMatch uses Natural Language Processing and Sentence-BERT
              to understand the meaning of your skills.
            </p>
          </Card>

          <Card style={styles.featureCard}>
            <div style={styles.featureNumber}>03</div>
            <h3>Receive ranked matches</h3>
            <p>
              View opportunities or candidates ranked according to skill
              similarity, experience and location.
            </p>
          </Card>
        </div>
      </section>

      <section style={styles.audienceSection}>
        <div>
          <h2>Built for both sides of the opportunity market</h2>
          <p>
            Whether you are searching for your first opportunity or looking
            for someone with the right skills, SkillMatch helps you make a
            more informed decision.
          </p>
        </div>

        <div style={styles.audienceGrid}>
          <Card style={styles.audienceCard}>
            <h3>For students and trainees</h3>
            <p>
              Present your skills clearly, discover relevant internships and
              identify skills that may require further development.
            </p>
            <Link to="/student" style={styles.textLink}>
              Explore student matching →
            </Link>
          </Card>

          <Card style={styles.audienceCard}>
            <h3>For employers</h3>
            <p>
              Describe your opportunity and receive a ranked list of
              candidates whose skills align with your requirements.
            </p>
            <Link to="/employer" style={styles.textLink}>
              Explore employer matching →
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: "1180px",
    margin: "0 auto",
    padding: "2rem",
  },

  hero: {
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: "3rem",
    alignItems: "center",
    padding: "4rem 0",
  },

  heroContent: {
    maxWidth: "650px",
  },

  badge: {
    display: "inline-block",
    background: "#E1F5EE",
    color: "#085041",
    borderRadius: "20px",
    padding: "0.4rem 0.8rem",
    fontSize: "0.8rem",
    fontWeight: 600,
    marginBottom: "1rem",
  },

  heroTitle: {
    color: "#0D2B55",
    fontSize: "clamp(2.2rem, 5vw, 4rem)",
    lineHeight: 1.1,
    margin: "0 0 1.25rem",
  },

  heroText: {
    color: "#555",
    fontSize: "1.05rem",
    lineHeight: 1.7,
    marginBottom: "1.75rem",
  },

  heroActions: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap",
  },

  primaryButton: {
    background: "#0E7C7B",
    color: "#fff",
    textDecoration: "none",
    padding: "0.8rem 1.25rem",
    borderRadius: "8px",
    fontWeight: 600,
  },

  secondaryButton: {
    background: "#0D2B55",
    color: "#fff",
    textDecoration: "none",
    padding: "0.8rem 1.25rem",
    borderRadius: "8px",
    fontWeight: 600,
  },

  heroVisual: {
    display: "flex",
    justifyContent: "center",
  },

  visualCard: {
    width: "100%",
    maxWidth: "360px",
    background: "#0D2B55",
    borderRadius: "20px",
    padding: "1.5rem",
    color: "#fff",
    boxShadow: "0 20px 50px rgba(13,43,85,0.2)",
  },

  visualHeader: {
    display: "flex",
    gap: "0.4rem",
    marginBottom: "2.5rem",
  },

  visualDot: {
    width: "9px",
    height: "9px",
    background: "#E8A838",
    borderRadius: "50%",
  },

  visualTitle: {
    color: "#cbd5e1",
    fontSize: "0.9rem",
    marginBottom: "0.5rem",
  },

  matchScore: {
    fontSize: "4rem",
    fontWeight: 700,
    color: "#E8A838",
    marginBottom: "0.75rem",
  },

  visualBar: {
    height: "10px",
    background: "rgba(255,255,255,0.2)",
    borderRadius: "10px",
    overflow: "hidden",
  },

  visualBarFill: {
    height: "100%",
    background: "#0E7C7B",
    borderRadius: "10px",
  },

  visualLabel: {
    color: "#cbd5e1",
    fontSize: "0.8rem",
    marginTop: "0.6rem",
  },

  skillRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
    marginTop: "2rem",
  },

  section: {
    padding: "3rem 0",
  },

  sectionHeading: {
    textAlign: "center",
    maxWidth: "650px",
    margin: "0 auto 2rem",
  },

  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "1rem",
  },

  featureCard: {
    minHeight: "180px",
  },

  featureNumber: {
    color: "#E8A838",
    fontWeight: 700,
    fontSize: "1.2rem",
  },

  audienceSection: {
    padding: "3rem 0",
  },

  audienceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "1rem",
    marginTop: "1.5rem",
  },

  audienceCard: {
    minHeight: "190px",
  },

  textLink: {
    color: "#0E7C7B",
    textDecoration: "none",
    fontWeight: 600,
  },
};