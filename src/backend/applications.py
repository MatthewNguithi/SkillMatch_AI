import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Session

from database import Base, get_db
from dependencies import require_roles
from model import Employer, JobPosting, Student, User, SavedMatch

VALID_STATUSES = {
    "submitted",
    "reviewed",
    "shortlisted",
    "hired",
    "accepted",
    "declined",
    "rejected",
    "closed",
    "withdrawn",
}


class JobApplication(Base):
    __tablename__ = "job_applications"
    __table_args__ = (
        UniqueConstraint("student_id", "job_id", name="uq_student_job_application"),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(
        Integer,
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    job_id = Column(
        Integer,
        ForeignKey("job_postings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    match_score = Column(Float, nullable=True)
    note = Column(Text, nullable=True)
    status = Column(String(40), default="submitted", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


router = APIRouter(prefix="/api/v1/applications", tags=["Applications"])


class ApplyRequest(BaseModel):
    job_id: int
    match_score: Optional[float] = None
    note: Optional[str] = ""


class ApplicationStatusUpdate(BaseModel):
    status: str


def _build_cv_metadata(student_row: Student, student_user_id: int) -> dict:
    has_cv = bool(student_row.cv_file_path and os.path.isfile(student_row.cv_file_path))
    return {
        "has_cv": has_cv,
        "cv_filename": student_row.cv_filename if has_cv else None,
        "cv_url": f"/api/v1/applications/student/{student_user_id}/cv"
        if has_cv
        else None,
    }


def _resolve_rsvp_map(db: Session, employer_user_id: int, job_ids: list) -> dict:
    if not job_ids:
        return {}
    saved_matches = (
        db.query(SavedMatch)
        .filter(
            SavedMatch.employer_id == employer_user_id,
            SavedMatch.job_id.in_(job_ids),
        )
        .all()
    )
    return {
        (sm.student_id, sm.job_id): (sm.rsvp_status or "pending").lower()
        for sm in saved_matches
    }


def _effective_applicant_status(
    app_status: str, rsvp_status: str, job_row: JobPosting, student_user_id: int
) -> str:
    norm_app = (app_status or "submitted").lower()
    norm_rsvp = (rsvp_status or "pending").lower()
    job_closed = (getattr(job_row, "status", "open") or "open").lower() == "closed"
    hired_user_id = getattr(job_row, "hired_student_user_id", None)

    if norm_app == "withdrawn":
        return "withdrawn"
    if norm_app in {"hired", "accepted"} or (
        hired_user_id is not None and student_user_id == hired_user_id
    ):
        return "hired"
    if job_closed:
        if norm_app == "rejected":
            return "rejected"
        return "closed"
    if norm_rsvp == "declined" and norm_app not in {"hired", "accepted", "rejected"}:
        return "declined"
    if norm_rsvp == "accepted" and norm_app in {"submitted", "reviewed", "shortlisted"}:
        return "interview_accepted"
    return norm_app


@router.post("", status_code=status.HTTP_201_CREATED)
def submit_direct_application(
    payload: ApplyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student"])),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found. Please save your profile before applying.",
        )

    job = db.query(JobPosting).filter(JobPosting.id == payload.job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job opportunity not found.",
        )

    if (getattr(job, "status", "open") or "open").lower() == "closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job posting is closed.",
        )

    existing = (
        db.query(JobApplication)
        .filter(
            JobApplication.student_id == student.id, JobApplication.job_id == job.id
        )
        .first()
    )
    if existing and (existing.status or "").lower() not in {"withdrawn", "declined"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already applied to this opportunity.",
        )

    if existing:
        existing.status = "submitted"
        existing.match_score = payload.match_score
        existing.note = (payload.note or "").strip() or (student.career_goal or "")
        existing.created_at = datetime.utcnow()
        application = existing
    else:
        application = JobApplication(
            student_id=student.id,
            job_id=job.id,
            match_score=payload.match_score,
            note=(payload.note or "").strip() or (student.career_goal or ""),
            status="submitted",
        )
        db.add(application)

    employer = db.query(Employer).filter(Employer.id == job.employer_id).first()
    employer_user_id = employer.user_id if employer else None

    existing_match = (
        db.query(SavedMatch)
        .filter_by(
            student_id=current_user.id,
            job_id=job.id,
            saved_by_role="student",
        )
        .first()
    )
    if existing_match:
        existing_match.rsvp_status = "pending"
        existing_match.itv_invite = False
        if hasattr(existing_match, "rsvp_updated_at"):
            existing_match.rsvp_updated_at = None
        existing_match.match_score = payload.match_score or existing_match.match_score
    else:
        db.add(
            SavedMatch(
                student_id=current_user.id,
                employer_id=employer_user_id,
                job_id=job.id,
                job_title=job.title,
                match_score=payload.match_score or 0.0,
                saved_by_role="student",
                rsvp_status="pending",
            )
        )

    db.commit()
    db.refresh(application)

    return {
        "status": "success",
        "message": f"Application submitted for {job.title}.",
        "application": {
            "id": application.id,
            "job_id": job.id,
            "job_title": job.title,
            "company_name": employer.company_name if employer else None,
            "match_score": application.match_score,
            "status": application.status,
            "created_at": application.created_at.isoformat(),
        },
    }


@router.get("/my")
def get_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student"])),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        return {"applied_job_ids": [], "applications": []}

    rows = (
        db.query(JobApplication)
        .filter(JobApplication.student_id == student.id)
        .order_by(JobApplication.created_at.desc())
        .all()
    )

    return {
        "applied_job_ids": [r.job_id for r in rows],
        "applications": [
            {
                "id": r.id,
                "job_id": r.job_id,
                "match_score": r.match_score,
                "note": r.note,
                "status": r.status,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ],
    }


@router.get("/employer")
def get_employer_applications(
    job_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer"])),
):
    employer = db.query(Employer).filter(Employer.user_id == current_user.id).first()
    if not employer:
        return {"applications": [], "total": 0}

    query = (
        db.query(JobApplication, JobPosting, Student, User)
        .join(JobPosting, JobApplication.job_id == JobPosting.id)
        .join(Student, JobApplication.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .filter(JobPosting.employer_id == employer.id)
    )

    if job_id is not None:
        query = query.filter(JobPosting.id == job_id)

    rows = query.order_by(JobApplication.created_at.desc()).all()
    rsvp_map = _resolve_rsvp_map(
        db, current_user.id, list({job_row.id for _, job_row, _, _ in rows})
    )

    results = []
    for app_row, job_row, student_row, student_user in rows:
        cv_meta = _build_cv_metadata(student_row, student_user.id)
        rsvp_status = rsvp_map.get((student_user.id, job_row.id), "pending")
        effective_status = _effective_applicant_status(
            app_row.status, rsvp_status, job_row, student_user.id
        )
        results.append(
            {
                "id": app_row.id,
                "job_id": job_row.id,
                "job_title": job_row.title,
                "job_status": (getattr(job_row, "status", "open") or "open").lower(),
                "location": job_row.location,
                "opportunity_type": job_row.opportunity_type,
                "student_id": student_row.id,
                "student_user_id": student_user.id,
                "student_name": student_row.full_name
                or f"{student_user.first_name} {student_user.last_name}".strip(),
                "student_email": student_user.email,
                "phone": student_row.phone,
                "institution": student_row.institution,
                "course": student_row.course,
                "year_of_study": student_row.year_of_study,
                "county": student_row.county,
                "career_goal": student_row.career_goal,
                "skills_text": student_row.skills_text,
                "bio": student_row.bio,
                "match_score": app_row.match_score,
                "note": app_row.note,
                "status": effective_status,
                "rsvp_status": rsvp_status,
                "created_at": app_row.created_at.isoformat(),
                **cv_meta,
            }
        )

    return {"applications": results, "total": len(results)}


@router.get("/employer/overview")
def get_employer_jobs_with_applicants(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "admin"])),
):
    employer = db.query(Employer).filter(Employer.user_id == current_user.id).first()
    if not employer:
        return {"jobs": [], "total_jobs": 0}

    jobs = (
        db.query(JobPosting)
        .filter(JobPosting.employer_id == employer.id)
        .order_by(JobPosting.id.desc())
        .all()
    )

    if not jobs:
        return {"jobs": [], "total_jobs": 0}

    job_ids = [j.id for j in jobs]
    rsvp_map = _resolve_rsvp_map(db, current_user.id, job_ids)

    applicants_by_job = {job.id: [] for job in jobs}
    joined_rows = (
        db.query(JobApplication, Student, User)
        .join(Student, JobApplication.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .filter(JobApplication.job_id.in_(job_ids))
        .order_by(JobApplication.created_at.desc())
        .all()
    )

    job_by_id = {job.id: job for job in jobs}

    for app_row, student_row, student_user in joined_rows:
        job_row = job_by_id.get(app_row.job_id)
        cv_meta = _build_cv_metadata(student_row, student_user.id)
        rsvp_status = rsvp_map.get((student_user.id, app_row.job_id), "pending")
        effective_status = (
            _effective_applicant_status(
                app_row.status, rsvp_status, job_row, student_user.id
            )
            if job_row
            else (app_row.status or "submitted").lower()
        )
        applicants_by_job[app_row.job_id].append(
            {
                "application_id": app_row.id,
                "student_id": student_row.id,
                "student_user_id": student_user.id,
                "full_name": student_row.full_name
                or f"{student_user.first_name or ''} {student_user.last_name or ''}".strip()
                or student_user.email,
                "email": student_user.email,
                "phone": student_row.phone,
                "institution": student_row.institution,
                "course": student_row.course,
                "year_of_study": student_row.year_of_study,
                "county": student_row.county,
                "career_goal": student_row.career_goal,
                "skills_text": student_row.skills_text,
                "bio": student_row.bio,
                "match_score": app_row.match_score,
                "note": app_row.note,
                "status": effective_status,
                "rsvp_status": rsvp_status,
                "applied_at": app_row.created_at.isoformat(),
                **cv_meta,
            }
        )

    job_items = [
        {
            "id": job.id,
            "title": job.title,
            "description": job.description,
            "required_skills": job.required_skills,
            "opportunity_type": job.opportunity_type,
            "location": job.location,
            "source_type": job.source_type,
            "status": (getattr(job, "status", "open") or "open").lower(),
            "hired_student_user_id": getattr(job, "hired_student_user_id", None),
            "closure_outcome": (
                "hired"
                if getattr(job, "hired_student_user_id", None) is not None
                else "closed_no_hire"
            )
            if (getattr(job, "status", "open") or "open").lower() == "closed"
            else None,
            "applicant_count": len(applicants_by_job.get(job.id, [])),
            "applicants": applicants_by_job.get(job.id, []),
        }
        for job in jobs
    ]

    return {"jobs": job_items, "total_jobs": len(job_items)}


@router.get("/student/{student_user_id}/cv")
def download_student_cv(
    student_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "admin"])),
):
    student = db.query(Student).filter(Student.user_id == student_user_id).first()
    if not student or not student.cv_file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student CV has not been uploaded.",
        )

    if current_user.role == "employer":
        employer = (
            db.query(Employer).filter(Employer.user_id == current_user.id).first()
        )
        if not employer:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Employer profile not found.",
            )

        has_applied = (
            db.query(JobApplication)
            .join(JobPosting, JobApplication.job_id == JobPosting.id)
            .filter(
                JobApplication.student_id == student.id,
                JobPosting.employer_id == employer.id,
            )
            .first()
        )
        has_match = (
            db.query(SavedMatch)
            .filter(
                SavedMatch.student_id == student_user_id,
                SavedMatch.employer_id == current_user.id,
            )
            .first()
        )
        if not has_applied and not has_match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view CVs of candidates who applied or matched with your roles.",
            )

    abs_upload_root = os.path.abspath("uploads/cvs")
    abs_file_path = os.path.abspath(student.cv_file_path)
    if not abs_file_path.startswith(abs_upload_root) or not os.path.isfile(
        abs_file_path
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV file could not be found on the server.",
        )

    download_name = student.cv_filename or os.path.basename(abs_file_path)
    return FileResponse(
        path=abs_file_path,
        media_type="application/pdf",
        filename=download_name,
        content_disposition_type="inline",
    )


@router.patch("/{application_id}/status")
def update_application_status(
    application_id: int,
    payload: ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer"])),
):
    new_status = (payload.status or "").strip().lower()
    if new_status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Choose from: {', '.join(sorted(VALID_STATUSES))}.",
        )

    employer = db.query(Employer).filter(Employer.user_id == current_user.id).first()
    if not employer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Employer profile not found."
        )

    row = (
        db.query(JobApplication, JobPosting)
        .join(JobPosting, JobApplication.job_id == JobPosting.id)
        .filter(
            JobApplication.id == application_id, JobPosting.employer_id == employer.id
        )
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found."
        )

    app_row, job_row = row
    if (getattr(job_row, "status", "open") or "open").lower() == "closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job posting is closed and its statuses cannot be modified.",
        )

    app_row.status = new_status
    db.commit()
    db.refresh(app_row)

    return {"status": "success", "id": app_row.id, "application_status": app_row.status}


@router.post("/{application_id}/withdraw")
def withdraw_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student"])),
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found.",
        )

    row = (
        db.query(JobApplication, JobPosting)
        .join(JobPosting, JobApplication.job_id == JobPosting.id)
        .filter(
            JobApplication.id == application_id,
            JobApplication.student_id == student.id,
        )
        .first()
    )
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found.",
        )

    app_row, job_row = row
    if (getattr(job_row, "status", "open") or "open").lower() == "closed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This job posting is closed.",
        )

    if (app_row.status or "").lower() in {"hired", "accepted"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hired applications cannot be withdrawn.",
        )

    app_row.status = "withdrawn"
    db.commit()
    db.refresh(app_row)

    return {
        "status": "success",
        "id": app_row.id,
        "application_status": app_row.status,
        "message": "Application withdrawn.",
    }
