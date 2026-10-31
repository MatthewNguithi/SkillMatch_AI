from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
import shutil
import os

from database import get_db
from model import User, Student
from dependencies import require_roles

router = APIRouter(prefix="/student", tags=["Students"])

@router.get("/dashboard")
def student_dashboard(current_user: User = Depends(require_roles(["student", "informal_worker", "admin"]))):
    return {"message": f"Welcome Student/Trainee {current_user.email}!"}

@router.post("/upload-cv")
def upload_student_cv(
    full_name: str = Form(...),
    phone: str = Form(...),
    institution: str = Form(...),
    course: str = Form(...),
    year_of_study: str = Form(...),
    career_goal: str = Form(...),
    opportunity_type: str = Form(...),
    county: str = Form(...),
    skills_text: str = Form(...),
    bio: str = Form(""),
    consent: bool = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(["student", "informal_worker"])),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Only PDF files are allowed for CV uploads."
        )

    upload_dir = "uploads/cvs"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{current_user.id}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    profile = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not profile:
        profile = Student(user_id=current_user.id)
        db.add(profile)
    
    profile.full_name = full_name
    profile.phone = phone
    profile.institution = institution
    profile.course = course
    profile.year_of_study = year_of_study
    profile.career_goal = career_goal
    profile.opportunity_type = opportunity_type
    profile.county = county
    profile.skills_text = skills_text
    profile.bio = bio
    profile.consent = consent

    db.commit()

    return {
        "status": "success",
        "message": f"Profile and CV successfully updated for {full_name}.",
        "filename": file.filename,
        "path": file_path
    }