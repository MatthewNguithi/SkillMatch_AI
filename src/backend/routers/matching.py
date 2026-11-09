from fastapi import APIRouter, Depends, HTTPException
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
from fastapi import Query
from collections import Counter
import numpy as np

from pydantic import BaseModel
from typing import Optional
from database import get_db
from model import Student, JobPosting, User, SavedMatch
from dependencies import get_current_user, require_roles

router = APIRouter()

sbert_model = SentenceTransformer("all-MiniLM-L6-v2")


class ProfilePreviewRequest(BaseModel):
    career_goal: Optional[str] = ""
    skills_text: Optional[str] = ""
    bio: Optional[str] = ""
    course: Optional[str] = ""
    opportunity_type: Optional[str] = ""
    institution: Optional[str] = ""


class EmployerMatchRequest(BaseModel):
    company: str
    job_title: str
    description: str
    required_skills: str
    county: str
    experience_level: str


class SaveMatchRequest(BaseModel):
    student_id: Optional[int] = None
    job_id: Optional[int] = None
    match_score: float
    job_title: Optional[str] = None


class InviteMatchRequest(BaseModel):
    student_id: Optional[int] = None
    match_score: float
    job_title: Optional[str] = None


def extract_skill_tokens(text: str):
    if not text:
        return []

    raw_tokens = re.split(r"[,|/;\n]+", text.lower())
    return [t.strip() for t in raw_tokens if len(t.strip()) > 1]


@router.get("/student/matches")
def get_job_matches(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student"])),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found. Please complete your profile first.",
        )

    if not student.embedding:
        profile_text = f"{student.career_goal}. Skills: {student.skills_text}. Bio: {student.bio or ''}"
        student.embedding = sbert_model.encode(profile_text).tolist()
        db.commit()

    student_vector = np.array(student.embedding).reshape(1, -1)

    jobs = (
        db.query(JobPosting)
        .filter(JobPosting.opportunity_type == student.opportunity_type)
        .all()
    )

    if not jobs:
        return {"matches": []}

    job_results = []
    for job in jobs:
        if not job.embedding:
            job_text = f"{job.title}. {job.description}. Required Skills: {job.required_skills or ''}"
            job.embedding = sbert_model.encode(job_text).tolist()
            db.commit()

        job_vector = np.array(job.embedding).reshape(1, -1)
        similarity_score = cosine_similarity(student_vector, job_vector)[0][0]
        match_percentage = round(float(similarity_score) * 100, 1)

        job_results.append(
            {
                "id": job.id,
                "title": job.title,
                "location": job.location,
                "source_type": job.source_type,
                "source_url": job.source_url,
                "match_score": match_percentage,
                "employer_id": job.employer_id,
            }
        )

    job_results.sort(key=lambda x: x["match_score"], reverse=True)
    return {"matches": job_results[:limit]}


@router.post("/employer/match")
def match_candidates_for_employer(
    request: EmployerMatchRequest,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "admin"])),
):
    job_text = f"{request.job_title}. {request.description}. Required Skills: {request.required_skills}"
    job_vector = np.array(sbert_model.encode(job_text).tolist()).reshape(1, -1)

    students = db.query(Student).filter(Student.embedding != None).all()
    if not students:
        return {"results": []}

    MIN_MATCH_SCORE = 45.0

    candidate_results = []
    for student in students:
        student_vector = np.array(student.embedding).reshape(1, -1)
        similarity_score = cosine_similarity(job_vector, student_vector)[0][0]
        match_percentage = round(float(similarity_score) * 100, 1)

        if match_percentage >= MIN_MATCH_SCORE:
            candidate_results.append(
                {
                    "id": student.user_id,
                    "full_name": student.full_name,
                    "institution": student.institution,
                    "course": student.course,
                    "skills": student.skills_text,
                    "match_score": match_percentage,
                }
            )

    candidate_results.sort(key=lambda x: x["match_score"], reverse=True)
    return {"results": candidate_results[:limit]}


@router.post("/matching/save")
def save_match(
    request: SaveMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "student"])),
):
    if current_user.role == "employer":
        existing = (
            db.query(SavedMatch)
            .filter_by(
                employer_id=current_user.id,
                student_id=request.student_id,
                saved_by_role="employer",
                job_title=request.job_title,
            )
            .first()
        )

        if existing:
            return {"message": "Candidate already saved for this role."}

        new_save = SavedMatch(
            employer_id=current_user.id,
            student_id=request.student_id,
            match_score=request.match_score,
            saved_by_role="employer",
            job_title=request.job_title,
        )
        db.add(new_save)
        db.commit()
        return {"status": "success", "message": "Candidate saved successfully."}

    elif current_user.role == "student":
        existing = (
            db.query(SavedMatch)
            .filter_by(
                student_id=current_user.id,
                job_id=request.job_id,
                saved_by_role="student",
            )
            .first()
        )

        if existing:
            return {"message": "Job already saved."}

        new_save = SavedMatch(
            student_id=current_user.id,
            job_id=request.job_id,
            match_score=request.match_score,
            saved_by_role="student",
        )
        db.add(new_save)
        db.commit()
        return {"status": "success", "message": "Job saved successfully."}


@router.get("/matching/saved")
def get_saved_candidates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "admin"])),
):
    saved_records = (
        db.query(SavedMatch, Student)
        .join(Student, SavedMatch.student_id == Student.user_id)
        .filter(
            SavedMatch.employer_id == current_user.id,
            SavedMatch.saved_by_role == "employer",
        )
        .order_by(SavedMatch.created_at.desc())
        .all()
    )

    results = []
    for saved, student in saved_records:
        results.append(
            {
                "id": student.user_id,
                "full_name": student.full_name,
                "institution": student.institution,
                "course": student.course,
                "skills": student.skills_text,
                "match_score": saved.match_score,
                "job_title": saved.job_title,
            }
        )
    return {"saved_candidates": results}


@router.get("/matching/student/saved")
def get_student_saved_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student", "admin"])),
):
    saved_records = (
        db.query(SavedMatch, JobPosting)
        .outerjoin(JobPosting, SavedMatch.job_id == JobPosting.id)
        .filter(SavedMatch.student_id == current_user.id)
        .order_by(SavedMatch.created_at.desc())
        .all()
    )

    results = []
    for saved, job in saved_records:
        results.append(
            {
                "id": saved.id,
                "job_id": job.id if job else None,
                "title": saved.job_title
                or (job.title if job else "General Application"),
                "location": job.location if job else "Nairobi",
                "source_type": job.source_type if job else "internal",
                "source_url": job.source_url if job else "",
                "employer_id": saved.employer_id,
                "itv_invite": getattr(saved, "itv_invite", False) or False,
                "match_score": saved.match_score,
            }
        )
    return {"saved_jobs": results}


@router.post("/matching/employer/invite")
def candidate_invite(
    request: InviteMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer"])),
):
    existing = (
        db.query(SavedMatch)
        .filter_by(
            employer_id=current_user.id,
            student_id=request.student_id,
            job_title=request.job_title,
        )
        .first()
    )

    if existing:
        existing.itv_invite = True
        db.commit()
        return {
            "status": "success",
            "message": "Interview invitation sent successfully!",
        }

    # If student wasn't saved beforehand, create a new record with itv_invite = True
    new_invite = SavedMatch(
        employer_id=current_user.id,
        student_id=request.student_id,
        match_score=request.match_score,
        saved_by_role="employer",
        job_title=request.job_title,
        itv_invite=True,
    )
    db.add(new_invite)
    db.commit()
    return {"status": "success", "message": "Interview invitation sent successfully!"}


@router.get("/student/profile-quality")
def check_profile_quality(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student"])),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found. Please complete your profile first.",
        )

    score = 0
    feedback_tips = []
    missing_suggested_skills = []

    # -------------------------------------------------------------
    # 1. UNIVERSAL STRUCTURAL HEALTH CHECKS (Applies to all courses)
    # -------------------------------------------------------------
    student_skills = extract_skill_tokens(student.skills_text or "")

    # Career Goal Check (20 pts)
    if student.career_goal and len(student.career_goal.strip()) >= 15:
        score += 20
    else:
        feedback_tips.append("Add a clear 1-2 sentence career goal or objective.")

    # Skills Quantity Check (30 pts)
    if len(student_skills) >= 5:
        score += 30
    elif len(student_skills) >= 2:
        score += 18
        feedback_tips.append(
            "List at least 5 core technical or practical skills for better matching."
        )
    else:
        score += 8
        feedback_tips.append(
            "Your skills section is thin. Add more relevant tools, methods, or competencies."
        )

    # Bio / Experience Depth Check (20 pts)
    if student.bio and len(student.bio.strip()) >= 50:
        score += 20
    else:
        feedback_tips.append(
            "Expand your bio or project summary to at least 50 characters."
        )

    # Institution & Course Details (10 pts)
    if student.institution and student.course:
        score += 10
    else:
        feedback_tips.append(
            "Ensure your institution and course of study are filled out."
        )

    # -------------------------------------------------------------
    # 2. DYNAMIC DOMAIN & COURSE BENCHMARKING (Course-Agnostic AI)
    # -------------------------------------------------------------
    # Find active job postings in the database that match the student's target sector or title keywords
    query_filters = []
    if student.opportunity_type:
        query_filters.append(JobPosting.opportunity_type == student.opportunity_type)

    domain_jobs = db.query(JobPosting).filter(*query_filters).all()

    # If domain jobs exist, aggregate industry skill demand for the student's field
    industry_skills_counter = Counter()
    domain_job_vectors = []

    for job in domain_jobs:
        if job.required_skills:
            tokens = extract_skill_tokens(job.required_skills)
            industry_skills_counter.update(tokens)
        if job.embedding:
            domain_job_vectors.append(job.embedding)

    # A. Identify missing high-demand skills in the student's course area
    student_skills_set = set(student_skills)
    top_industry_skills = [
        skill for skill, count in industry_skills_counter.most_common(12)
    ]

    for industry_skill in top_industry_skills:
        # Check if student lacks this industry skill (fuzzy match)
        if not any(
            student_s in industry_skill or industry_skill in student_s
            for student_s in student_skills_set
        ):
            missing_suggested_skills.append(industry_skill.title())
        if len(missing_suggested_skills) >= 5:
            break

    # B. SBERT Semantic Richness Check vs Industry Centroid (20 pts)
    if student.embedding and domain_job_vectors:
        student_vec = np.array(student.embedding).reshape(1, -1)
        # Compute industry centroid embedding
        industry_centroid = np.mean(domain_job_vectors, axis=0).reshape(1, -1)

        semantic_sim = float(cosine_similarity(student_vec, industry_centroid)[0][0])
        if semantic_sim >= 0.50:
            score += 20
        elif semantic_sim >= 0.35:
            score += 12
            feedback_tips.append(
                f"Incorporate industry terminology relevant to your field ({student.course or 'your target area'})."
            )
        else:
            score += 5
            feedback_tips.append(
                "Your profile description diverges from common job requirements in your industry."
            )
    else:
        # Fallback if no embeddings exist yet
        score += 10

    # Ensure score caps at 100
    final_score = min(score, 100)

    # Determine Strength Rating
    if final_score >= 80:
        strength = "Strong"
    elif final_score >= 55:
        strength = "Medium"
    else:
        strength = "Low"

    return {
        "score": final_score,
        "strength": strength,
        "course": student.course or "General Field",
        "missing_suggested_skills": missing_suggested_skills,
        "feedback_tips": feedback_tips,
    }


@router.post("/student/profile-quality/preview")
def preview_profile_quality(
    request: ProfilePreviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student"])),
):
    score = 0
    feedback_tips = []
    missing_suggested_skills = []

    # 1. Structural Checks on Unsaved Form Inputs
    student_skills = extract_skill_tokens(request.skills_text or "")

    if request.career_goal and len(request.career_goal.strip()) >= 15:
        score += 20
    else:
        feedback_tips.append("Add a clear 1-2 sentence career goal or objective.")

    if len(student_skills) >= 5:
        score += 30
    elif len(student_skills) >= 2:
        score += 18
        feedback_tips.append("List at least 5 core technical or practical skills.")
    else:
        score += 8
        feedback_tips.append(
            "Your skills section is thin. Add more tools or competencies."
        )

    if request.bio and len(request.bio.strip()) >= 50:
        score += 20
    else:
        feedback_tips.append(
            "Expand your bio or project summary to at least 50 characters."
        )

    if request.institution and request.course:
        score += 10
    else:
        feedback_tips.append("Ensure institution and course of study are filled out.")

    # 2. Industry Benchmark Comparison against active JobPostings
    query_filters = []
    if request.opportunity_type:
        query_filters.append(JobPosting.opportunity_type == request.opportunity_type)

    domain_jobs = db.query(JobPosting).filter(*query_filters).all()

    industry_skills_counter = Counter()
    domain_job_vectors = []

    for job in domain_jobs:
        if job.required_skills:
            tokens = extract_skill_tokens(job.required_skills)
            industry_skills_counter.update(tokens)
        if job.embedding:
            domain_job_vectors.append(job.embedding)

    student_skills_set = set(student_skills)
    top_industry_skills = [s for s, c in industry_skills_counter.most_common(12)]

    for industry_skill in top_industry_skills:
        if not any(
            st in industry_skill or industry_skill in st for st in student_skills_set
        ):
            missing_suggested_skills.append(industry_skill.title())
        if len(missing_suggested_skills) >= 5:
            break

    # 3. SBERT In-Memory Vector Encoding
    preview_text = (
        f"{request.career_goal or ''} {request.skills_text or ''} {request.bio or ''}"
    )
    if preview_text.strip() and domain_job_vectors:
        preview_vector = np.array(sbert_model.encode(preview_text)).reshape(1, -1)
        industry_centroid = np.mean(domain_job_vectors, axis=0).reshape(1, -1)
        semantic_sim = float(cosine_similarity(preview_vector, industry_centroid)[0][0])

        if semantic_sim >= 0.50:
            score += 20
        elif semantic_sim >= 0.35:
            score += 12
            feedback_tips.append(
                f"Incorporate relevant industry terminology for {request.course or 'your field'}."
            )
        else:
            score += 5
            feedback_tips.append(
                "Your description diverges from common job descriptions in this sector."
            )
    else:
        score += 10

    final_score = min(score, 100)
    strength = (
        "Strong" if final_score >= 80 else "Medium" if final_score >= 55 else "Low"
    )

    return {
        "score": final_score,
        "strength": strength,
        "course": request.course or "General Field",
        "missing_suggested_skills": missing_suggested_skills,
        "feedback_tips": feedback_tips,
    }

@router.get("/search/semantic")
def semantic_search(
    q: str = Query(..., min_length=2, description="Natural language intent query"),
    target: str = Query("jobs", description="Target collection: 'jobs' or 'candidates'"),
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student", "employer", "admin"]))
):
    if not q.strip():
        return {"results": []}

    # 1. Convert natural language query into SBERT vector embedding
    query_vector = np.array(sbert_model.encode(q.strip())).reshape(1, -1)
    results = []

    # 2. Match intent against Job Postings (for Student Search)
    if target == "jobs":
        jobs = db.query(JobPosting).all()
        for job in jobs:
            if not job.embedding:
                job_text = f"{job.title}. {job.description}. Required Skills: {job.required_skills or ''}"
                job.embedding = sbert_model.encode(job_text).tolist()
                db.commit()

            job_vector = np.array(job.embedding).reshape(1, -1)
            sim = float(cosine_similarity(query_vector, job_vector)[0][0])
            match_percentage = round(sim * 100, 1)

            # Similarity threshold cut-off
            if match_percentage >= 35.0:
                results.append({
                    "id": job.id,
                    "title": job.title,
                    "location": job.location,
                    "source_type": job.source_type,
                    "source_url": job.source_url,
                    "match_score": match_percentage,
                    "employer_id": job.employer_id
                })

    # 3. Match intent against Student Candidates (for Employer Search)
    elif target == "candidates":
        students = db.query(Student).all()
        for student in students:
            if not student.embedding:
                profile_text = f"{student.career_goal or ''}. Skills: {student.skills_text or ''}. Bio: {student.bio or ''}"
                if profile_text.strip():
                    student.embedding = sbert_model.encode(profile_text).tolist()
                    db.commit()

            if student.embedding:
                student_vector = np.array(student.embedding).reshape(1, -1)
                sim = float(cosine_similarity(query_vector, student_vector)[0][0])
                match_percentage = round(sim * 100, 1)

                if match_percentage >= 35.0:
                    results.append({
                        "id": student.user_id,
                        "full_name": student.full_name,
                        "institution": student.institution,
                        "course": student.course,
                        "skills": student.skills_text,
                        "match_score": match_percentage
                    })

    # 4. Rank by highest vector proximity
    results.sort(key=lambda x: x["match_score"], reverse=True)
    return {"query": q, "target": target, "results": results[:limit]}