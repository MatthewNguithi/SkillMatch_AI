from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form
from sqlalchemy.orm import Session
import shutil
import os

from database import get_db
from model import User
from dependencies import require_roles

router = APIRouter(prefix="/student", tags=["Students"])

@router.get("/dashboard")
def student_dashboard(current_user: User = Depends(require_roles(["student", "informal_worker", "admin"]))):
    return {"message": f"Welcome Student/Trainee {current_user.email}!"}

@router.post("/upload-cv")
def upload_student_cv(
    fullName: str = Form(...),
    skills: str = Form(...),
    cvFile: UploadFile = File(...),
    current_user: User = Depends(require_roles(["student", "informal_worker"])),
    db: Session = Depends(get_db)
):
    # Validate PDF format
    if not cvFile.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Only PDF files are allowed for CV uploads."
        )

    # Save file locally (prepping for SBERT text extraction later)
    upload_dir = "uploads/cvs"
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{current_user.id}_{cvFile.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(cvFile.file, buffer)

    return {
        "status": "success",
        "message": f"CV successfully uploaded and saved for {fullName}.",
        "filename": cvFile.filename,
        "path": file_path
    }