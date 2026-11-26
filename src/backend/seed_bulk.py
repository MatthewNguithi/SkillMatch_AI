"""
SkillMatch AI — Database Seed & Model Testing Script
Injects 20 realistic Kenyan Student/TVET profiles and 120 Employer Job Opportunities
with precomputed Sentence-BERT (all-MiniLM-L6-v2) 384-dimensional embeddings.

Usage (inside C:\\Open\\SkillMatch_AI\\src\\backend with venv activated):
    python seed_bulk.py
"""

from sqlalchemy import inspect
from sentence_transformers import SentenceTransformer

from database import SessionLocal, engine, Base
from model import User, Student, Employer, JobPosting

try:
    from auth import get_password_hash
except Exception:
    from passlib.context import CryptContext
    _pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    def get_password_hash(password: str) -> str:
        return _pwd_ctx.hash(password)


Base.metadata.create_all(bind=engine)

print("Loading Sentence-BERT model (all-MiniLM-L6-v2) for embedding generation...")
sbert_model = SentenceTransformer("all-MiniLM-L6-v2")


def set_known_attrs(instance, data: dict):
    """Safely assigns only columns/attributes that exist on the SQLAlchemy model."""
    mapper = inspect(type(instance))
    valid_cols = set(mapper.columns.keys())
    for k, v in data.items():
        if k in valid_cols:
            setattr(instance, k, v)
    return instance


STUDENTS_DATA = [
    {
        "email": "brian.kamau@strathmore.edu",
        "full_name": "Brian Kamau Njoroge",
        "phone": "+254712340001",
        "institution": "Strathmore University",
        "course": "BSc. Informatics and Computer Science",
        "year_of_study": "4",
        "career_goal": "Backend Software Engineer building scalable REST APIs and AI-powered web services.",
        "opportunity_type": "Internship",
        "county": "Nairobi",
        "skills_text": "Python, FastAPI, PostgreSQL, SQL, Docker, Git, REST APIs, Linux",
        "bio": "Final year Computer Science student experienced in building Python FastAPI microservices, relational database schemas, and containerized deployments.",
    },
    {
        "email": "faith.wanjiku@uonbi.ac.ke",
        "full_name": "Faith Wanjiku Mwangi",
        "phone": "+254712340002",
        "institution": "University of Nairobi",
        "course": "BSc. Computer Science",
        "year_of_study": "3",
        "career_goal": "Frontend and Full-Stack Web Developer focused on accessible React user interfaces.",
        "opportunity_type": "Internship",
        "county": "Nairobi",
        "skills_text": "React, JavaScript, TypeScript, HTML, CSS, Tailwind CSS, Node.js, Git",
        "bio": "Passionate frontend engineer who has built multiple responsive single-page web apps, student portals, and REST API integrations.",
    },
    {
        "email": "kevin.otieno@jkuat.ac.ke",
        "full_name": "Kevin Ochieng Otieno",
        "phone": "+254712340003",
        "institution": "Jomo Kenyatta University of Agriculture and Technology (JKUAT)",
        "course": "BSc. Data Science and Analytics",
        "year_of_study": "4",
        "career_goal": "Data Analyst and Machine Learning Engineer transforming business data into predictive insights.",
        "opportunity_type": "Full-time",
        "county": "Kiambu",
        "skills_text": "Python, Pandas, NumPy, SQL, Scikit-learn, Power BI, Excel, Machine Learning, Statistics",
        "bio": "Data science graduate skilled in exploratory data analysis, predictive modeling, SQL warehousing, and interactive Power BI dashboards.",
    },
    {
        "email": "amina.hassan@tum.ac.ke",
        "full_name": "Amina Mohamed Hassan",
        "phone": "+254712340004",
        "institution": "Technical University of Mombasa",
        "course": "Diploma in Information Communication Technology",
        "year_of_study": "Graduated",
        "career_goal": "IT Support Specialist and Junior Network Administrator ensuring reliable enterprise infrastructure.",
        "opportunity_type": "Full-time",
        "county": "Mombasa",
        "skills_text": "Networking, Linux, Windows Server, Troubleshooting, TCP/IP, Active Directory, Hardware Maintenance, Cybersecurity Basics",
        "bio": "TVET ICT graduate with hands-on experience in LAN setup, helpdesk ticketing, router configuration, and workstation troubleshooting.",
    },
    {
        "email": "samuel.kiprop@egerton.ac.ke",
        "full_name": "Samuel Kiprop Bett",
        "phone": "+254712340005",
        "institution": "Egerton University",
        "course": "BSc. Agribusiness Management",
        "year_of_study": "4",
        "career_goal": "Supply Chain and Agricultural Operations Analyst optimizing farm-to-market logistics.",
        "opportunity_type": "Internship",
        "county": "Nakuru",
        "skills_text": "Supply Chain Management, Excel, Inventory Control, Agribusiness, Financial Analysis, Procurement, Data Collection",
        "bio": "Agribusiness student with field experience in smallholder cooperative logistics, inventory auditing, and crop yield data analysis.",
    },
    {
        "email": "grace.akinyi@maseno.ac.ke",
        "full_name": "Grace Akinyi Odhiambo",
        "phone": "+254712340006",
        "institution": "Maseno University",
        "course": "BA. Communication and Media Technology",
        "year_of_study": "3",
        "career_goal": "Digital Marketing and Content Strategy Specialist driving brand engagement across social channels.",
        "opportunity_type": "Part-time",
        "county": "Kisumu",
        "skills_text": "Digital Marketing, SEO, Content Writing, Social Media Management, Canva, Copywriting, Google Analytics",
        "bio": "Creative communicator managing campus media campaigns, SEO blog articles, visual brand graphics, and audience analytics.",
    },
    {
        "email": "denis.mutua@moringaschool.com",
        "full_name": "Denis Mutua Musyoka",
        "phone": "+254712340007",
        "institution": "Moringa School (Bootcamp)",
        "course": "Software Engineering Bootcamp",
        "year_of_study": "Graduated",
        "career_goal": "Full-Stack Python & React Engineer building fintech and mobile-first web platforms.",
        "opportunity_type": "Full-time",
        "county": "Nairobi",
        "skills_text": "Python, Django, FastAPI, React, PostgreSQL, JavaScript, REST APIs, Git, Agile Scrum",
        "bio": "Intensive software engineering bootcamp graduate with 6 portfolio full-stack apps including M-Pesa API payment integrations.",
    },
    {
        "email": "peter.maina@kabete.ac.ke",
        "full_name": "Peter Maina Kariuki",
        "phone": "+254712340008",
        "institution": "Kabete National Polytechnic (TVET)",
        "course": "Craft Certificate in Metal Processing & Welding",
        "year_of_study": "Graduated",
        "career_goal": "Structural Metal Fabricator and Industrial Welder seeking workshop or construction placement.",
        "opportunity_type": "Full-time",
        "county": "Nairobi",
        "skills_text": "Arc Welding, MIG Welding, Metal Fabrication, Blueprint Reading, Steel Cutting, Workshop Safety, Grinding",
        "bio": "Informally and TVET-trained welder experienced in structural steel gates, window frames, truss fabrication, and safety compliance.",
    },
    {
        "email": "esther.chebet@mu.ac.ke",
        "full_name": "Esther Chebet Korir",
        "phone": "+254712340009",
        "institution": "Moi University",
        "course": "Bachelor of Business Management (Accounting)",
        "year_of_study": "4",
        "career_goal": "Junior Accountant and Audit Associate specializing in tax compliance and financial reporting.",
        "opportunity_type": "Internship",
        "county": "Uasin Gishu",
        "skills_text": "Accounting, QuickBooks, Excel, Financial Reporting, Bookkeeping, KRA Tax Filing, Auditing, Reconciliation",
        "bio": "Accounting finalist proficient in QuickBooks, bank reconciliations, payroll preparation, and IFRS financial statement analysis.",
    },
    {
        "email": "john.mwenda@ku.ac.ke",
        "full_name": "John Mwenda Gitonga",
        "phone": "+254712340010",
        "institution": "Kenyatta University",
        "course": "BSc. Electrical and Electronic Engineering",
        "year_of_study": "4",
        "career_goal": "Renewable Energy and Solar PV Technician designing off-grid commercial power systems.",
        "opportunity_type": "Internship",
        "county": "Nairobi",
        "skills_text": "Solar PV Installation, Circuit Design, AutoCAD Electrical, PLC Programming, Power Systems, Wiring, Multimeter Diagnostics",
        "bio": "Electrical engineering student with practical attachment experience in rooftop solar sizing, inverter wiring, and industrial motor control.",
    },
    {
        "email": "mary.njeri@zetech.ac.ke",
        "full_name": "Mary Njeri Githinji",
        "phone": "+254712340011",
        "institution": "Zetech University",
        "course": "Diploma in Graphic Design and Multimedia",
        "year_of_study": "3",
        "career_goal": "UI/UX and Brand Identity Designer crafting intuitive mobile interfaces and marketing collateral.",
        "opportunity_type": "Internship",
        "county": "Kiambu",
        "skills_text": "Figma, Adobe Photoshop, Adobe Illustrator, UI/UX Design, Wireframing, Branding, Typography, Canva",
        "bio": "Visual designer skilled in Figma interactive prototypes, brand style guides, social media kits, and print layout design.",
    },
    {
        "email": "ibrahim.ali@kisumupoly.ac.ke",
        "full_name": "Ibrahim Abdi Ali",
        "phone": "+254712340012",
        "institution": "Kisumu National Polytechnic (TVET)",
        "course": "Diploma in Automotive Engineering",
        "year_of_study": "Graduated",
        "career_goal": "Automotive Diagnostics and Fleet Maintenance Technician in a busy service garage.",
        "opportunity_type": "Full-time",
        "county": "Kisumu",
        "skills_text": "Engine Diagnostics, Brake Systems, Vehicle Servicing, OBD-II Scanning, Gearbox Repair, Auto Electricals, Preventive Maintenance",
        "bio": "Hands-on automotive technician trained in petrol and diesel engine overhauls, computer fault scanning, and fleet maintenance schedules.",
    },
    {
        "email": "cynthia.mutindi@daystar.ac.ke",
        "full_name": "Cynthia Mutindi Kyalo",
        "phone": "+254712340013",
        "institution": "Daystar University",
        "course": "BA. Human Resource Management",
        "year_of_study": "4",
        "career_goal": "People Operations and Talent Acquisition Coordinator supporting inclusive recruitment.",
        "opportunity_type": "Internship",
        "county": "Machakos",
        "skills_text": "Recruitment, Onboarding, HR Administration, Employee Relations, Microsoft Office, Interview Scheduling, Labor Law Basics",
        "bio": "HR management student experienced in candidate screening, interview coordination, employee records management, and campus career events.",
    },
    {
        "email": "david.omondi@dekut.ac.ke",
        "full_name": "David Omondi Onyango",
        "phone": "+254712340014",
        "institution": "Dedan Kimathi University of Technology (DeKUT)",
        "course": "BSc. Information Technology",
        "year_of_study": "3",
        "career_goal": "Cybersecurity Analyst and Cloud Infrastructure Intern securing web applications and networks.",
        "opportunity_type": "Internship",
        "county": "Nyeri",
        "skills_text": "Cybersecurity, Network Security, Linux, Python, Penetration Testing, OWASP, AWS Basics, Bash Scripting",
        "bio": "IT undergraduate focused on vulnerability assessment, OWASP web security auditing, Linux hardening, and automated log monitoring.",
    },
    {
        "email": "lucy.wangari@nyeripoly.ac.ke",
        "full_name": "Lucy Wangari Ndegwa",
        "phone": "+254712340015",
        "institution": "Nyeri National Polytechnic (TVET)",
        "course": "Diploma in Building and Civil Engineering",
        "year_of_study": "Graduated",
        "career_goal": "Site Assistant and Quantity Surveying Technician for residential and road construction.",
        "opportunity_type": "Full-time",
        "county": "Nyeri",
        "skills_text": "AutoCAD, Site Supervision, Quantity Surveying, Concrete Testing, Surveying Leveling, Bill of Quantities, Construction Safety",
        "bio": "Civil engineering technician experienced in reading architectural blueprints, preparing bills of quantities, and supervising masonry crews.",
    },
    {
        "email": "victor.kipchoge@usiu.ac.ke",
        "full_name": "Victor Kipchoge Ruto",
        "phone": "+254712340016",
        "institution": "United States International University - Africa (USIU)",
        "course": "BSc. International Business Administration (Finance)",
        "year_of_study": "4",
        "career_goal": "Investment and Corporate Finance Analyst evaluating SME credit and growth strategies.",
        "opportunity_type": "Internship",
        "county": "Nairobi",
        "skills_text": "Financial Modeling, Excel, Valuation, Corporate Finance, Market Research, PowerPoint, Credit Analysis",
        "bio": "Finance major skilled in DCF financial modeling, SME credit risk evaluation, equity research, and executive pitch decks.",
    },
    {
        "email": "sharon.makena@embuni.ac.ke",
        "full_name": "Sharon Makena Murithi",
        "phone": "+254712340017",
        "institution": "University of Embu",
        "course": "BSc. Environmental Conservation and Natural Resource Management",
        "year_of_study": "4",
        "career_goal": "GIS and Environmental Impact Assessment (EIA) Assistant supporting sustainability projects.",
        "opportunity_type": "Internship",
        "county": "Embu",
        "skills_text": "QGIS, ArcGIS, Environmental Impact Assessment, Field Data Collection, GPS Mapping, Report Writing, Sustainability",
        "bio": "Environmental science student proficient in QGIS spatial mapping, NEMA EIA field audits, and biodiversity data reporting.",
    },
    {
        "email": "george.wafula@mmust.ac.ke",
        "full_name": "George Wafula Simiyu",
        "phone": "+254712340018",
        "institution": "Masinde Muliro University of Science and Technology",
        "course": "BSc. Computer Science",
        "year_of_study": "3",
        "career_goal": "Mobile App Developer building Android and cross-platform Flutter apps for African businesses.",
        "opportunity_type": "Part-time",
        "county": "Kakamega",
        "skills_text": "Flutter, Dart, Android, Firebase, REST APIs, Git, Mobile UI, SQLite",
        "bio": "Mobile developer with published Flutter prototypes featuring offline SQLite sync, Firebase auth, and clean Material design.",
    },
    {
        "email": "fatuma.omar@coasttvet.ac.ke",
        "full_name": "Fatuma Omar Salim",
        "phone": "+254712340019",
        "institution": "Mombasa Technical Training Institute (TVET)",
        "course": "Diploma in Hospitality and Catering Management",
        "year_of_study": "Graduated",
        "career_goal": "Front Office and Guest Relations Supervisor in coastal resorts and business hotels.",
        "opportunity_type": "Full-time",
        "county": "Mombasa",
        "skills_text": "Customer Service, Front Office Operations, Hotel Reservation Systems, Food Safety, Event Coordination, Communication",
        "bio": "Hospitality graduate experienced in hotel reception management, guest check-in/out operations, banquet coordination, and service quality.",
    },
    {
        "email": "collins.ngetich@alx-africa.com",
        "full_name": "Collins Ngetich Langat",
        "phone": "+254712340020",
        "institution": "ALX Africa (Self-Directed / Bootcamp)",
        "course": "ALX Cloud & DevOps Engineering",
        "year_of_study": "Graduated",
        "career_goal": "Junior DevOps and Cloud Engineer automating CI/CD pipelines and containerized Linux servers.",
        "opportunity_type": "Full-time",
        "county": "Nairobi",
        "skills_text": "Docker, Linux, GitHub Actions, AWS, Nginx, Bash, Python, CI/CD, PostgreSQL",
        "bio": "Cloud-focused technologist skilled in Dockerizing multi-service apps, configuring Nginx reverse proxies, and automating GitHub Actions tests.",
    },
]


EMPLOYERS_DATA = [
    {"email": "hr@savannahpay.co.ke", "company_name": "SavannahPay Fintech Ltd", "industry": "Fintech & Software", "county": "Nairobi"},
    {"email": "talent@kilimohub.co.ke", "company_name": "KilimoHub AgriTech", "industry": "Agriculture & Logistics", "county": "Nakuru"},
    {"email": "careers@pwani-logistics.co.ke", "company_name": "Pwani Marine & Logistics", "industry": "Supply Chain & Maritime", "county": "Mombasa"},
    {"email": "jobs@lakeviewdigital.co.ke", "company_name": "LakeView Digital Agency", "industry": "Media & Marketing", "county": "Kisumu"},
    {"email": "hr@simbasteelworks.co.ke", "company_name": "Simba Structural Steel & Fabrication", "industry": "Manufacturing & Engineering", "county": "Nairobi"},
    {"email": "recruitment@riftvalleyaudit.co.ke", "company_name": "Rift Valley Associates CPA", "industry": "Finance & Accounting", "county": "Uasin Gishu"},
    {"email": "careers@jua-solar.co.ke", "company_name": "JuaPower Solar Solutions", "industry": "Renewable Energy", "county": "Nairobi"},
    {"email": "hr@mtkenyabuilders.co.ke", "company_name": "Mt. Kenya Civil & Building Contractors", "industry": "Construction & Civil", "county": "Nyeri"},
    {"email": "talent@bahariresort.co.ke", "company_name": "Bahari Palms Beach Resort", "industry": "Hospitality & Tourism", "county": "Mombasa"},
    {"email": "careers@cloudcraft.co.ke", "company_name": "CloudCraft Systems Africa", "industry": "Cloud & Cybersecurity", "county": "Nairobi"},
]

ROLE_TEMPLATES = [
    ("Junior Python Backend Developer", "Build and maintain high-throughput FastAPI REST endpoints, PostgreSQL schemas, and asynchronous workers for payment and marketplace systems.", "Python, FastAPI, Django, React, PostgreSQL, Docker, REST APIs", "Internship"),
    ("Frontend React Developer Intern", "Develop responsive, accessible user interfaces in React and Tailwind CSS, integrating RESTful backend APIs and state management.", "React, JavaScript, HTML, CSS, Tailwind CSS, Git", "Internship"),
    ("Full-Stack Software Engineer", "Architect end-to-end web applications using Python/Django or FastAPI on the backend and React on the frontend with automated CI/CD.", "Python, FastAPI, Django, React, PostgreSQL, Docker, REST APIs", "Full-time"),
    ("Data Analyst & BI Intern", "Clean operational datasets, write complex SQL queries, and build executive Power BI and Excel dashboards for business intelligence.", "Python, SQL, Pandas, Excel, Power BI, Statistics", "Internship"),
    ("Machine Learning & NLP Junior Engineer", "Train and evaluate text classification and semantic search pipelines using Python, Scikit-learn, and transformer embeddings.", "Python, Machine Learning, Scikit-learn, NumPy, Pandas, NLP", "Full-time"),
    ("IT Helpdesk & Network Support Technician", "Provide Tier-1/Tier-2 desktop troubleshooting, Linux/Windows server maintenance, LAN cabling, and router configuration.", "Networking, Linux, Windows Server, Troubleshooting, TCP/IP, Hardware Maintenance", "Full-time"),
    ("Cybersecurity & SOC Analyst Intern", "Monitor network traffic, run OWASP web vulnerability scans, harden Linux servers, and document security incident playbooks.", "Cybersecurity, Network Security, Linux, OWASP, Python, Bash Scripting", "Internship"),
    ("Junior DevOps & Cloud Operations Engineer", "Automate Docker builds, manage Nginx reverse proxies, configure GitHub Actions CI/CD pipelines, and monitor cloud instances.", "Docker, Linux, GitHub Actions, AWS, Nginx, CI/CD, Bash", "Full-time"),
    ("Flutter Mobile App Developer", "Build cross-platform Android/iOS mobile applications in Flutter and Dart with offline SQLite storage and REST API sync.", "Flutter, Dart, Android, Firebase, REST APIs, Git, SQLite", "Part-time"),
    ("UI/UX Product Designer Intern", "Create user flows, wireframes, design systems, and interactive mobile/web prototypes in Figma alongside engineering teams.", "Figma, UI/UX Design, Wireframing, Adobe Photoshop, Branding", "Internship"),
    ("Digital Marketing & SEO Associate", "Execute social media growth campaigns, write SEO-optimized web content, design visual assets, and track Google Analytics metrics.", "Digital Marketing, SEO, Content Writing, Social Media Management, Canva, Google Analytics", "Part-time"),
    ("Content Creator & Brand Communications Intern", "Draft press releases, manage Instagram/LinkedIn brand storytelling, and produce promotional graphics for SME clients.", "Copywriting, Social Media Management, Canva, Content Writing, Communication", "Internship"),
    ("Junior Accountant & Tax Assistant", "Manage daily bookkeeping in QuickBooks, perform bank reconciliations, prepare payroll schedules, and assist with KRA VAT/PAYE returns.", "Accounting, QuickBooks, Excel, Bookkeeping, KRA Tax Filing, Reconciliation", "Internship"),
    ("Financial & Credit Analyst Intern", "Build Excel financial models, assess SME loan applications, conduct market research, and prepare investment memos.", "Financial Modeling, Excel, Corporate Finance, Credit Analysis, Market Research", "Internship"),
    ("Human Resources & Recruitment Intern", "Screen CVs, coordinate candidate interviews, maintain HR employee files, and assist with staff onboarding programs.", "Recruitment, Onboarding, HR Administration, Interview Scheduling, Microsoft Office", "Internship"),
    ("Agribusiness Supply Chain Coordinator", "Coordinate rural produce aggregation, monitor warehouse inventory levels, and optimize fleet dispatch across agricultural counties.", "Supply Chain Management, Inventory Control, Excel, Agribusiness, Procurement", "Internship"),
    ("Structural Welder & Metal Fabricator", "Fabricate heavy steel trusses, gates, industrial frames, and structural joints using Arc and MIG welding equipment from technical blueprints.", "Arc Welding, MIG Welding, Metal Fabrication, Blueprint Reading, Steel Cutting, Workshop Safety", "Full-time"),
    ("Solar PV & Electrical Installation Technician", "Install commercial and residential rooftop solar panels, wire hybrid inverters, and test industrial electrical circuits.", "Solar PV Installation, Wiring, Circuit Design, Power Systems, Multimeter Diagnostics", "Internship"),
    ("Automotive Fleet Maintenance Mechanic", "Perform routine vehicle servicing, OBD-II electronic fault diagnostics, brake overhauls, and gearbox repairs on commercial vans.", "Engine Diagnostics, Vehicle Servicing, OBD-II Scanning, Brake Systems, Preventive Maintenance", "Full-time"),
    ("Civil Engineering & Site Quantity Surveyor", "Prepare Bills of Quantities (BoQ), interpret AutoCAD structural drawings, conduct site leveling, and supervise concrete works.", "AutoCAD, Quantity Surveying, Site Supervision, Bill of Quantities, Concrete Testing", "Full-time"),
    ("GIS & Environmental Field Officer", "Conduct NEMA Environmental Impact Assessment field surveys, capture GPS coordinates, and produce spatial maps in QGIS.", "QGIS, ArcGIS, Environmental Impact Assessment, Field Data Collection, GPS Mapping", "Internship"),
    ("Hotel Front Office & Guest Relations Officer", "Manage guest reservations, check-in/check-out hospitality workflows, event coordination, and customer service excellence.", "Customer Service, Front Office Operations, Hotel Reservation Systems, Event Coordination, Communication", "Full-time"),
    ("Junior Database & SQL Developer", "Optimize PostgreSQL queries, design normalized relational tables, write ETL scripts, and maintain database backups.", "PostgreSQL, SQL, Python, Data Modeling, Linux", "Full-time"),
    ("Technical Support & Quality Assurance Tester", "Write automated test cases, verify API responses, reproduce software bugs, and validate release builds before deployment.", "Testing, Python, REST APIs, Git, Troubleshooting, SQL", "Part-time"),
]

COUNTIES_POOL = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Uasin Gishu", "Nyeri", "Machakos", "Embu", "Kakamega"]
VARIATION_PREFIXES = [
    ("Graduate Trainee — ", "Entry-level structured rotational program for recent university and TVET graduates. "),
    ("Junior ", "Hands-on role working directly with senior mentors on live client deliverables. "),
    ("Associate ", "Fast-paced opportunity ideal for proactive candidates with strong practical skills. "),
    ("Field & Operations ", "Practical role combining technical execution with on-site teamwork. "),
    ("Assistant ", "Supportive team role offering mentorship, skill growth, and career progression. "),
]


def seed_database():
    db = SessionLocal()
    try:
        default_pw_hash = get_password_hash("SkillMatch@2026")

        created_students = 0
        for s_data in STUDENTS_DATA:
            existing_user = db.query(User).filter(User.email == s_data["email"]).first()
            if existing_user:
                continue

            name_parts = s_data["full_name"].strip().split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else "User"

            user = User()
            set_known_attrs(user, {
                "first_name": first_name,
                "last_name": last_name,
                "phone_number": s_data["phone"],
                "email": s_data["email"],
                "password_hash": default_pw_hash,
                "hashed_password": default_pw_hash,
                "role": "student",
                "user_type": "student",
                "county": s_data["county"],
                "is_active": True,
                "is_verified": True,
                "is_approved": True,
            })
            db.add(user)
            db.flush()

            profile_text = f"{s_data['career_goal']}. Skills: {s_data['skills_text']}. Bio: {s_data['bio']}"
            embedding_vec = sbert_model.encode(profile_text).tolist()

            student = Student()
            set_known_attrs(student, {
                "user_id": user.id,
                "full_name": s_data["full_name"],
                "phone": s_data["phone"],
                "institution": s_data["institution"],
                "course": s_data["course"],
                "year_of_study": s_data["year_of_study"],
                "career_goal": s_data["career_goal"],
                "opportunity_type": s_data["opportunity_type"],
                "county": s_data["county"],
                "skills_text": s_data["skills_text"],
                "bio": s_data["bio"],
                "embedding": embedding_vec,
            })
            db.add(student)
            created_students += 1

        db.commit()
        print(f"✔ Seeded {created_students} new student profiles (Total students in DB: {db.query(Student).count()}).")

        employer_user_ids = []
        for e_data in EMPLOYERS_DATA:
            existing_emp_user = db.query(User).filter(User.email == e_data["email"]).first()
            if existing_emp_user:
                employer_user_ids.append((existing_emp_user.id, e_data["county"]))
                continue

            emp_user = User()
            set_known_attrs(emp_user, {
                "first_name": e_data["company_name"].split(" ")[0],
                "last_name": "HR",
                "phone_number": "+254700000000",
                "email": e_data["email"],
                "password_hash": default_pw_hash,
                "hashed_password": default_pw_hash,
                "role": "employer",
                "user_type": "employer",
                "county": e_data["county"],
                "is_active": True,
                "is_verified": True,
                "is_approved": True,
            })
            db.add(emp_user)
            db.flush()

            domain_slug = e_data["email"].split("@")[1]
            employer = Employer()
            set_known_attrs(employer, {
                "user_id": emp_user.id,
                "company_name": e_data["company_name"],
                "company_email": e_data["email"],
                "company_website": f"https://{domain_slug}",
                "company_description": f"{e_data['company_name']} operating in {e_data['industry']} across {e_data['county']} County, Kenya.",
                "industry": e_data["industry"],
                "county": e_data["county"],
                "is_approved": True,
            })
            db.add(employer)
            db.flush()
            employer_user_ids.append((employer.id, e_data["county"]))

        db.commit()
        print(f"✔ Verified {len(employer_user_ids)} employer accounts.")

        created_jobs = 0
        job_index = 0

        for var_idx, (prefix, desc_intro) in enumerate(VARIATION_PREFIXES):
            for role_idx, (base_title, base_desc, req_skills, opp_type) in enumerate(ROLE_TEMPLATES):
                if created_jobs >= 120:
                    break

                emp_id, default_county = employer_user_ids[job_index % len(employer_user_ids)]
                county = COUNTIES_POOL[(job_index + var_idx) % len(COUNTIES_POOL)]
                full_title = f"{prefix}{base_title}"
                full_desc = f"{desc_intro}{base_desc} Based in {county} County, Kenya."

                opp_cycle = ["Internship", "Full-time", "Part-time"]
                final_opp_type = opp_type if var_idx % 2 == 0 else opp_cycle[(role_idx + var_idx) % 3]

                job_text = f"{full_title}. {full_desc}. Required Skills: {req_skills}"
                job_embedding = sbert_model.encode(job_text).tolist()

                job = JobPosting()
                set_known_attrs(job, {
                    "employer_id": emp_id,
                    "title": full_title,
                    "description": full_desc,
                    "required_skills": req_skills,
                    "opportunity_type": final_opp_type,
                    "location": county,
                    "county": county,
                    "source_type": "internal",
                    "source_url": "",
                    "embedding": job_embedding,
                    "is_active": True,
                })
                db.add(job)
                created_jobs += 1
                job_index += 1

        db.commit()
        print(f"✔ Seeded {created_jobs} new job opportunities (Total jobs in DB: {db.query(JobPosting).count()}).")
        print("\nAll test accounts share password: SkillMatch@2026")
        print("Sample Student Login: brian.kamau@strathmore.edu")
        print("Sample Employer Login: hr@savannahpay.co.ke")

    except Exception as e:
        db.rollback()
        print("❌ Error seeding database:", e)
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()