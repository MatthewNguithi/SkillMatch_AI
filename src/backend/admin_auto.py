# Run once locally or in python shell
from database import SessionLocal
from model import User

db = SessionLocal()
user = db.query(User).filter(User.email == "your_admin_email@example.com").first()
if user:
    user.role = "admin"
    user.is_approved = True
    user.is_verified = True
    db.commit()
    print("Admin account activated successfully!")