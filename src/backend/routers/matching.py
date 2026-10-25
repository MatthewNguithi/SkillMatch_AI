from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from pydantic import BaseModel
from database import get_db
from model import Student, JobPosting, User
from dependencies import get_current_user, require_roles

router = APIRouter()

# Load the SBERT model once into memory when the server starts
# 'all-MiniLM-L6-v2' is lightweight and extremely fast for semantic search
sbert_model = SentenceTransformer('all-MiniLM-L6-v2')

# Schema to accept the JSON payload from React
class EmployerMatchRequest(BaseModel):
    company: str
    job_title: str
    description: str
    required_skills: str
    county: str
    experience_level: str

@router.get("/student/matches")
def get_job_matches(
    limit: int = 10, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(require_roles(["student"]))
):
    # 1. Retrieve the student profile
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found. Please complete your profile first.")

    # 2. Get or Generate the Student Embedding
    if not student.embedding:
        # Combine relevant text fields to create a rich profile string
        profile_text = f"{student.career_goal}. Skills: {student.skills_text}. Bio: {student.bio or ''}"
        student.embedding = sbert_model.encode(profile_text).tolist()
        db.commit()

    student_vector = np.array(student.embedding).reshape(1, -1)

    # 3. Retrieve jobs that match the student's desired opportunity type
    jobs = db.query(JobPosting).filter(JobPosting.opportunity_type == student.opportunity_type).all()
    
    if not jobs:
        return {"matches": []}

    # 4. Calculate Cosine Similarity
    job_results = []
    for job in jobs:
        if not job.embedding:
            # Generate missing job embeddings on the fly (can also be done during job creation)
            job_text = f"{job.title}. {job.description}. Required Skills: {job.required_skills or ''}"
            job.embedding = sbert_model.encode(job_text).tolist()
            db.commit()

        job_vector = np.array(job.embedding).reshape(1, -1)
        
        # Cosine similarity returns a value between -1 and 1
        similarity_score = cosine_similarity(student_vector, job_vector)[0][0]
        
        # Convert to a percentage for the UI
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

    # 5. Sort by highest match score and return the top results
    job_results.sort(key=lambda x: x["match_score"], reverse=True)
    
    return {"matches": job_results[:limit]}

@router.post("/employer/match")
def match_candidates_for_employer(
    request: EmployerMatchRequest,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "admin"]))
):
    # 1. Generate an embedding for the employer's job requirements
    job_text = f"{request.job_title}. {request.description}. Required Skills: {request.required_skills}"
    job_vector = np.array(sbert_model.encode(job_text).tolist()).reshape(1, -1)

    # 2. Retrieve all students who have uploaded a CV (have embeddings)
    students = db.query(Student).filter(Student.embedding != None).all()
    
    if not students:
        return {"results": []}

    # 3. Calculate Cosine Similarity
    candidate_results = []
    for student in students:
        student_vector = np.array(student.embedding).reshape(1, -1)
        similarity_score = cosine_similarity(job_vector, student_vector)[0][0]
        
        match_percentage = round(float(similarity_score) * 100, 1)

        candidate_results.append({
            "id": student.id,
            "full_name": student.full_name,
            "institution": student.institution,
            "course": student.course,
            "skills": student.skills_text,
            "match_score": match_percentage
        })

    # 4. Sort candidates by best match and return top results
    candidate_results.sort(key=lambda x: x["match_score"], reverse=True)
    
    return {"results": candidate_results[:limit]}