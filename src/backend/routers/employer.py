from fastapi import APIRouter, Depends, status, Form
from sqlalchemy.orm import Session

from database import get_db
from model import User
from dependencies import require_roles

router = APIRouter(prefix="/employer", tags=["Employers"])

@router.get("/dashboard")
def employer_dashboard(current_user: User = Depends(require_roles(["employer", "admin"]))):
    return {"message": f"Welcome Employer {current_user.email}!"}

@router.post("/post-role")
def post_job_role(
    title: str = Form(...),
    description: str = Form(...),
    requirements: str = Form(...),
    current_user: User = Depends(require_roles(["employer", "admin"])),
    db: Session = Depends(get_db)
):
    # Logic to store job postings ready for model matching
    return {
        "status": "success",
        "message": f"Job role '{title}' successfully created by employer {current_user.email}."
    }