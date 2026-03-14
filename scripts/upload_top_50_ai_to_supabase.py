import os
import math
import pandas as pd
import requests

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

CSV_FILE = "kribll_top_50.csv"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}

def clean(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v

print("Loading final shortlist:", CSV_FILE)

df = pd.read_csv(CSV_FILE, low_memory=False)

print("Columns:", list(df.columns))
print("Rows:", len(df))

rows = []

for _, row in df.iterrows():

    payload = {
        "rank": clean(row.get("rank")),
        "fit": clean(row.get("fit")),
        "fit_score": clean(row.get("final_score") or row.get("score")),
        "score": clean(row.get("score")),
        "source": clean(row.get("source")),
        "publication_number": clean(row.get("publication_number")),
        "publication_date": clean(row.get("publication_date")),
        "title": clean(row.get("title")),
        "buyer_name": clean(row.get("buyer_name")),
        "country": clean(row.get("country") or "FR"),
        "category": clean(row.get("category")),
        "priority_bucket": clean(row.get("priority_bucket")),
        "cpv_code": clean(row.get("cpv_code")),
        "url": clean(row.get("url")),
        "why": clean(row.get("why"))
    }

    rows.append(payload)

print("Uploading rows:", len(rows))

resp = requests.post(
    f"{SUPABASE_URL}/rest/v1/tenders",
    headers=headers,
    json=rows
)

print("STATUS:", resp.status_code)
print(resp.text)
resp.raise_for_status()

print("Upload complete.")
