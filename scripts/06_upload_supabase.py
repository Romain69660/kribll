import os
import math
import pandas as pd
import requests

print("====================================")
print("KRIBLL — 06 UPLOAD SUPABASE")
print("====================================")

# -----------------------------------
# Config
# -----------------------------------

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

CSV_FILE = "data/kribll_top_feed.csv"
TABLE_NAME = "tenders"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
    "Accept-Charset": "utf-8",
}

# -----------------------------------
# Helpers
# -----------------------------------

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

def fix_encoding(value):
    if not isinstance(value, str):
        return value
    try:
        return value.encode('latin-1').decode('utf-8')
    except (UnicodeDecodeError, UnicodeEncodeError):
        return value

# -----------------------------------
# Load CSV
# -----------------------------------

print("Loading final shortlist:", CSV_FILE)

df = pd.read_csv(CSV_FILE, low_memory=False, encoding="utf-8-sig")

print("SOURCE COLUMNS:", list(df.columns))
print("ROWS:", len(df))
print("SOURCE SAMPLE:")
print(df.head(3).to_dict(orient="records"))

# -----------------------------------
# Build payload rows
# -----------------------------------

# -----------------------------------
# Supprimer les anciennes entrées pour ces user_ids
# -----------------------------------

user_ids = df['user_id'].dropna().unique().tolist() if 'user_id' in df.columns else []
print("USER IDS TO REFRESH:", user_ids)

for uid in user_ids:
    del_resp = requests.delete(
        f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}?user_id=eq.{uid}",
        headers=headers,
    )
    print(f"DELETE user_id={uid} -> {del_resp.status_code}")

# -----------------------------------
# Build payload rows
# -----------------------------------

rows = []

for _, row in df.iterrows():
    payload = {
        "rank": clean_value(row.get("rank")),
        "user_id": clean_value(row.get("user_id")),
        "verdict": clean_value(row.get("verdict")),
        "final_score": clean_value(row.get("final_score")),
        "relevance_score": clean_value(row.get("relevance_score")),

        "source": clean_value(row.get("source")),
        "publication_number": clean_value(row.get("publication_number")),
        "publication_date": clean_value(row.get("publication_date")),
        "title": fix_encoding(clean_value(row.get("title"))),
        "buyer_name": fix_encoding(clean_value(row.get("buyer_name"))),
        "country": clean_value(row.get("country")),
        "category": clean_value(row.get("category")),
        "priority_bucket": clean_value(row.get("priority_bucket")),
        "cpv_code": clean_value(row.get("cpv_code")),
        "url": clean_value(row.get("url")),
        "summary": fix_encoding(clean_value(row.get("summary"))),
        "why_it_matters": fix_encoding(clean_value(row.get("why_it_matters"))),
        "location": fix_encoding(clean_value(row.get("location"))),
        "procedure_type": clean_value(row.get("procedure_type")),
        "main_discipline": fix_encoding(clean_value(row.get("main_discipline"))),
        "estimated_budget": clean_value(row.get("estimated_budget")),
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

    # safety: skip rows without URL
    if not payload["url"]:
        continue

    rows.append(payload)

print("ROWS TO UPLOAD:", len(rows))
print("PAYLOAD SAMPLE:")
for sample in rows[:3]:
    print(sample)

# -----------------------------------
# Upload to Supabase
# -----------------------------------

resp = requests.post(
    f"{SUPABASE_URL}/rest/v1/{TABLE_NAME}",
    headers=headers,
    json=rows,
)

print("SUPABASE STATUS:", resp.status_code)
print("SUPABASE RESPONSE:", resp.text[:3000])

resp.raise_for_status()

print("Upload complete.")