from sqlalchemy import text
from database import engine, Base
import model  # Ensure model is imported so SQLAlchemy registers the Message schema

def add_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE saved_matches ADD COLUMN IF NOT EXISTS interview_date VARCHAR(50), ADD COLUMN IF NOT EXISTS interview_time VARCHAR(50),ADD COLUMN IF NOT EXISTS location_or_link VARCHAR(255), ADD COLUMN IF NOT EXISTS rsvp_status VARCHAR(20) DEFAULT 'pending',ADD COLUMN IF NOT EXISTS notes TEXT;"))
            conn.commit()
            print("Successfully added 'itv_invite' column to 'saved_matches' table!")
        except Exception as e:
            print(f"Error updating table: {e}")

if __name__ == "__main__":
    add_column()