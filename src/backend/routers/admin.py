from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from model import User, Employer, Admin
from auth import verify_password, create_access_token
from dependencies import get_current_admin

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/login")
def admin_login(
    credentials: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    """Authenticate admin against the isolated Admin table."""
    admin = db.query(Admin).filter(Admin.email == credentials.username).first()
    
    if not admin or not verify_password(credentials.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials."
        )

    admin.last_login = datetime.utcnow()
    db.commit()

    access_token = create_access_token(data={"sub": str(admin.id), "role": "admin"})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": "admin",
        "admin_id": admin.id
    }

@router.get("/pending-employers")
def get_pending_employers(
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """Retrieve all employer accounts waiting for administrative approval."""
    pending_users = db.query(User).filter(
        User.role == "employer",
        User.is_approved == False
    ).all()

    results = []
    for user in pending_users:
        emp = db.query(Employer).filter(Employer.user_id == user.id).first()
        results.append({
            "user_id": user.id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone_number": user.phone_number,
            "company_name": emp.company_name if emp else "N/A",
            "company_website": emp.company_website if emp else "",
            "company_description": emp.company_description if emp else "N/A",
        })

    return {"pending_employers": results}

@router.post("/approve-employer/{user_id}")
def approve_employer(
    user_id: int,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """Grant platform access to a pending employer account."""
    user = db.query(User).filter(User.id == user_id, User.role == "employer").first()
    if not user:
        raise HTTPException(status_code=404, detail="Employer account not found.")

    user.is_approved = True
    db.commit()
    return {"message": f"Employer {user.email} has been approved successfully."}

@router.post("/reject-employer/{user_id}")
def reject_employer(
    user_id: int,
    db: Session = Depends(get_db),
    admin: Admin = Depends(get_current_admin)
):
    """Reject and remove an unapproved employer account."""
    user = db.query(User).filter(User.id == user_id, User.role == "employer").first()
    if not user:
        raise HTTPException(status_code=404, detail="Employer account not found.")

    db.delete(user)
    db.commit()
    return {"message": f"Employer account {user.email} has been rejected and removed."}