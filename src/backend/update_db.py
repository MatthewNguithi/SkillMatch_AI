from database import engine
from sqlalchemy import text

def add_column():
    print("Updating 'students' table...")
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE students ADD COLUMN embedding JSON;"))
            conn.commit()
            print("Successfully added 'embedding' column!")
        except Exception as e:
            print(f"Error (column might already exist): {e}")

if __name__ == "__main__":
    add_column()