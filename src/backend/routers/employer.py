from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from applications import JobApplication
from database import get_db
from dependencies import require_roles
from model import Employer, JobPosting, SavedMatch, Student, User

router = APIRouter(prefix="/employer", tags=["Employers"])


class CloseJobRequest(BaseModel):
    hired_student_user_id: Optional[int] = None


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
    db: Session = Depends(get_db),
):
    """Create a new open job posting linked to the authenticated employer's profile."""
    employer = db.query(Employer).filter(Employer.user_id == current_user.id).first()
    if not employer:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Employer profile not found. Please complete your company profile first.",
        )

    new_posting = JobPosting(
        title=title.strip(),
        description=description,
        required_skills=requirements,
        opportunity_type=opportunity_type,
        location=location,
        source_type="internal",
        status="open",
        employer_id=employer.id,
    )
    db.add(new_posting)
    db.commit()
    db.refresh(new_posting)

    return {
        "status": "success",
        "job_id": new_posting.id,
        "message": f"Job role '{title}' successfully posted.",
    }


@router.patch("/jobs/{job_id}/close")
def close_job_posting(
    job_id: int,
    payload: Optional[CloseJobRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "admin"])),
):
    """
    Permanently close a posted job without reopening capability.
    - If hired_student_user_id is provided: marks that student 'hired', remaining active applicants 'rejected',
      and closure_outcome='hired'.
    - If hired_student_user_id is None: marks remaining active applicants 'closed', and closure_outcome='closed_no_hire'.
    """
    employer = db.query(Employer).filter(Employer.user_id == current_user.id).first()
    if not employer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employer profile not found.",
        )

    job = (
        db.query(JobPosting)
        .filter(JobPosting.id == job_id, JobPosting.employer_id == employer.id)
        .first()
    )
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found.",
        )

    if (job.status or "").lower() == "closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job posting is already closed and cannot be modified.",
        )

    hired_user_id = payload.hired_student_user_id if payload else None
    hired_student = None

    if hired_user_id is not None:
        hired_student = (
            db.query(Student).filter(Student.user_id == hired_user_id).first()
        )
        if not hired_student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Selected student profile not found.",
            )

    job.status = "closed"
    job.hired_student_user_id = hired_user_id

    applications = (
        db.query(JobApplication).filter(JobApplication.job_id == job.id).all()
    )
    hired_app_found = False

    for app_row in applications:
        if hired_student and app_row.student_id == hired_student.id:
            app_row.status = "hired"
            hired_app_found = True
        elif (app_row.status or "").lower() not in {"hired", "accepted", "withdrawn"}:
            app_row.status = "rejected" if hired_student else "closed"

    if hired_student and not hired_app_found:
        db.add(
            JobApplication(
                student_id=hired_student.id,
                job_id=job.id,
                note="Selected when closing job posting",
                status="hired",
            )
        )

    saved_matches = (
        db.query(SavedMatch)
        .filter(
            SavedMatch.employer_id == current_user.id,
            (SavedMatch.job_id == job.id) | (SavedMatch.job_title.ilike(job.title)),
        )
        .all()
    )
    for sm in saved_matches:
        sm.job_id = job.id
        if hired_user_id is not None and sm.student_id == hired_user_id:
            sm.rsvp_status = "accepted"

    db.commit()
    db.refresh(job)

    closure_outcome = "hired" if hired_user_id is not None else "closed_no_hire"

    return {
        "status": "success",
        "job_id": job.id,
        "job_status": job.status,
        "closure_outcome": closure_outcome,
        "hired_student_user_id": job.hired_student_user_id,
        "message": (
            f"Candidate marked as Hired and job '{job.title}' closed."
            if hired_user_id is not None
            else f"Job '{job.title}' closed with no hire."
        ),
    }