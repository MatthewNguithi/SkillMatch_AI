import { Link } from "react-router-dom";
import { Card } from "../components/UI";
import "../styles/global.css";

export default function HomePage() {
  return (
    <div className="page-container">
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">AI-powered opportunity matching</div>

          <h1 className="hero-title">
            Connect your skills with the right opportunities.
          </h1>

          <p className="hero-text">
            SkillMatch helps undergraduate students and informally trained
            individuals discover internships and employment opportunities
            based on their skills, interests and location.
          </p>

          <div className="hero-actions">
            <Link to="/student" className="btn-primary">
              Find opportunities
            </Link>

            <Link to="/employer" className="btn-secondary">
              Find suitable candidates
            </Link>
          </div>
        </div>

        <div className="hero-visual">
          <div className="visual-card">
            <div className="visual-header">
              <span className="visual-dot"></span>
              <span className="visual-dot"></span>
              <span className="visual-dot"></span>
            </div>

            <div className="visual-title">Your skill match</div>
            <div className="match-score">87%</div>

            <div className="visual-bar">
              <div className="visual-bar-fill" style={{ width: "87%" }} />
            </div>

            <div className="visual-label">Strong semantic match</div>

            <div className="skill-row">
              <span>Python</span>
              <span>SQL</span>
              <span>Machine Learning</span>
            </div>
          </div>
        </div>
      </section>

      <section className="info-section">
        <div className="section-heading">
          <h2>How SkillMatch works</h2>
          <p>
            A simple process for discovering opportunities or identifying
            suitable candidates.
          </p>
        </div>

        <div className="feature-grid">
          <Card className="feature-card">
            <div className="feature-number">01</div>
            <h3>Create your profile</h3>
            <p>
              Enter your skills, education, experience, interests and
              preferred location.
            </p>
          </Card>

          <Card className="feature-card">
            <div className="feature-number">02</div>
            <h3>Analyse skills semantically</h3>
            <p>
              SkillMatch uses Natural Language Processing and Sentence-BERT
              to understand the meaning of your skills.
            </p>
          </Card>

          <Card className="feature-card">
            <div className="feature-number">03</div>
            <h3>Receive ranked matches</h3>
            <p>
              View opportunities or candidates ranked according to skill
              similarity, experience and location.
            </p>
          </Card>
        </div>
      </section>

      <section className="info-section">
        <div className="section-heading">
          <h2>Built for both sides of the opportunity market</h2>
          <p>
            Whether you are searching for your first opportunity or looking
            for someone with the right skills, SkillMatch helps you make a
            more informed decision.
          </p>
        </div>

        <div className="audience-grid">
          <Card className="audience-card">
            <h3>For students and trainees</h3>
            <p>
              Present your skills clearly, discover relevant internships and
              identify skills that may require further development.
            </p>
            <Link to="/student" className="text-link">
              Explore student matching →
            </Link>
          </Card>

          <Card className="audience-card">
            <h3>For employers</h3>
            <p>
              Describe your opportunity and receive a ranked list of
              candidates whose skills align with your requirements.
            </p>
            <Link to="/employer" className="text-link">
              Explore employer matching →
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}