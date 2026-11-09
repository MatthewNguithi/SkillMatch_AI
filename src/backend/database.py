import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker


import redis
import json
import hashlib
from typing import List

# Initialize Redis client (defaulting to localhost:6379)
try:
    redis_client = redis.Redis(
        host="localhost", 
        port=6379, 
        db=0, 
        decode_responses=True,
        socket_connect_timeout=2
    )
    # Test connection
    redis_client.ping()
    REDIS_AVAILABLE = True
    print("Successfully connected to Redis cache!")
except Exception as e:
    REDIS_AVAILABLE = False
    redis_client = None
    print(f"Redis not connected ({e}). Falling back to live SBERT computation.")


def get_cached_embedding(text: str) -> List[float]:
    """
    Retrieves SBERT embedding vector for a given text.
    Checks Redis cache first; computes and caches embedding on cache miss.
    """
    if not text or not text.strip():
        return []

    clean_text = text.strip()
    
    # Generate unique MD5 hash key based on the input text content
    text_hash = hashlib.md5(clean_text.encode("utf-8")).hexdigest()
    cache_key = f"sbert:emb:{text_hash}"

    # 1. Attempt Redis cache read
    if REDIS_AVAILABLE and redis_client:
        try:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as err:
            print(f"Redis read error: {err}")

    # 2. Cache miss: Compute SBERT embedding vector
    embedding_vector = sbert_model.encode(clean_text).tolist()

    # 3. Write computed vector back to Redis (TTL: 7 Days)
    if REDIS_AVAILABLE and redis_client:
        try:
            redis_client.set(cache_key, json.dumps(embedding_vector), ex=604800)
        except Exception as err:
            print(f"Redis write error: {err}")

    return embedding_vector

# Load variables from the local .env file
load_dotenv()

# Grab the URL safely from the environment
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is not set in the environment or .env file")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()