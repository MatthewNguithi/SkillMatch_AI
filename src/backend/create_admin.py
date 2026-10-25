from sqlalchemy import text
from database import engine, SessionLocal, Base
from model import Admin
from auth import get_password_hash

def create_admin():
    print("Resetting 'admin' table to apply the latest schema...")
    with engine.connect() as conn:
        # Safely drop only the isolated admin table if an outdated version exists
        conn.execute(text("DROP TABLE IF EXISTS admin CASCADE;"))
        conn.commit()

    # Re-create the admin table matching model.py
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    email = "admin@skillmatch.com"
    raw_password = "AdminPassword123!"

    admin_account = Admin(
        email=email,
        password_hash=get_password_hash(raw_password),
        role="admin"
    )
    db.add(admin_account)
    db.commit()

    print("Successfully created standalone Admin account!")
    print(f"Email: {email} | Password: {raw_password}")

    db.close()

if __name__ == "__main__":
    create_admin()