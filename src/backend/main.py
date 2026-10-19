from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random

from emails_util import send_otp_email
from database import engine, get_db, Base
from model import User
from schemas import UserRegister, UserLogin, Token, UserOut, OTPVerify
from auth import get_password_hash, verify_password, create_access_token
from dependencies import get_current_user, require_roles

# Import modular routers
from routers import student, employer, admin, matching

# Create tables automatically on launch
Base.metadata.create_all(bind=engine)

app = FastAPI(title="SkillMatch API", version="1.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------------------------------------------------------------
# AUTHENTICATION ROUTES
# -------------------------------------------------------------

@app.post("/api/v1/auth/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    if user_data.role not in ["student", "employer"]:
        raise  HTTPException(
            status_code=400,
            detail="Invalid role selected."
      )
    
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Email address is already registered."
        )

    # Hash password & create user
    hashed_pwd = get_password_hash(user_data.password)

    otp = str(random.randint(100000, 999999))
    expiration = datetime.utcnom() + timedelta(minutes=10)

    auto_approve = True if user_data.role == "student" else False

    new_user = User(
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone_number=user_data.phone_number,
        email=user_data.email,
        password_hash=hashed_pwd,
        role=user_data.role,
        is_verified=False,
        is_approved=auto_approve,
        otp_code=otp,
        otp_expiration_at=expiration
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    send_otp_email(new_user.email, otp, new_user.first_name)
    return {"message": "User registered successfully. Please check your email for the OTP code."}

@app.post("/api/v1/auth/verify-otp", response_model=Token)
def verify_otp(payload: OTPVerify, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Usesr not found."
        )

    if user.is_verified:
        raise  HTTPException(
            status_code=400,
            detail="Account is already verified."
        )

    if user.otp_code != payload.otp_code:
        raise HTTPException(
            status_code=401,
            detail="Invalid OTP code."
        )

    if user.otp_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=401,
            detail="OTP code has expired."
        )

    user.is_verified = True
    user.otp_code = None
    user.otp_expires_at = None
    user.last_login = datetime.utcnow()
    db.commit()

    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return{
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
    }

@app.post("/api/v1/auth/login", response_model=Token)
def login(credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.username).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Please verify your email via OTP before logging in."
        )

    if not user.is_approved:
        raise HTTPException(
            status_code=403,
            detail="Your account is pending for Admin approval."
        )

    # Update last login timestamp
    user.last_login = datetime.utcnow()
    db.commit()

    # Generate JWT
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id
    }


@app.get("/api/v1/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# -------------------------------------------------------------
# PROTECTED ROLE-BASED DEMO ROUTES
# -------------------------------------------------------------

# -------------------------------------------------------------
# INCLUDE MODULAR ROUTERS
# -------------------------------------------------------------
app.include_router(student.router, prefix="/api/v1")
app.include_router(employer.router, prefix="/api/v1")

app.include_router(matching.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")