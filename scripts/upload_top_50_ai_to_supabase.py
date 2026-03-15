import os
import math
import pandas as pd
import requests

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

CSV_FILE = "data/kribll_top_feed.csv"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def clean_value(v):
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if pd.isna(v):
        return None
    if isinstance(v, str) and v.strip() == "":
        return None
    return v

print("====================================")
print("UPLOAD TO SUPABASE — KRIBBL TOP FEED")
print("====================================")
print("Loading final shortlist:", CSV_FILE)

df = pd.read_csv(CSV_FILE, low_memory=False)

print("SOURCE COLUMNS:", list(df.columns))
print("ROWS:", len(df))
print("SOURCE SAMPLE:")
print(df.head(3).to_dict(orient="records"))

rows = []

for _, row in df.iterrows():
    payload = {
        # existing fields
        "rank": clean_value(row.get("rank")),
        "fit": clean_value(row.get("fit")),
        "final_score": clean_value(row.get("final_score")),
        "score": clean_value(row.get("score")),
        "source": clean_value(row.get("source")),
        "publication_number": clean_value(row.get("publication_number")),
        "publication_date": clean_value(row.get("publication_date")),
        "title": clean_value(row.get("title") or row.get("titre")),
        "buyer_name": clean_value(row.get("buyer_name") or row.get("acheteur")),
        "country": clean_value(row.get("country") or "FR"),
        "category": clean_value(row.get("category")),
        "priority_bucket": clean_value(row.get("priority_bucket")),
        "cpv_code": clean_value(row.get("cpv_code")),
        "url": clean_value(row.get("url")),
        "why": clean_value(row.get("why")),

        # AI fields
        "summary": clean_value(row.get("summary")),
        "verdict": clean_value(row.get("verdict")),
        "relevance_score": clean_value(row.get("relevance_score")),
        "location": clean_value(row.get("location")),
        "procedure_type": clean_value(row.get("procedure_type")),
        "main_discipline": clean_value(row.get("main_discipline")),
        "estimated_budget": clean_value(row.get("estimated_budget")),
        "why_it_matters": clean_value(row.get("why_it_matters")),
        "project_type": clean_value(row.get("project_type")),
        "program": clean_value(row.get("program")),
        "estimated_scale": clean_value(row.get("estimated_scale")),
        "required_references": clean_value(row.get("required_references")),
        "required_references_count": clean_value(row.get("required_references_count")),
        "minimum_revenue_required": clean_value(row.get("minimum_revenue_required")),
        "required_certifications": clean_value(row.get("required_certifications")),
        "consortium_required": clean_value(row.get("consortium_required")),
        "architect_mandatory": clean_value(row.get("architect_mandatory")),
    }

    if not payload["url"]:
        continue

    rows.append(payload)

print("ROWS TO UPLOAD:", len(rows))
print("PAYLOAD SAMPLE:")
for sample in rows[:3]:
    print(sample)

resp = requests.post(
    f"{SUPABASE_URL}/rest/v1/tenders",
    headers=headers,
    json=rows,
)

print("SUPABASE STATUS:", resp.status_code)
print("SUPABASE RESPONSE:", resp.text)
resp.raise_for_status()

print("Upload complete.")