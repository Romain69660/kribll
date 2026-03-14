import os
import math
import pandas as pd
import requests

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

CSV_FILE = "data/kribll_agency_feed.csv"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def clean_value(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v

df = pd.read_csv(CSV_FILE)

print("UPLOAD SOURCE COLUMNS:", list(df.columns))
print("UPLOAD SAMPLE:", df.head(3).to_dict(orient="records"))

rows = []

for _, row in df.iterrows():
    payload = {
        "title": clean_value(
            row.get("title")
            or row.get("titre")
        ),
        "buyer_name": clean_value(
            row.get("buyer_name")
            or row.get("acheteur")
            or row.get("buyer")
            or row.get("authority")
        ),
        "publication_date": clean_value(
            row.get("publication_date")
            or row.get("date_publication")
            or row.get("date")
        ),
        "country": clean_value(
            row.get("country")
            or row.get("pays")
            or "FR"
        ),
        "category": clean_value(row.get("category")),
        "priority_bucket": clean_value(row.get("priority_bucket")),
        "cpv_code": clean_value(row.get("cpv_code")),
        "url": clean_value(row.get("url")),
        "why": clean_value(row.get("why")),
        "relevance_score": clean_value(row.get("relevance_score")),
        "fit_score": clean_value(row.get("score")),
        "summary": clean_value(row.get("summary")),
        "verdict": clean_value(row.get("verdict")),
    }

    if not payload["url"]:
        continue

    rows.append(payload)

print("ROWS TO UPLOAD:", len(rows))
print("PAYLOAD SAMPLE:", rows[:3])

resp = requests.post(
    f"{SUPABASE_URL}/rest/v1/tenders",
    headers=headers,
    json=rows
)

print("SUPABASE STATUS:", resp.status_code)
print("SUPABASE RESPONSE:", resp.text)
resp.raise_for_status()

print("Upload complete.")
