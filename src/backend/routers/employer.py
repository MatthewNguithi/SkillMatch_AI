from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session

from database import get_db
from model import User, Employer, JobPosting
from dependencies import require_roles

router = APIRouter(prefix="/employer", tags=["Employers"])

@router.get("/dashboard")
def employer_dashboard(current_user: User = Depends(require_roles(["employer", "admin"]))):
    return {"message": f"Welcome Employer {current_user.email}!"}

@router.post("/post-role", status_code=status.HTTP_201_CREATED)
def post_job_role(
    title: str = Form(...),
    description: str = Form(...),
    requirements: str = Form(...),
    opportunity_type: str = Form("Internship"),
    location: str = Form("Nairobi"),
    current_user: User = Depends(require_roles(["employer", "admin"])),
    db: Session = Depends(get_db)
):
    """Create a new job posting linked to the authenticated employer's profile."""
    employer = db.query(Employer).filter(Employer.user_id == current_user.id).first()
    if not employer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employer profile not found. Please complete your company profile first."
        )

    new_posting = JobPosting(
        title=title,
        description=description,
        required_skills=requirements,
        opportunity_type=opportunity_type,
        location=location,
        source_type="internal",
        employer_id=employer.id,
    )
    db.add(new_posting)
    db.commit()
    db.refresh(new_posting)

    return {
        "status": "success",
        "job_id": new_posting.id,
        "message": f"Job role '{title}' successfully posted."
    }