from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # 'student', 'informal_worker', 'employer', 'admin'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)

    student_profile = relationship("Student", back_populates="user", uselist=False)

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