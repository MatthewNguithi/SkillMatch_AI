from sqlalchemy import text
from database import engine, Base
import model  # Ensure model is imported so SQLAlchemy schemas are registered

ALTER_STATEMENTS = [
    """
    ALTER TABLE students
        ADD COLUMN IF NOT EXISTS cv_filename VARCHAR(255),
        ADD COLUMN IF NOT EXISTS cv_file_path VARCHAR(500);
    """,
    """
    ALTER TABLE job_postings
        ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'open',
        ADD COLUMN IF NOT EXISTS hired_student_user_id BIGINT REFERENCES users(id);
    """,
]


def add_column():
    with engine.begin() as conn:
        for stmt in ALTER_STATEMENTS:
            conn.execute(text(stmt))
    print("Successfully updated students and job_postings tables!")


if __name__ == "__main__":
    try:
        add_column()
    except Exception as e:
        print(f"Error updating table: {e}")