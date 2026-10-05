import pandas as pd
from sentence_transformers import SentenceTransformer, util
import time

print ("Loading Model from Directory...")
start_time = time.time()
model = SentenceTransformer('./')
print(f"Model loaded in : {time.time() - start_time} seconds. \n")

print("Reading test_set.csv...")
df = pd.read_csv('test_set.csv')

print("\n--- EVALUATING FIRST 10 ROWS ---")
for i in range(10):
    resume =  str(df['resume_text'].iloc[i])
    job = str(df['job_description'].iloc[i])
    actual_score = (df['match_score'].iloc[i])
    label = str(df['match_label'].iloc[i])

    student_vec = model.encode(resume)
    job_vec = model.encode(job)

    cos_score = util.cos_sim(student_vec, job_vec).item()

    print(f"Row{i+1} | Label{label}")
    print(f"Actual Score: {cos_score:.4f}")
    print(f"Predicted Score: {actual_score:.4f}")
    print("-" * 40)