from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from pydantic import BaseModel
from typing import Optional
from database import get_db
from model import Student, JobPosting, User, SavedMatch
from dependencies import get_current_user, require_roles

router = APIRouter()

sbert_model = SentenceTransformer('all-MiniLM-L6-v2')

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


@router.get("/student/matches")
def get_job_matches(
    limit: int = 10, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_roles(["student"]))
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found. Please complete your profile first.")

    if not student.embedding:
        profile_text = f"{student.career_goal}. Skills: {student.skills_text}. Bio: {student.bio or ''}"
        student.embedding = sbert_model.encode(profile_text).tolist()
        db.commit()

    student_vector = np.array(student.embedding).reshape(1, -1)

    jobs = db.query(JobPosting).filter(JobPosting.opportunity_type == student.opportunity_type).all()
    
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

        job_results.append({
            "id": job.id,
            "title": job.title,
            "location": job.location,
            "source_type": job.source_type,
            "source_url": job.source_url,
            "match_score": match_percentage,
            "employer_id": job.employer_id
        })

    job_results.sort(key=lambda x: x["match_score"], reverse=True)
    return {"matches": job_results[:limit]}


@router.post("/employer/match")
def match_candidates_for_employer(
    request: EmployerMatchRequest,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "admin"]))
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
            candidate_results.append({
                "id": student.user_id,
                "full_name": student.full_name,
                "institution": student.institution,
                "course": student.course,
                "skills": student.skills_text,
                "match_score": match_percentage
            })

    candidate_results.sort(key=lambda x: x["match_score"], reverse=True)
    return {"results": candidate_results[:limit]}


@router.post("/matching/save")
def save_match(
    request: SaveMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "student"]))
):
    if current_user.role == "employer":
        existing = db.query(SavedMatch).filter_by(
            employer_id=current_user.id, 
            student_id=request.student_id, 
            saved_by_role="employer",
            job_title=request.job_title
        ).first()
        
        if existing: 
            return {"message": "Candidate already saved for this role."}
        
        new_save = SavedMatch(
            employer_id=current_user.id, 
            student_id=request.student_id, 
            match_score=request.match_score, 
            saved_by_role="employer",
            job_title=request.job_title
        )
        db.add(new_save)
        db.commit()
        return {"status": "success", "message": "Candidate saved successfully."}

    elif current_user.role == "student":
        existing = db.query(SavedMatch).filter_by(
            student_id=current_user.id, 
            job_id=request.job_id, 
            saved_by_role="student"
        ).first()
        
        if existing: 
            return {"message": "Job already saved."}
        
        new_save = SavedMatch(
            student_id=current_user.id, 
            job_id=request.job_id, 
            match_score=request.match_score, 
            saved_by_role="student"
        )
        db.add(new_save)
        db.commit()
        return {"status": "success", "message": "Job saved successfully."}


@router.get("/matching/saved")
def get_saved_candidates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "admin"]))
):
    saved_records = db.query(SavedMatch, Student).join(
        Student, SavedMatch.student_id == Student.user_id
    ).filter(
        SavedMatch.employer_id == current_user.id,
        SavedMatch.saved_by_role == "employer"
    ).order_by(SavedMatch.created_at.desc()).all()

    results = []
    for saved, student in saved_records:
        results.append({
            "id": student.user_id,
            "full_name": student.full_name,
            "institution": student.institution,
            "course": student.course,
            "skills": student.skills_text,
            "match_score": saved.match_score,
            "job_title": saved.job_title
        })
    return {"saved_candidates": results}


@router.get("/matching/student/saved")
def get_student_saved_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student", "admin"]))
):
    saved_records = db.query(SavedMatch, JobPosting).outerjoin(
        JobPosting, SavedMatch.job_id == JobPosting.id
    ).filter(
        SavedMatch.student_id == current_user.id
    ).order_by(SavedMatch.created_at.desc()).all()

    results = []
    for saved, job in saved_records:
        results.append({
            "id": saved.id,
            "job_id": job.id if job else None,
            "title": saved.job_title or (job.title if job else "General Application"),
            "location": job.location if job else "Nairobi",
            "source_type": job.source_type if job else "internal",
            "source_url": job.source_url if job else "",
            "employer_id": saved.employer_id,
            "itv_invite": getattr(saved, "itv_invite", False) or False,
            "match_score": saved.match_score
        })
    return {"saved_jobs": results}


@router.post("/matching/employer/invite")
def candidate_invite(
    request: InviteMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer"]))
):
    existing = db.query(SavedMatch).filter_by(
        employer_id=current_user.id,
        student_id=request.student_id,
        job_title=request.job_title
    ).first()

    if existing:
        existing.itv_invite = True
        db.commit()
        return {"status": "success", "message": "Interview invitation sent successfully!"}
    
    # If student wasn't saved beforehand, create a new record with itv_invite = True
    new_invite = SavedMatch(
        employer_id=current_user.id,
        student_id=request.student_id,
        match_score=request.match_score,
        saved_by_role="employer",
        job_title=request.job_title,
        itv_invite=True
    )
    db.add(new_invite)
    db.commit()
    return {"status": "success", "message": "Interview invitation sent successfully!"}