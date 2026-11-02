from database import engine, Base
import model  # Ensure model is imported so SQLAlchemy registers the Message schema

def create_tables():
    model.Base.metadata.create_all(bind=engine)
    print("Successfully created 'messages' table!")

if __name__ == "__main__":
    create_tables()