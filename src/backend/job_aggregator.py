import requests
from sqlalchemy.orm import Session
from model import JobPosting
from database import SessionLocal

# You can get these for free at developer.adzuna.com
ADZUNA_APP_ID = "your_adzuna_app_id"
ADZUNA_APP_KEY = "your_adzuna_app_key"
COUNTRY_CODE = "ke" # Targeting Kenya

def fetch_external_jobs():
    db: Session = SessionLocal()
    
    # Querying for software, tech, or general student roles
    search_keywords = "internship OR part-time OR software OR data"
    url = f"https://api.adzuna.com/v1/api/jobs/{COUNTRY_CODE}/search/1?app_id={ADZUNA_APP_ID}&app_key={ADZUNA_APP_KEY}&results_per_page=50&what={search_keywords}"
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()

        added_count = 0
        for job in data.get("results", []):
            # 1. Prevent inserting the same job twice
            existing_job = db.query(JobPosting).filter(JobPosting.source_url == job["redirect_url"]).first()
            
            if not existing_job:
                # 2. Determine opportunity type based on API tags or title
                contract_time = job.get("contract_time", "").lower()
                title_lower = job.get("title", "").lower()
                
                opp_type = "Full-time"
                if "part_time" in contract_time or "part-time" in title_lower:
                    opp_type = "Part-time"
                elif "intern" in title_lower:
                    opp_type = "Internship"

                # 3. Standardize and insert into your database
                new_job = JobPosting(
                    title=job.get("title"),
                    description=job.get("description"),
                    opportunity_type=opp_type,
                    location=job.get("location", {}).get("display_name", "Kenya"),
                    source_type="external",
                    source_url=job.get("redirect_url"),
                    employer_id=None # External jobs have no internal employer account
                )
                db.add(new_job)
                added_count += 1
        
        db.commit()
        print(f"Successfully aggregated {added_count} new external jobs.")
        
    except Exception as e:
        print(f"Failed to fetch jobs: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fetch_external_jobs()