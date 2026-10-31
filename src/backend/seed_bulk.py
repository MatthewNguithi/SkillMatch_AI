from sqlalchemy.orm import Session
from database import SessionLocal
from model import User, Student, Employer, JobPosting
from auth import get_password_hash

# 1. DIVERSE STUDENT PROFILES
MOCK_STUDENTS = [
    {"first": "David", "last": "Kiprop", "email": "data@test.com", "course": "BSc Data Science", "goal": "Data Analyst", "skills": "Python, SQL, Pandas, Tableau, Machine Learning", "bio": "Analytical data science student looking to uncover business insights."},
    {"first": "Sarah", "last": "Mutua", "email": "marketing@test.com", "course": "BA Marketing", "goal": "Digital Marketing Specialist", "skills": "SEO, Content Creation, Google Analytics, Copywriting", "bio": "Creative marketer with a knack for digital campaigns."},
    {"first": "Kevin", "last": "Ochieng", "email": "nursing@test.com", "course": "BSc Nursing", "goal": "Clinical Nurse", "skills": "Patient Care, CPR, Vitals Monitoring, Triage", "bio": "Dedicated nursing student with clinical rotation experience."},
    {"first": "Grace", "last": "Wanjiku", "email": "finance@test.com", "course": "BCom Finance", "goal": "Financial Analyst", "skills": "Excel, Financial Modeling, Accounting, Risk Analysis", "bio": "Detail-oriented finance major passionate about corporate finance."},
    {"first": "Ian", "last": "Mwangi", "email": "civil@test.com", "course": "BSc Civil Engineering", "goal": "Structural Engineer", "skills": "AutoCAD, Structural Analysis, Project Management", "bio": "Engineering student focused on sustainable urban infrastructure."},
    {"first": "Joy", "last": "Achieng", "email": "law@test.com", "course": "Bachelor of Laws (LLB)", "goal": "Corporate Lawyer", "skills": "Legal Drafting, Contract Analysis, Dispute Resolution, Research", "bio": "Law student with a strong interest in corporate governance and tech law."},
    {"first": "Peter", "last": "Kamau", "email": "insurance@test.com", "course": "BSc Actuarial Science", "goal": "Actuarial Analyst", "skills": "Risk Assessment, Statistical Modeling, R, Probability", "bio": "Actuarial student driven by data-based risk management."},
    {"first": "Alice", "last": "React", "email": "frontend@test.com", "course": "BSc Computer Science", "goal": "Frontend Developer", "skills": "React, JavaScript, HTML, CSS, Vite, UI/UX", "bio": "Frontend developer who builds fast, responsive interfaces."},
    {"first": "Brian", "last": "Backend", "email": "backend@test.com", "course": "BSc Software Engineering", "goal": "Backend Developer", "skills": "Python, FastAPI, PostgreSQL, Docker, AWS", "bio": "Backend specialist focused on scalable APIs and database design."},
    {"first": "Faith", "last": "Design", "email": "design@test.com", "course": "BA Graphic Design", "goal": "UX/UI Designer", "skills": "Figma, Adobe XD, Prototyping, Wireframing", "bio": "Design student obsessed with creating intuitive user journeys."}
]

# 2. DIVERSE EMPLOYERS & JOB POSTINGS
MOCK_EMPLOYERS = [
    {"email": "emp_law@test.com", "company": "LexCorp Legal", "job_title": "Legal Intern", "req_skills": "Legal Drafting, Research, Contract Analysis, Attention to Detail", "desc": "Assist senior partners with corporate contract review and legal research."},
    {"email": "emp_insure@test.com", "company": "SafeGuard Insurance", "job_title": "Actuarial Intern", "req_skills": "Risk Assessment, R, Statistical Modeling, Excel", "desc": "Help our underwriting team analyze risk models and calculate premiums."},
    {"email": "emp_tech1@test.com", "company": "TechNova Solutions", "job_title": "Frontend Software Intern", "req_skills": "React.js, JavaScript, HTML5, CSS3, Git", "desc": "Build user-facing features for our flagship web application."},
    {"email": "emp_tech2@test.com", "company": "CloudSync Inc", "job_title": "Backend Engineering Intern", "req_skills": "Python, FastAPI, SQL, API Development", "desc": "Develop and maintain REST APIs connecting our database to web clients."},
    {"email": "emp_finance@test.com", "company": "Capital Trust Bank", "job_title": "Finance Analyst Intern", "req_skills": "Financial Modeling, Excel, Risk Analysis, Accounting", "desc": "Analyze market trends and assist in corporate financial reporting."},
    {"email": "emp_health@test.com", "company": "City General Hospital", "job_title": "Nursing Intern", "req_skills": "Patient Care, Vitals Monitoring, Triage, Clinical Support", "desc": "Support senior nurses in delivering excellent patient care in ward rotations."},
    {"email": "emp_eng@test.com", "company": "BuildRight Contractors", "job_title": "Civil Engineering Intern", "req_skills": "AutoCAD, Surveying, Structural Analysis", "desc": "Assist on-site project managers with structural planning and blueprints."},
    {"email": "emp_market@test.com", "company": "ViralMedia Agency", "job_title": "Digital Marketing Intern", "req_skills": "SEO, Google Analytics, Content Creation, Social Media", "desc": "Drive digital campaigns and track engagement metrics for our clients."},
    {"email": "emp_design@test.com", "company": "CreativeWiz Studio", "job_title": "UI/UX Design Intern", "req_skills": "Figma, Wireframing, User Testing, Prototyping", "desc": "Create intuitive mockups and prototypes for mobile and web apps."},
    {"email": "emp_data@test.com", "company": "DataMinds", "job_title": "Data Analytics Intern", "req_skills": "Python, SQL, Tableau, Pandas", "desc": "Clean and analyze large datasets to generate actionable business reports."}
]

def seed_database():
    db: Session = SessionLocal()
    pwd = get_password_hash("TestPassword123!")
    
    try:
        print("Seeding students...")
        for data in MOCK_STUDENTS:
            if not db.query(User).filter(User.email == data["email"]).first():
                user = User(first_name=data["first"], last_name=data["last"], email=data["email"], phone_number="0700112233", password_hash=pwd, role="student", is_verified=True, is_approved=True)
                db.add(user)
                db.flush()
                student = Student(user_id=user.id, full_name=f"{data['first']} {data['last']}", phone="0700112233", institution="University of Nairobi", course=data["course"], year_of_study="Year 3", career_goal=data["goal"], opportunity_type="Internship", county="Nairobi", skills_text=data["skills"], bio=data["bio"], consent=True)
                db.add(student)

        print("Seeding employers and jobs...")
        for data in MOCK_EMPLOYERS:
            if not db.query(User).filter(User.email == data["email"]).first():
                user = User(first_name="Admin", last_name=data["company"], email=data["email"], phone_number="0700112233", password_hash=pwd, role="employer", is_verified=True, is_approved=True)
                db.add(user)
                db.flush()
                
                emp = Employer(user_id=user.id, company_name=data["company"], company_website="https://example.com", company_description="A top tier company in our sector.")
                db.add(emp)
                db.flush()
                
                job = JobPosting(employer_id=emp.id, title=data["job_title"], description=data["desc"], required_skills=data["req_skills"], location="Nairobi", opportunity_type="Internship", source_type="internal", source_url="")
                db.add(job)
        
        db.commit()
        print("Success! Log in using any of the above emails and 'TestPassword123!'")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()