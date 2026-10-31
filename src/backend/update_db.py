from database import engine
from sqlalchemy import text

def add_column():
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE saved_matches ADD COLUMN itv_invite BOOLEAN DEFAULT FALSE;"))
            conn.commit()
            print("Successfully added 'itv_invite' column to 'saved_matches' table!")
        except Exception as e:
            print(f"Error updating table: {e}")

if __name__ == "__main__":
    add_column()