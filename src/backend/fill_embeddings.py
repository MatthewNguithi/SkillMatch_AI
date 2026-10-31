from sqlalchemy.orm import Session
from database import SessionLocal
from model import Student, JobPosting
from sentence_transformers import SentenceTransformer

def fill_missing_embeddings():
    db: Session = SessionLocal()
    
    print("Loading SBERT model (this takes a few seconds)...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    
    try:
        # 1. Generate Embeddings for Students
        students = db.query(Student).filter(Student.embedding == None).all()
        if students:
            print(f"Generating embeddings for {len(students)} students...")
            for s in students:
                text = f"{s.career_goal}. Skills: {s.skills_text}. Bio: {s.bio or ''}"
                s.embedding = model.encode(text).tolist()
        else:
            print("No students missing embeddings.")

        # 2. Generate Embeddings for Job Postings
        jobs = db.query(JobPosting).filter(JobPosting.embedding == None).all()
        if jobs:
            print(f"Generating embeddings for {len(jobs)} job postings...")
            for j in jobs:
                text = f"{j.title}. {j.description}. Required Skills: {j.required_skills or ''}"
                j.embedding = model.encode(text).tolist()
        else:
            print("No jobs missing embeddings.")

        db.commit()
        print("Success! All embeddings have been generated and saved to the database.")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    fill_missing_embeddings()