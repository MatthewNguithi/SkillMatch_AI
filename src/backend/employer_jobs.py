from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from applications import JobApplication
from database import get_db
from dependencies import require_roles
from model import Employer, JobPosting, SavedMatch, Student, User

router = APIRouter()


class CloseJobRequest(BaseModel):
    selected_student_user_id: Optional[int] = None
    close_reason: Optional[str] = "Position filled"


def _get_employer_profile(db: Session, user_id: int) -> Employer:
    employer = db.query(Employer).filter(Employer.user_id == user_id).first()
    if not employer:
        raise HTTPException(
            status_code=404,
            detail="Employer profile not found. Please complete your company profile first.",
        )
    return employer


def _can_confirm_candidate_hire(
    job_status: str,
    has_existing_hire: bool,
    is_hired: bool,
    itv_invite: bool,
    rsvp_status: Optional[str],
    app_status: Optional[str] = None,
) -> bool:
    if (job_status or "open").lower() == "closed":
        return False
    if has_existing_hire or is_hired:
        return False
    norm_app = (app_status or "").lower()
    norm_rsvp = (rsvp_status or "pending").lower()
    has_fresh_reapplication = (
        norm_app in {"submitted", "reviewed", "shortlisted"} and norm_rsvp == "declined"
    )
    if (
        itv_invite
        and not has_fresh_reapplication
        and norm_rsvp not in {"accepted", "hired"}
    ):
        return False
    return True


def _resolve_hire_outcome(
    student_user_id: int,
    hired_user_id: Optional[int],
    app_status: Optional[str],
    rsvp_status: Optional[str],
) -> tuple[bool, str]:
    """
    Returns (is_hired, hire_status) independent of whether the job is open or closed.
    """
    norm_app = (app_status or "").lower()
    norm_rsvp = (rsvp_status or "").lower()

    is_hired = (
        norm_app == "hired"
        or norm_rsvp == "hired"
        or (hired_user_id is not None and student_user_id == hired_user_id)
    )
    return (True, "hired") if is_hired else (False, "not_hired")


def _find_confirmed_hired_user_id(
    db: Session, job: JobPosting, employer_user_id: int
) -> Optional[int]:
    hired_user_id = getattr(job, "hired_student_user_id", None)
    if hired_user_id is not None:
        return hired_user_id

    hired_app = (
        db.query(JobApplication, Student)
        .join(Student, JobApplication.student_id == Student.id)
        .filter(
            JobApplication.job_id == job.id,
            JobApplication.status == "hired",
        )
        .first()
    )
    if hired_app:
        return hired_app[1].user_id

    hired_match = (
        db.query(SavedMatch)
        .filter(
            SavedMatch.employer_id == employer_user_id,
            (SavedMatch.job_id == job.id) | (SavedMatch.job_title.ilike(job.title)),
            SavedMatch.rsvp_status == "hired",
        )
        .first()
    )
    if hired_match:
        return hired_match.student_id

    return None


def _serialize_job_summary(db: Session, job: JobPosting, employer_user_id: int) -> dict:
    hired_user_id = _find_confirmed_hired_user_id(db, job, employer_user_id)
    job_status = (job.status or "open").lower()

    applications = (
        db.query(JobApplication, Student, User)
        .join(Student, JobApplication.student_id == Student.id)
        .join(User, Student.user_id == User.id)
        .filter(JobApplication.job_id == job.id)
        .order_by(JobApplication.id.desc())
        .all()
    )

    saved_matches = (
        db.query(SavedMatch, Student, User)
        .join(Student, SavedMatch.student_id == Student.user_id)
        .join(User, Student.user_id == User.id)
        .filter(
            SavedMatch.employer_id == employer_user_id,
            (SavedMatch.job_id == job.id) | (SavedMatch.job_title.ilike(job.title)),
        )
        .order_by(SavedMatch.created_at.desc())
        .all()
    )

    candidates_map = {}

    for app_row, student, user_row in applications:
        app_status = (app_row.status or "submitted").lower()
        is_hired, hire_status = _resolve_hire_outcome(
            student_user_id=student.user_id,
            hired_user_id=hired_user_id,
            app_status=app_status,
            rsvp_status=None,
        )
        candidates_map[student.user_id] = {
            "student_user_id": student.user_id,
            "student_id": student.id,
            "full_name": student.full_name
            or f"{user_row.first_name or ''} {user_row.last_name or ''}".strip()
            or "Candidate",
            "course": student.course,
            "institution": student.institution,
            "match_score": app_row.match_score,
            "application_id": app_row.id,
            "application_status": "hired" if is_hired else app_status,
            "rsvp_status": None,
            "itv_invite": False,
            "is_hired": is_hired,
            "hire_status": hire_status,
            "job_status": job_status,
            "source": "application",
        }

    for saved, student, user_row in saved_matches:
        rsvp = (saved.rsvp_status or "pending").lower()
        existing = candidates_map.get(student.user_id)
        if existing:
            existing["saved_match_id"] = saved.id
            existing["rsvp_status"] = rsvp
            existing["itv_invite"] = bool(saved.itv_invite)
            if existing["match_score"] is None:
                existing["match_score"] = saved.match_score
            is_hired, hire_status = _resolve_hire_outcome(
                student_user_id=student.user_id,
                hired_user_id=hired_user_id,
                app_status=existing.get("application_status"),
                rsvp_status=rsvp,
            )
            existing["is_hired"] = is_hired
            existing["hire_status"] = hire_status
            if is_hired:
                existing["application_status"] = "hired"
            elif hired_user_id is not None and existing.get("application_status") in (
                "hired",
                "accepted",
            ):
                existing["application_status"] = "rejected"
        else:
            is_hired, hire_status = _resolve_hire_outcome(
                student_user_id=student.user_id,
                hired_user_id=hired_user_id,
                app_status=None,
                rsvp_status=rsvp,
            )
            candidates_map[student.user_id] = {
                "student_user_id": student.user_id,
                "student_id": student.id,
                "full_name": student.full_name
                or f"{user_row.first_name or ''} {user_row.last_name or ''}".strip()
                or "Candidate",
                "course": student.course,
                "institution": student.institution,
                "match_score": saved.match_score,
                "saved_match_id": saved.id,
                "application_status": "hired" if is_hired else None,
                "rsvp_status": rsvp,
                "itv_invite": bool(saved.itv_invite),
                "is_hired": is_hired,
                "hire_status": hire_status,
                "job_status": job_status,
                "source": "invite" if saved.itv_invite else "saved",
            }

    candidates = list(candidates_map.values())
    has_existing_hire = hired_user_id is not None or any(
        c.get("is_hired") for c in candidates
    )

    for cand in candidates:
        cand["can_confirm_hire"] = _can_confirm_candidate_hire(
            job_status=job_status,
            has_existing_hire=has_existing_hire,
            is_hired=bool(cand.get("is_hired")),
            itv_invite=bool(cand.get("itv_invite")),
            rsvp_status=cand.get("rsvp_status"),
            app_status=cand.get("application_status"),
        )

    accepted_count = sum(1 for c in candidates if c.get("is_hired"))
    invited_count = sum(1 for c in candidates if c.get("itv_invite"))

    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "required_skills": job.required_skills,
        "location": job.location,
        "opportunity_type": job.opportunity_type,
        "status": job_status,
        "hired_student_user_id": hired_user_id,
        "created_at": job.created_at.isoformat()
        if getattr(job, "created_at", None)
        else None,
        "applicant_count": len(applications),
        "invited_count": invited_count,
        "accepted_count": accepted_count,
        "candidates": candidates,
    }


@router.get("/employer/jobs")
def list_employer_posted_jobs(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "admin"])),
):
    employer = _get_employer_profile(db, current_user.id)

    query = db.query(JobPosting).filter(JobPosting.employer_id == employer.id)
    if status and status.lower() in ("open", "closed"):
        if status.lower() == "open":
            query = query.filter(
                (JobPosting.status == None) | (JobPosting.status != "closed")
            )
        else:
            query = query.filter(JobPosting.status == "closed")

    jobs = query.order_by(JobPosting.id.desc()).all()
    return {
        "company_name": employer.company_name,
        "jobs": [_serialize_job_summary(db, job, current_user.id) for job in jobs],
    }


@router.post("/employer/jobs/{job_id}/hire/{student_user_id}")
def confirm_hire_student(
    job_id: int,
    student_user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "admin"])),
):
    employer = _get_employer_profile(db, current_user.id)
    job = (
        db.query(JobPosting)
        .filter(JobPosting.id == job_id, JobPosting.employer_id == employer.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found.")

    if (job.status or "").lower() == "closed":
        raise HTTPException(
            status_code=400,
            detail="This job posting is already closed.",
        )

    student = db.query(Student).filter(Student.user_id == student_user_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    matched_rows = (
        db.query(SavedMatch)
        .filter(
            SavedMatch.employer_id == current_user.id,
            SavedMatch.student_id == student_user_id,
            (SavedMatch.job_id == job.id) | (SavedMatch.job_title.ilike(job.title)),
        )
        .all()
    )
    latest_app = (
        db.query(JobApplication)
        .filter(
            JobApplication.job_id == job.id, JobApplication.student_id == student.id
        )
        .order_by(JobApplication.id.desc())
        .first()
    )
    has_reapplied_after_decline = bool(
        latest_app
        and (latest_app.status or "").lower()
        in {"submitted", "reviewed", "shortlisted"}
    )
    invite_rows = [sm for sm in matched_rows if bool(sm.itv_invite)]
    if (
        invite_rows
        and not has_reapplied_after_decline
        and not any(
            (sm.rsvp_status or "pending").lower() in {"accepted", "hired"}
            for sm in invite_rows
        )
    ):
        raise HTTPException(
            status_code=400,
            detail="This student was invited to an interview and must accept before being confirmed as hired.",
        )

    if hasattr(job, "hired_student_user_id"):
        job.hired_student_user_id = student_user_id

    job_apps = db.query(JobApplication).filter(JobApplication.job_id == job.id).all()
    for app_row in job_apps:
        if app_row.student_id == student.id:
            app_row.status = "hired"
        elif (app_row.status or "").lower() == "hired":
            app_row.status = "submitted"

    all_job_matches = (
        db.query(SavedMatch)
        .filter(
            SavedMatch.employer_id == current_user.id,
            (SavedMatch.job_id == job.id) | (SavedMatch.job_title.ilike(job.title)),
        )
        .all()
    )
    for saved in all_job_matches:
        if saved.student_id == student_user_id:
            saved.job_id = job.id
            saved.rsvp_status = "hired"
            if hasattr(saved, "rsvp_updated_at"):
                saved.rsvp_updated_at = datetime.now(timezone.utc)
        elif (saved.rsvp_status or "").lower() == "hired":
            saved.rsvp_status = "not_hired"

    db.commit()

    student_name = student.full_name or f"Student #{student_user_id}"
    return {
        "status": "success",
        "job_id": job.id,
        "job_status": (job.status or "open").lower(),
        "hired_student_user_id": student_user_id,
        "hire_status": "hired",
        "message": f"{student_name} is confirmed as Hired for '{job.title}'. You can now close the job.",
    }


@router.patch("/employer/jobs/{job_id}/close")
def close_employer_job(
    job_id: int,
    payload: Optional[CloseJobRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "admin"])),
):
    employer = _get_employer_profile(db, current_user.id)
    job = (
        db.query(JobPosting)
        .filter(JobPosting.id == job_id, JobPosting.employer_id == employer.id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found.")

    job.status = "closed"
    if hasattr(job, "closed_at"):
        job.closed_at = datetime.now(timezone.utc)

    hired_user_id = _find_confirmed_hired_user_id(db, job, current_user.id)
    if (
        hired_user_id is None
        and payload
        and payload.selected_student_user_id is not None
    ):
        hired_user_id = payload.selected_student_user_id

    if hired_user_id is not None and hasattr(job, "hired_student_user_id"):
        job.hired_student_user_id = hired_user_id

    hired_student = None
    if hired_user_id is not None:
        hired_student = (
            db.query(Student).filter(Student.user_id == hired_user_id).first()
        )
        if not hired_student:
            raise HTTPException(
                status_code=404, detail="Hired student profile not found."
            )

    job_apps = db.query(JobApplication).filter(JobApplication.job_id == job.id).all()
    for app_row in job_apps:
        current_app_status = (app_row.status or "").lower()
        is_this_hired = current_app_status == "hired" or (
            hired_student is not None and app_row.student_id == hired_student.id
        )
        if is_this_hired:
            app_row.status = "hired"
        elif current_app_status not in ("withdrawn", "declined"):
            app_row.status = "rejected"

    all_job_matches = (
        db.query(SavedMatch)
        .filter(
            SavedMatch.employer_id == current_user.id,
            (SavedMatch.job_id == job.id) | (SavedMatch.job_title.ilike(job.title)),
        )
        .all()
    )
    for saved in all_job_matches:
        if hired_user_id is not None and saved.student_id == hired_user_id:
            saved.job_id = job.id
            saved.rsvp_status = "hired"
        elif (saved.rsvp_status or "").lower() not in ("declined", "hired"):
            saved.rsvp_status = "not_hired"

    db.commit()

    return {
        "status": "success",
        "job_id": job.id,
        "job_status": "closed",
        "hired_student_user_id": hired_user_id,
        "message": (
            f"Job '{job.title}' is now closed; {hired_student.full_name or 'the selected student'} remains Hired."
            if hired_student is not None
            else f"Job '{job.title}' is now closed (Not Hired)."
        ),
    }
