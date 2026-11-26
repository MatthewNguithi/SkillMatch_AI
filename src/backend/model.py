from sqlalchemy import Column, BigInteger, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone_number = Column(String, nullable=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="student")
    
    is_verified = Column(Boolean, default=False)
    is_approved = Column(Boolean, default=False) 
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    
    last_login = Column(DateTime, nullable=True)

    student_profile = relationship("Student", back_populates="user", uselist=False)
    employer_profile = relationship("Employer", back_populates="user", uselist=False)


class Employer(Base):
    __tablename__ = "employers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    company_name = Column(String, nullable=False)
    company_website = Column(String, nullable=True)
    company_description = Column(Text, nullable=False)

    user = relationship("User", back_populates="employer_profile")
    job_postings = relationship("JobPosting", back_populates="employer")


class Student(Base):
    __tablename__ = "students"

    id = Column(BigInteger, primary_key=True, index=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    full_name = Column(String(150), nullable=False)
    phone = Column(String(30), nullable=True)
    institution = Column(String(200), nullable=False)
    course = Column(String(200), nullable=False)
    year_of_study = Column(String(50), nullable=False)
    career_goal = Column(String(150), nullable=False)
    opportunity_type = Column(String(100), nullable=False)
    county = Column(String(100), nullable=False)
    skills_text = Column(Text, nullable=False)
    bio = Column(Text, nullable=True)
    consent = Column(Boolean, default=False, nullable=False)

    cv_filename = Column(String(255), nullable=True)
    cv_file_path = Column(String(500), nullable=True)
    
    embedding = Column(JSON, nullable=True)

    user = relationship("User", back_populates="student_profile")


class JobPosting(Base):
    __tablename__ = "job_postings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    required_skills = Column(Text, nullable=True)
    opportunity_type = Column(String(50), nullable=False) 
    location = Column(String(100), nullable=True)

    source_type = Column(String(50), default="internal") 
    source_url = Column(String, nullable=True) 
    status = Column(String(20), default="open", nullable=False)
    hired_student_user_id = Column(BigInteger, ForeignKey("users.id"), nullable=True)
    
    employer_id = Column(Integer, ForeignKey("employers.id", ondelete="CASCADE"), nullable=True)
    embedding = Column(JSON, nullable=True)

    employer = relationship("Employer", back_populates="job_postings")
    created_at = Column(DateTime, default=datetime.utcnow)


class Admin(Base):
    __tablename__ = "admin"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="admin")
    
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    
    last_login = Column(DateTime, nullable=True)


class SavedMatch(Base):
    __tablename__ = "saved_matches"

    id = Column(BigInteger, primary_key=True, index=True)
    employer_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    student_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(BigInteger, ForeignKey("job_postings.id", ondelete="CASCADE"), nullable=True)
    match_score = Column(Float, nullable=False)
    saved_by_role = Column(String(20), nullable=False)  # 'employer' or 'student'
    job_title = Column(String(200), nullable=True)
    itv_invite = Column(Boolean, default=False)

    # --- Interview & RSVP Fields ---
    interview_date = Column(String(50), nullable=True)     # Format: YYYY-MM-DD
    interview_time = Column(String(50), nullable=True)     # Format: HH:MM (24-hr)
    location_or_link = Column(String(255), nullable=True) # Google Meet link or physical office
    rsvp_status = Column(String(20), default="pending")    # 'pending', 'accepted', 'declined'
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)


class Message(Base):
    __tablename__ = "messages"

    id = Column(BigInteger, primary_key=True, index=True)
    sender_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_title = Column(String(200), nullable=True)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, server_default=func.now())