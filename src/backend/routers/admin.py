from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from model import User
from dependencies import require_roles

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/pending-employers")
def get_pending_employers(
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["admin"]))
):
    """List all employers waiting for admin approval."""
    pending = db.query(User).filter(User.role == "employer", User.is_approved == False).all()
    return [{"id": u.id, "first_name": u.first_name, "last_name": u.last_name, "email": u.email, "phone_number": u.phone_number} for u in pending]

@router.post("/approve-employer/{user_id}")
def approve_employer(
    user_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(["admin"]))
):
    """Approve a pending employer account."""
    user = db.query(User).filter(User.id == user_id, User.role == "employer").first()
    if not user:
        raise HTTPException(status_code=404, detail="Employer not found.")
    
    user.is_approved = True
    db.commit()
    return {"message": f"Employer {user.email} has been approved."}