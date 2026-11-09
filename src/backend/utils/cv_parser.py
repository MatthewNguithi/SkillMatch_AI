import fitz  # PyMuPDF
import docx
import spacy
from spacy.matcher import PhraseMatcher
import re
import io
from typing import Dict, List, Any

# Load spaCy NLP Model
nlp = spacy.load("en_core_web_sm")

# Comprehensive Multi-Domain Skill Taxonomy
SKILL_TAXONOMY = [
    # Software & Tech
    "Python", "JavaScript", "React", "Node.js", "FastAPI", "SQL", "PostgreSQL", 
    "Git", "Docker", "Machine Learning", "HTML", "CSS", "Tailwind", "Java", "C++",
    
    # Business & Finance
    "Financial Analysis", "Accounting", "Excel", "Project Management", "Marketing",
    "Customer Service", "Auditing", "Strategic Planning", "Data Analysis",
    
    # Law & Governance
    "Legal Drafting", "Contract Review", "Dispute Resolution", "Litigation", 
    "Legal Research", "Corporate Governance", "Compliance",
    
    # Healthcare & Nursing
    "Patient Care", "Triage", "Clinical Documentation", "Vital Signs", 
    "Phlebotomy", "Pharmacology", "Emergency Response",
    
    # Engineering & Trades
    "AutoCAD", "Circuit Testing", "Wiring Diagrams", "Equipment Maintenance",
    "Welding", "HVAC", "PLC Programming", "Structural Analysis"
]

# Initialize spaCy PhraseMatcher with skill patterns
matcher = PhraseMatcher(nlp.vocab, attr="LOWER")
patterns = [nlp.make_doc(skill) for skill in SKILL_TAXONOMY]
matcher.add("SKILLS", patterns)


def extract_raw_text(file_bytes: bytes, filename: str) -> str:
    """Extracts raw text from PDF or DOCX binary stream."""
    text = ""
    filename_lower = filename.lower()

    if filename_lower.endswith(".pdf"):
        with fitz.open(stream=file_bytes, filetype="pdf") as pdf_doc:
            for page in pdf_doc:
                text += page.get_text() + "\n"
    elif filename_lower.endswith(".docx") or filename_lower.endswith(".doc"):
        doc = docx.Document(io.BytesIO(file_bytes))
        text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
    else:
        text = file_bytes.decode("utf-8", errors="ignore")

    return text.strip()


def parse_cv_document(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Parses CV document binary data and returns extracted entity fields.
    """
    raw_text = extract_raw_text(file_bytes, filename)
    if not raw_text:
        return {
            "extracted_skills": [],
            "institution": "",
            "phone": "",
            "email": "",
            "parsed_snippet": ""
        }

    doc = nlp(raw_text)

    # 1. Skill Tag Extraction via spaCy PhraseMatcher
    matches = matcher(doc)
    extracted_skills = set()
    for match_id, start, end in matches:
        span = doc[start:end]
        extracted_skills.add(span.text.title())

    # 2. Institution Extraction via spaCy Named Entity Recognition (ORG)
    extracted_orgs = []
    for ent in doc.ents:
        if ent.label_ == "ORG" and any(kw in ent.text.lower() for kw in ["university", "college", "institute", "school", "polytechnic"]):
            extracted_orgs.append(ent.text.strip())

    institution = extracted_orgs[0] if extracted_orgs else ""

    # 3. Contact Info Extraction via Regex
    phone_match = re.search(r"(\+?\d{1,3}[\s-]?)?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}", raw_text)
    email_match = re.search(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", raw_text)

    phone = phone_match.group(0) if phone_match else ""
    email = email_match.group(0) if email_match else ""

    return {
        "extracted_skills": list(extracted_skills),
        "institution": institution,
        "phone": phone,
        "email": email,
        "parsed_snippet": raw_text[:300] + "..." if len(raw_text) > 300 else raw_text
    }