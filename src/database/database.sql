-- ==========================================
-- 1. DATABASE CREATION (from database.sql)
-- ==========================================
-- Run this first, then connect to the database before running the rest.
CREATE DATABASE skillmatch;

-- Connect to the database (if using psql command line)
-- \c skillmatch

-- ==========================================
-- 2. SYSTEM EXTENSIONS (Crucial for AI & Geo)
-- ==========================================
CREATE EXTENSION IF NOT EXISTS vector;  -- For Sentence-BERT semantic matching
CREATE EXTENSION IF NOT EXISTS postgis; -- For county-level geographic filtering

-- ==========================================
-- 3. AUTHENTICATION / LOGIN TABLE
-- ==========================================
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'informal_worker', 'employer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- 4. STUDENT PROFILES (Modified from studentData.sql)
-- ==========================================
CREATE TABLE students (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE, -- Links profile to the login credentials
    
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    institution VARCHAR(200) NOT NULL,
    course VARCHAR(200) NOT NULL,
    year_of_study VARCHAR(50) NOT NULL,
    career_goal VARCHAR(150) NOT NULL,
    opportunity_type VARCHAR(100) NOT NULL,
    county VARCHAR(100) NOT NULL,
    
    -- Keeping the raw text for frontend display
    skills_text TEXT NOT NULL, 
    
    -- The embedding vector for AI matching (Assuming 384 dimensions for standard all-MiniLM-L6-v2)
    skills_embedding VECTOR(384), 
    
    bio TEXT,
    consent BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_student_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ==========================================
-- 5. DOCUMENTS & SKILLS (from studentData.sql)
-- ==========================================
CREATE TABLE student_documents (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_student_documents_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE skills (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE student_skills (
    student_id BIGINT NOT NULL,
    skill_id BIGINT NOT NULL,
    proficiency_level VARCHAR(50),
    verification_status VARCHAR(50) DEFAULT 'unverified',
    
    PRIMARY KEY (student_id, skill_id),
    CONSTRAINT fk_student_skills_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_student_skills_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
);