from sqlalchemy import Column, BigInteger, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    phone_number = Column(String, nullable=True) # Useful if you choose SMS 2FA
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="student")
    
    # 2FA and Verification fields
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

    student_profiles = relationship("User", secondary="employer_student_association", back_populates="employers_profile")

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

    user = relationship("User", back_populates="student_profile")