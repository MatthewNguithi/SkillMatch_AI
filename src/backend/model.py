from sqlalchemy import Column, BigInteger, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
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

    # Added: Relationship back to User matching User.employer_profile (back_populates="user")
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
    
    # NEW: Store the SBERT vector array
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