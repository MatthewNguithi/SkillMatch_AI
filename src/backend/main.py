from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime

from database import engine, get_db, Base
from model import User
from schemas import UserRegister, UserLogin, Token, UserOut
from auth import get_password_hash, verify_password, create_access_token
from dependencies import get_current_user, require_roles

# Import modular routers
from routers import student, employer

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
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Email address is already registered."
        )

    # Hash password & create user
    hashed_pwd = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        password_hash=hashed_pwd,
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.post("/api/v1/auth/login", response_model=Token)
def login(credentials: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.username).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
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