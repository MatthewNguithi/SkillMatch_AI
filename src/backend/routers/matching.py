import os
import re
import json
import hashlib
from datetime import datetime, timedelta, timezone
from collections import Counter
from typing import Optional, List

import numpy as np
import redis
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Response
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session

from applications import JobApplication
from clutter_cleanup import (
    DECLINE_RETENTION_HOURS,
    is_expired_decline,
    is_expired_student_item,
)
from database import get_db
from dependencies import get_current_user, require_roles
from model import Student, JobPosting, User, SavedMatch, Employer
from utils.cv_parser import parse_cv_document

router = APIRouter()

sbert_model = SentenceTransformer("all-MiniLM-L6-v2")

TERMINAL_REAPPLY_STATUSES = {"declined", "withdrawn"}

try:
    redis_client = redis.Redis(
        host="localhost",
        port=6379,
        db=0,
        decode_responses=True,
        socket_connect_timeout=2,
    )
    redis_client.ping()
    REDIS_AVAILABLE = True
except Exception:
    REDIS_AVAILABLE = False
    redis_client = None


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
    student_id: int
    match_score: float
    job_title: str
    job_id: Optional[int] = None
    interview_date: Optional[str] = None
    interview_time: Optional[str] = None
    location_or_link: Optional[str] = None
    notes: Optional[str] = None


class RSVPRequest(BaseModel):
    saved_match_id: int
    status: str  # "accepted" or "declined"


def _find_job_application(
    db: Session,
    student_profile_id: Optional[int],
    job_id: Optional[int],
) -> Optional[JobApplication]:
    if not student_profile_id or not job_id:
        return None
    return (
        db.query(JobApplication)
        .filter(
            JobApplication.student_id == student_profile_id,
            JobApplication.job_id == job_id,
        )
        .order_by(JobApplication.id.desc())
        .first()
    )


def _find_scoped_saved_match(
    db: Session,
    student_user_id: int,
    employer_user_id: Optional[int] = None,
    job_id: Optional[int] = None,
    job_title: Optional[str] = None,
    saved_by_role: Optional[str] = None,
) -> Optional[SavedMatch]:
    query = db.query(SavedMatch).filter(SavedMatch.student_id == student_user_id)
    if employer_user_id is not None:
        query = query.filter(SavedMatch.employer_id == employer_user_id)
    if saved_by_role is not None:
        query = query.filter(SavedMatch.saved_by_role == saved_by_role)

    if job_id is not None:
        query = query.filter(SavedMatch.job_id == job_id)
    elif job_title and job_title.strip():
        query = query.filter(SavedMatch.job_title.ilike(job_title.strip()))

    return query.order_by(SavedMatch.id.desc()).first()


def _resolve_job_status(
    saved: Optional[SavedMatch],
    app_row: Optional[JobApplication],
    job: Optional[JobPosting] = None,
    student_user_id: Optional[int] = None,
) -> tuple[str, bool, bool]:
    """
    Returns (status_key, can_reapply, already_active).
    'hired' is only reached when hired/selected on job close, not from RSVP alone.
    """
    rsvp = (saved.rsvp_status or "pending").lower() if saved else "pending"
    app_status = (app_row.status or "").lower() if app_row else ""
    job_status = (job.status or "open").lower() if job else "open"
    hired_user_id = getattr(job, "hired_student_user_id", None) if job else None

    if app_status == "withdrawn":
        return "withdrawn", job_status != "closed", False

    if app_status in {"hired", "accepted"} or rsvp == "hired" or (
        hired_user_id is not None and student_user_id == hired_user_id
    ):
        return "hired", False, True

    if job_status == "closed":
        if app_status == "rejected" or (
            hired_user_id is not None
            and (app_row or (saved and saved.saved_by_role == "student"))
        ):
            return "rejected", False, False
        return "closed", False, False

    if rsvp == "declined" or app_status == "declined":
        return "declined", True, False
    if rsvp == "accepted":
        return "interview_accepted", False, True
    if saved and getattr(saved, "itv_invite", False):
        return "invited", False, True
    if app_row or (saved and saved.saved_by_role == "student"):
        return "applied", False, True
    if saved:
        return "saved", False, False
    return "available", True, False


def _serialize_student_profile(
    student: Student,
    match_score: Optional[float] = None,
    user_row: Optional[User] = None,
    extra: Optional[dict] = None,
) -> dict:
    has_cv = bool(student.cv_file_path and os.path.isfile(student.cv_file_path))
    payload = {
        "id": student.user_id,
        "student_id": student.id,
        "full_name": student.full_name
        or (
            f"{user_row.first_name or ''} {user_row.last_name or ''}".strip()
            if user_row
            else "Candidate"
        ),
        "email": user_row.email if user_row else None,
        "phone": student.phone,
        "institution": student.institution,
        "course": student.course,
        "year_of_study": student.year_of_study,
        "county": student.county,
        "opportunity_type": student.opportunity_type,
        "career_goal": student.career_goal,
        "skills": student.skills_text,
        "bio": student.bio,
        "match_score": match_score,
        "has_cv": has_cv,
        "cv_filename": student.cv_filename if has_cv else None,
        "cv_url": f"/api/v1/applications/student/{student.user_id}/cv"
        if has_cv
        else None,
    }
    if extra:
        payload.update(extra)
    return payload


def _compute_student_lifecycle_status(
    saved: SavedMatch,
    app_row: Optional[JobApplication],
    job: Optional[JobPosting] = None,
    student_user_id: Optional[int] = None,
) -> str:
    status_key, _, _ = _resolve_job_status(
        saved, app_row, job=job, student_user_id=student_user_id
    )
    if status_key == "applied":
        return "reviewed"
    if status_key in ("saved", "available"):
        return "reviewed" if app_row else "pending"
    return status_key


def _normalize_opportunity_type(experience_level: Optional[str]) -> str:
    val = (experience_level or "").strip().lower()
    if "intern" in val:
        return "Internship"
    if "part" in val:
        return "Part-time"
    return "Full-time"


def _get_or_create_employer_profile(
    db: Session,
    user: User,
    company_name: Optional[str] = None,
    company_description: Optional[str] = None,
    county: Optional[str] = None,
) -> Employer:
    employer = db.query(Employer).filter(Employer.user_id == user.id).first()
    clean_company = (company_name or "").strip() or "Partner Organization"
    clean_desc = (
        company_description or ""
    ).strip() or f"{clean_company} hiring on SkillMatch."

    if employer:
        if company_name and not employer.company_name:
            employer.company_name = company_name.strip()
        if not employer.company_description:
            employer.company_description = clean_desc
        if (
            county
            and hasattr(employer, "county")
            and not getattr(employer, "county", None)
        ):
            employer.county = county.strip()
        return employer

    employer_kwargs = {
        "user_id": user.id,
        "company_name": clean_company,
        "company_description": clean_desc,
    }
    if hasattr(Employer, "county") and county:
        employer_kwargs["county"] = county.strip()

    employer = Employer(**employer_kwargs)
    db.add(employer)
    db.flush()
    return employer


def _resolve_open_job_by_id(
    db: Session,
    job_id: Optional[int],
) -> Optional[JobPosting]:
    if not job_id:
        return None
    return (
        db.query(JobPosting)
        .filter(JobPosting.id == job_id, JobPosting.status == "open")
        .first()
    )


def create_ics_file_content(
    summary: str, dt_start: datetime, location: str, description: str
) -> str:
    """Generates standard iCalendar (.ics) RFC 5545 string."""
    dt_end = dt_start + timedelta(hours=1)

    fmt = "%Y%m%dT%H%M%SZ"
    start_str = dt_start.strftime(fmt)
    end_str = dt_end.strftime(fmt)
    stamp_str = datetime.now(timezone.utc).strftime(fmt)

    ics_content = (
        "BEGIN:VCALENDAR\r\n"
        "VERSION:2.0\r\n"
        "PRODID:-//SkillMatch//Interview Scheduler//EN\r\n"
        "CALSCALE:GREGORIAN\r\n"
        "METHOD:REQUEST\r\n"
        "BEGIN:VEVENT\r\n"
        f"UID:interview-{dt_start.timestamp()}@skillmatch.platform\r\n"
        f"DTSTAMP:{stamp_str}\r\n"
        f"DTSTART:{start_str}\r\n"
        f"DTEND:{end_str}\r\n"
        f"SUMMARY:{summary}\r\n"
        f"LOCATION:{location}\r\n"
        f"DESCRIPTION:{description}\r\n"
        "STATUS:CONFIRMED\r\n"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    )
    return ics_content


def extract_skill_tokens(text: str):
    if not text:
        return []

    raw_tokens = re.split(r"[,|/;\n]+", text.lower())
    return [t.strip() for t in raw_tokens if len(t.strip()) > 1]


def get_cached_embedding(text: str) -> List[float]:
    """Helper function to fetch or cache SBERT vector embeddings in Redis."""
    if not text or not text.strip():
        return []

    clean_text = text.strip()
    text_hash = hashlib.md5(clean_text.encode("utf-8")).hexdigest()
    cache_key = f"sbert:emb:{text_hash}"

    if REDIS_AVAILABLE and redis_client:
        try:
            cached_val = redis_client.get(cache_key)
            if cached_val:
                return json.loads(cached_val)
        except Exception:
            pass

    embedding_vector = sbert_model.encode(clean_text).tolist()

    if REDIS_AVAILABLE and redis_client:
        try:
            redis_client.set(cache_key, json.dumps(embedding_vector), ex=604800)
        except Exception:
            pass

    return embedding_vector


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

    profile_text = f"{student.career_goal or ''}. Skills: {student.skills_text or ''}. Bio: {student.bio or ''}".strip()

    if not student.embedding and profile_text:
        student.embedding = get_cached_embedding(profile_text)
        db.commit()

    open_jobs = (
        db.query(JobPosting)
        .filter(JobPosting.status.ilike("open"))
        .all()
    )

    if not open_jobs:
        return {"matches": []}

    student_opp = (student.opportunity_type or "").strip().lower()
    if student_opp:
        filtered_jobs = [
            j for j in open_jobs
            if (j.opportunity_type or "").strip().lower() == student_opp
        ]
        jobs = filtered_jobs if filtered_jobs else open_jobs
    else:
        jobs = open_jobs

    student_vec = (
        np.array(student.embedding, dtype=float).reshape(1, -1)
        if student.embedding
        else None
    )

    job_results = []
    for job in jobs:
        job_text = f"{job.title}. {job.description}. Required Skills: {job.required_skills or ''}".strip()

        if not job.embedding and job_text:
            job.embedding = get_cached_embedding(job_text)
            db.commit()

        match_percentage = 0.0
        if student_vec is not None and job.embedding:
            try:
                job_vec = np.array(job.embedding, dtype=float).reshape(1, -1)
                if student_vec.shape[1] == job_vec.shape[1]:
                    similarity_score = cosine_similarity(student_vec, job_vec)[0][0]
                    match_percentage = round(float(similarity_score) * 100, 1)
            except Exception:
                match_percentage = 0.0

        scoped_saved = _find_scoped_saved_match(
            db,
            student_user_id=current_user.id,
            job_id=job.id,
            job_title=job.title,
        )
        app_row = _find_job_application(db, student.id, job.id)
        status_key, can_reapply, already_active = _resolve_job_status(
            scoped_saved, app_row, job=job, student_user_id=current_user.id
        )

        job_results.append(
            {
                "id": job.id,
                "job_id": job.id,
                "saved_match_id": scoped_saved.id if scoped_saved else None,
                "title": job.title,
                "location": job.location,
                "opportunity_type": job.opportunity_type,
                "source_type": job.source_type,
                "source_url": job.source_url,
                "job_status": (job.status or "open").lower(),
                "match_score": match_percentage,
                "employer_id": job.employer_id,
                "status_key": status_key,
                "can_reapply": can_reapply,
                "already_applied": already_active,
            }
        )

    job_results.sort(key=lambda x: x["match_score"], reverse=True)
    return {"matches": job_results[:limit]}

@router.post("/employer/match")
def match_candidates_for_employer(
    request: EmployerMatchRequest,
    limit: int = 10,
    save_posting: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "admin"])),
):
    job_text = f"{request.job_title}. {request.description}. Required Skills: {request.required_skills}"
    job_embedding = get_cached_embedding(job_text)
    job_vector = np.array(job_embedding).reshape(1, -1)

    saved_job = None
    if save_posting:
        employer = _get_or_create_employer_profile(
            db,
            current_user,
            company_name=request.company,
            company_description=request.description,
            county=request.county,
        )
        normalized_opp_type = _normalize_opportunity_type(request.experience_level)

        saved_job = JobPosting(
            employer_id=employer.id,
            title=request.job_title.strip(),
            description=request.description,
            required_skills=request.required_skills,
            location=request.county,
            opportunity_type=normalized_opp_type,
            source_type="internal",
            status="open",
            embedding=job_embedding,
        )
        db.add(saved_job)
        db.commit()
        db.refresh(saved_job)

    students = db.query(Student).filter(Student.skills_text != None).all()
    if not students:
        return {
            "results": [],
            "job_id": saved_job.id if saved_job else None,
            "job_title": saved_job.title if saved_job else request.job_title,
        }

    MIN_MATCH_SCORE = 45.0
    candidate_results = []

    for student in students:
        profile_text = f"{student.career_goal or ''}. Skills: {student.skills_text or ''}. Bio: {student.bio or ''}"
        if not student.embedding:
            student.embedding = get_cached_embedding(profile_text)
            db.commit()

        if student.embedding:
            student_vector = np.array(student.embedding).reshape(1, -1)
            similarity_score = cosine_similarity(job_vector, student_vector)[0][0]
            match_percentage = round(float(similarity_score) * 100, 1)

            if match_percentage >= MIN_MATCH_SCORE:
                candidate_results.append(
                    _serialize_student_profile(
                        student,
                        match_percentage,
                        extra={
                            "job_id": saved_job.id if saved_job else None,
                            "job_title": saved_job.title
                            if saved_job
                            else request.job_title.strip(),
                            "job_status": (saved_job.status or "open").lower()
                            if saved_job
                            else "open",
                        },
                    )
                )

    candidate_results.sort(key=lambda x: x["match_score"], reverse=True)
    return {
        "results": candidate_results[:limit],
        "job_id": saved_job.id if saved_job else None,
        "job_title": saved_job.title if saved_job else request.job_title,
    }


@router.get("/matching/employer/candidate/{student_user_id}")
def get_candidate_full_profile(
    student_user_id: int,
    job_id: Optional[int] = None,
    job_title: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "admin"])),
):
    row = (
        db.query(Student, User)
        .join(User, Student.user_id == User.id)
        .filter(Student.user_id == student_user_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Student profile not found.")

    student, user_row = row

    saved = _find_scoped_saved_match(
        db,
        student_user_id=student_user_id,
        employer_user_id=current_user.id,
        job_id=job_id,
        job_title=job_title,
    )

    target_job_id = job_id or (saved.job_id if saved else None)
    job_row = (
        db.query(JobPosting).filter(JobPosting.id == target_job_id).first()
        if target_job_id
        else None
    )
    existing_app = _find_job_application(db, student.id, target_job_id)

    status_key, can_reapply, already_active = _resolve_job_status(
        saved, existing_app, job=job_row, student_user_id=student_user_id
    )
    rsvp = (saved.rsvp_status or "pending").lower() if saved else "pending"
    candidate_status = None if status_key == "available" else status_key

    return _serialize_student_profile(
        student,
        saved.match_score
        if saved
        else (existing_app.match_score if existing_app else None),
        user_row=user_row,
        extra={
            "saved_match_id": saved.id if saved else None,
            "job_id": target_job_id,
            "job_title": job_title
            or (job_row.title if job_row else (saved.job_title if saved else None)),
            "job_status": (job_row.status or "open").lower() if job_row else None,
            "itv_invite": bool(saved.itv_invite) if saved else False,
            "already_applied": already_active,
            "can_reapply": can_reapply,
            "rsvp_status": rsvp,
            "candidate_status": candidate_status,
            "application_note": existing_app.note if existing_app else None,
        },
    )


@router.post("/matching/save")
def save_match(
    request: SaveMatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "student"])),
):
    if current_user.role == "employer":
        if request.job_id:
            job = db.query(JobPosting).filter(JobPosting.id == request.job_id).first()
            if job and (job.status or "open").lower() == "closed":
                raise HTTPException(
                    status_code=400,
                    detail="This job posting is closed. Create a new job posting instead.",
                )

        existing = _find_scoped_saved_match(
            db,
            student_user_id=request.student_id,
            employer_user_id=current_user.id,
            job_id=request.job_id,
            job_title=request.job_title,
            saved_by_role="employer",
        )
        if existing:
            return {
                "status": "exists",
                "message": "Candidate already saved for this role.",
            }

        new_save = SavedMatch(
            employer_id=current_user.id,
            student_id=request.student_id,
            job_id=request.job_id,
            match_score=request.match_score,
            saved_by_role="employer",
            job_title=request.job_title,
        )
        db.add(new_save)
        db.commit()
        return {"status": "success", "message": "Candidate saved successfully."}

    elif current_user.role == "student":
        student_profile = (
            db.query(Student).filter(Student.user_id == current_user.id).first()
        )
        if not student_profile or not student_profile.skills_text:
            raise HTTPException(
                status_code=400,
                detail="Please complete and save your student profile & CV before creating a match.",
            )

        job = (
            db.query(JobPosting).filter(JobPosting.id == request.job_id).first()
            if request.job_id
            else None
        )
        if job and (job.status or "open").lower() == "closed":
            raise HTTPException(
                status_code=400,
                detail="This job posting is closed.",
            )

        employer_user_id = None
        resolved_title = request.job_title
        if job:
            resolved_title = resolved_title or job.title
            emp = db.query(Employer).filter(Employer.id == job.employer_id).first()
            employer_user_id = emp.user_id if emp else None

        existing_match = _find_scoped_saved_match(
            db,
            student_user_id=current_user.id,
            job_id=request.job_id,
            job_title=resolved_title,
        )
        existing_app = _find_job_application(
            db, student_profile.id, job.id if job else request.job_id
        )
        status_key, can_reapply, already_active = _resolve_job_status(
            existing_match, existing_app, job=job, student_user_id=current_user.id
        )

        if (
            existing_match
            and getattr(existing_match, "itv_invite", False)
            and (existing_match.rsvp_status or "pending").lower() == "pending"
        ):
            raise HTTPException(
                status_code=409,
                detail="You already have a pending interview invitation for this role. Please accept or decline it directly.",
            )

        if already_active and not can_reapply:
            return {
                "status": "exists",
                "message": "Match already active for this role.",
            }

        if existing_match and status_key in TERMINAL_REAPPLY_STATUSES:
            existing_match.saved_by_role = "student"
            existing_match.match_score = request.match_score
            existing_match.itv_invite = False
            existing_match.rsvp_status = "pending"
            if hasattr(existing_match, "rsvp_updated_at"):
                existing_match.rsvp_updated_at = None
            db.commit()
            return {
                "status": "success",
                "message": "You can now reapply to this role. Match refreshed for the employer.",
            }

        new_save = SavedMatch(
            student_id=current_user.id,
            employer_id=employer_user_id,
            job_id=job.id if job else request.job_id,
            job_title=resolved_title,
            match_score=request.match_score,
            saved_by_role="student",
            rsvp_status="pending",
        )
        db.add(new_save)
        db.commit()
        return {
            "status": "success",
            "message": "Match saved and shared with the employer.",
        }


@router.get("/matching/saved")
def get_saved_candidates(
    include_declined: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["employer", "admin"])),
):
    saved_records = (
        db.query(SavedMatch, Student, JobPosting)
        .join(Student, SavedMatch.student_id == Student.user_id)
        .outerjoin(JobPosting, SavedMatch.job_id == JobPosting.id)
        .filter(SavedMatch.employer_id == current_user.id)
        .order_by(SavedMatch.id.desc())
        .all()
    )

    results = []
    seen = set()
    for saved, student, job in saved_records:
        key = (student.user_id, saved.job_id, (saved.job_title or "").strip().lower())
        if key in seen:
            continue
        seen.add(key)

        if not include_declined and is_expired_decline(saved):
            continue

        existing_app = _find_job_application(db, student.id, saved.job_id)
        status_key, can_reapply, already_active = _resolve_job_status(
            saved, existing_app, job=job, student_user_id=student.user_id
        )
        rsvp = (saved.rsvp_status or "pending").lower()
        job_status = (job.status or "open").lower() if job else None

        results.append(
            _serialize_student_profile(
                student,
                saved.match_score,
                extra={
                    "saved_match_id": saved.id,
                    "job_id": saved.job_id,
                    "job_title": saved.job_title or "General Application",
                    "job_status": job_status,
                    "initiated_by": saved.saved_by_role,
                    "itv_invite": bool(saved.itv_invite),
                    "already_applied": already_active,
                    "can_reapply": can_reapply,
                    "rsvp_status": rsvp,
                    "candidate_status": status_key,
                },
            )
        )
    return {"saved_candidates": results}


@router.get("/matching/student/saved")
def get_student_saved_jobs(
    include_cleared: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student", "admin"])),
):
    student_profile = (
        db.query(Student).filter(Student.user_id == current_user.id).first()
    )

    saved_records = (
        db.query(SavedMatch, JobPosting)
        .outerjoin(JobPosting, SavedMatch.job_id == JobPosting.id)
        .filter(SavedMatch.student_id == current_user.id)
        .order_by(SavedMatch.id.desc())
        .all()
    )

    apps_by_job = {}
    if student_profile:
        student_apps = (
            db.query(JobApplication)
            .filter(JobApplication.student_id == student_profile.id)
            .order_by(JobApplication.id.desc())
            .all()
        )
        for a in student_apps:
            if a.job_id not in apps_by_job:
                apps_by_job[a.job_id] = a

    results = []
    seen_jobs = set()
    for saved, job in saved_records:
        resolved_job_id = job.id if job else saved.job_id
        dedupe_key = (
            resolved_job_id,
            (saved.job_title or (job.title if job else "")).strip().lower(),
        )
        if dedupe_key in seen_jobs:
            continue
        seen_jobs.add(dedupe_key)

        app_row = apps_by_job.get(resolved_job_id) if resolved_job_id else None
        status_key, can_reapply, already_active = _resolve_job_status(
            saved, app_row, job=job, student_user_id=current_user.id
        )
        lifecycle_status = _compute_student_lifecycle_status(
            saved, app_row, job=job, student_user_id=current_user.id
        )
        job_status = (job.status or "open").lower() if job else None

        if not include_cleared and is_expired_student_item(
            saved, app_row, lifecycle_status
        ):
            continue

        results.append(
            {
                "id": saved.id,
                "job_id": resolved_job_id,
                "title": saved.job_title
                or (job.title if job else "General Application"),
                "location": job.location if job else "Nairobi",
                "source_type": job.source_type if job else "internal",
                "source_url": job.source_url if job else "",
                "job_status": job_status,
                "employer_id": saved.employer_id,
                "itv_invite": getattr(saved, "itv_invite", False) or False,
                "rsvp_status": saved.rsvp_status or "pending",
                "lifecycle_status": lifecycle_status,
                "status_key": status_key,
                "can_reapply": can_reapply,
                "already_applied": already_active,
                "interview_date": saved.interview_date,
                "interview_time": saved.interview_time,
                "location_or_link": saved.location_or_link,
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
    student_profile = (
        db.query(Student).filter(Student.user_id == request.student_id).first()
    )
    resolved_job = _resolve_open_job_by_id(db=db, job_id=request.job_id)
    if request.job_id and not resolved_job:
        raise HTTPException(
            status_code=400,
            detail="This job posting is closed. Create a new job posting to invite candidates.",
        )

    target_job_id = resolved_job.id if resolved_job else None

    existing_app = _find_job_application(
        db, student_profile.id if student_profile else None, target_job_id
    )
    if (
        existing_app
        and (existing_app.status or "").lower() not in TERMINAL_REAPPLY_STATUSES
    ):
        raise HTTPException(
            status_code=409,
            detail="This candidate has an active application for this role. Manage their application status or message them directly.",
        )

    existing_student_match = _find_scoped_saved_match(
        db,
        student_user_id=request.student_id,
        employer_user_id=current_user.id,
        job_id=target_job_id,
        job_title=request.job_title,
        saved_by_role="student",
    )
    if (
        existing_student_match
        and (existing_student_match.rsvp_status or "pending").lower()
        not in TERMINAL_REAPPLY_STATUSES
    ):
        raise HTTPException(
            status_code=409,
            detail="This candidate has already expressed interest/applied for this role. Review their application instead of sending a duplicate invite.",
        )

    existing = _find_scoped_saved_match(
        db,
        student_user_id=request.student_id,
        employer_user_id=current_user.id,
        job_id=target_job_id,
        job_title=request.job_title,
    )

    if existing:
        if (existing.rsvp_status or "").lower() == "declined":
            raise HTTPException(
                status_code=409,
                detail="This candidate has already declined the interview invitation for this role.",
            )
        existing.job_id = target_job_id or existing.job_id
        existing.itv_invite = True
        existing.interview_date = request.interview_date
        existing.interview_time = request.interview_time
        existing.location_or_link = request.location_or_link
        existing.notes = request.notes
        existing.rsvp_status = "pending"
        db.commit()
        return {
            "status": "success",
            "message": "Interview invitation and schedule updated!",
        }

    new_invite = SavedMatch(
        employer_id=current_user.id,
        student_id=request.student_id,
        job_id=target_job_id,
        match_score=request.match_score,
        saved_by_role="employer",
        job_title=request.job_title,
        itv_invite=True,
        interview_date=request.interview_date,
        interview_time=request.interview_time,
        location_or_link=request.location_or_link,
        notes=request.notes,
        rsvp_status="pending",
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

    student_skills = extract_skill_tokens(student.skills_text or "")

    if student.career_goal and len(student.career_goal.strip()) >= 15:
        score += 20
    else:
        feedback_tips.append("Add a clear 1-2 sentence career goal or objective.")

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

    if student.bio and len(student.bio.strip()) >= 50:
        score += 20
    else:
        feedback_tips.append(
            "Expand your bio or project summary to at least 50 characters."
        )

    if student.institution and student.course:
        score += 10
    else:
        feedback_tips.append(
            "Ensure your institution and course of study are filled out."
        )

    query_filters = [JobPosting.status == "open"]
    if student.opportunity_type:
        query_filters.append(JobPosting.opportunity_type == student.opportunity_type)

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
    top_industry_skills = [
        skill for skill, count in industry_skills_counter.most_common(12)
    ]

    for industry_skill in top_industry_skills:
        if not any(
            student_s in industry_skill or industry_skill in student_s
            for student_s in student_skills_set
        ):
            missing_suggested_skills.append(industry_skill.title())
        if len(missing_suggested_skills) >= 5:
            break

    if student.embedding and domain_job_vectors:
        student_vec = np.array(student.embedding).reshape(1, -1)
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
        score += 10

    final_score = min(score, 100)

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

    query_filters = [JobPosting.status == "open"]
    if request.opportunity_type:
        query_filters.append(JobPosting.opportunity_type == request.opportunity_type)

    domain_jobs = db.query(JobPosting).filter(*query_filters).all()

    industry_skills_counter = Counter()
    domain_job_vectors = []

    for job in domain_jobs:
        if job.required_skills:
            tokens = extract_skill_tokens(job.required_skills)
            industry_skills_counter.update(tokens)

        job_text = f"{job.title}. {job.description}. Required Skills: {job.required_skills or ''}"
        if not job.embedding:
            job.embedding = get_cached_embedding(job_text)
            db.commit()

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

    preview_text = (
        f"{request.career_goal or ''} {request.skills_text or ''} {request.bio or ''}"
    )
    if preview_text.strip() and domain_job_vectors:
        preview_vector = np.array(get_cached_embedding(preview_text)).reshape(1, -1)
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
    q: str = Query(..., min_length=2, description="Natural language query"),
    target: str = Query(
        "jobs", description="Target collection: 'jobs' or 'candidates'"
    ),
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student", "employer", "admin"])),
):
    if not q.strip():
        return {"results": []}

    query_vector = np.array(get_cached_embedding(q.strip())).reshape(1, -1)
    results = []

    if target == "jobs":
        jobs = db.query(JobPosting).filter(JobPosting.status == "open").all()
        for job in jobs:
            job_text = f"{job.title}. {job.description}. Required Skills: {job.required_skills or ''}"
            if not job.embedding:
                job.embedding = get_cached_embedding(job_text)
                db.commit()

            job_vector = np.array(job.embedding).reshape(1, -1)
            sim = float(cosine_similarity(query_vector, job_vector)[0][0])
            match_percentage = round(sim * 100, 1)

            if match_percentage >= 35.0:
                results.append(
                    {
                        "id": job.id,
                        "job_id": job.id,
                        "title": job.title,
                        "location": job.location,
                        "source_type": job.source_type,
                        "source_url": job.source_url,
                        "match_score": match_percentage,
                        "employer_id": job.employer_id,
                    }
                )

    elif target == "candidates":
        students = db.query(Student).all()
        for student in students:
            profile_text = f"{student.career_goal or ''}. Skills: {student.skills_text or ''}. Bio: {student.bio or ''}"
            if not student.embedding and profile_text.strip():
                student.embedding = get_cached_embedding(profile_text)
                db.commit()

            if student.embedding:
                student_vector = np.array(student.embedding).reshape(1, -1)
                sim = float(cosine_similarity(query_vector, student_vector)[0][0])
                match_percentage = round(sim * 100, 1)

                if match_percentage >= 35.0:
                    results.append(
                        _serialize_student_profile(student, match_percentage)
                    )

    results.sort(key=lambda x: x["match_score"], reverse=True)
    return {"query": q, "target": target, "results": results[:limit]}


@router.post("/student/parse-cv")
async def autofill_profile_from_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(["student"])),
):
    if not file.filename.lower().endswith((".pdf", ".docx", ".doc")):
        raise HTTPException(
            status_code=400, detail="Only PDF and DOCX files are supported."
        )

    file_bytes = await file.read()
    parsed_data = parse_cv_document(file_bytes, file.filename)

    return {
        "status": "success",
        "filename": file.filename,
        "data": parsed_data,
    }


@router.post("/matching/student/rsvp")
def rsvp_interview(
    request: RSVPRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student"])),
):
    match_record = (
        db.query(SavedMatch)
        .filter(
            SavedMatch.id == request.saved_match_id,
            SavedMatch.student_id == current_user.id,
        )
        .first()
    )

    if not match_record:
        raise HTTPException(
            status_code=404, detail="Interview invitation record not found."
        )

    if request.status not in ["accepted", "declined"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid RSVP status. Choose 'accepted' or 'declined'.",
        )

    match_record.rsvp_status = request.status
    if hasattr(match_record, "rsvp_updated_at"):
        match_record.rsvp_updated_at = datetime.now(timezone.utc)

    student_profile = (
        db.query(Student).filter(Student.user_id == current_user.id).first()
    )
    if student_profile and match_record.job_id:
        app_row = _find_job_application(db, student_profile.id, match_record.job_id)
        if app_row and (app_row.status or "").lower() not in {
            "hired",
            "accepted",
            "withdrawn",
        }:
            if request.status == "declined":
                app_row.status = "declined"

    db.commit()

    return {
        "status": "success",
        "rsvp_status": match_record.rsvp_status,
        "lifecycle_status": (
            "interview_accepted" if request.status == "accepted" else "declined"
        ),
        "message": (
            "Interview invitation accepted."
            if request.status == "accepted"
            else "Interview invitation declined."
        ),
    }


@router.get("/matching/interview/{saved_match_id}/ics")
def download_interview_ics(
    saved_match_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["student", "employer", "admin"])),
):
    record = db.query(SavedMatch).filter(SavedMatch.id == saved_match_id).first()
    if not record or not record.itv_invite:
        raise HTTPException(
            status_code=404, detail="Scheduled interview record not found."
        )

    try:
        dt_str = f"{record.interview_date} {record.interview_time}"
        dt_start = datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
    except Exception:
        dt_start = datetime.now(timezone.utc) + timedelta(days=1)

    summary = f"Interview: {record.job_title or 'Position'} on SkillMatch"
    location = record.location_or_link or "Online Meeting"
    description = (
        f"Interview invitation for {record.job_title}. Notes: {record.notes or 'None'}"
    )

    ics_data = create_ics_file_content(summary, dt_start, location, description)

    return Response(
        content=ics_data,
        media_type="text/calendar",
        headers={
            "Content-Disposition": f"attachment; filename=interview_{saved_match_id}.ics"
        },
    )