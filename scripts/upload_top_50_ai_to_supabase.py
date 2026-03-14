import os
import math
import pandas as pd
import requests

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]

TOP_FEED_FILE = "data/kribll_top_feed.csv"
AGENCY_FEED_FILE = "data/kribll_agency_feed.csv"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json"
}


def clean_value(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


# Load both feeds and merge on URL to restore the full tender context
top_df = pd.read_csv(TOP_FEED_FILE, low_memory=False)
agency_df = pd.read_csv(AGENCY_FEED_FILE, low_memory=False)

merged = pd.merge(top_df, agency_df, on="url", how="inner", suffixes=("_top", "_ai"))

print("MERGED DF COLUMNS:", list(merged.columns))
print("MERGED DF SAMPLE:")
print(merged.head(3).to_dict(orient="records"))

rows = []

for _, row in merged.iterrows():
    payload = {
        "title": clean_value(row.get("title") or row.get("titre") or row.get("title_top")),
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
            or row.get("publication_date_top")
        ),
        "source": clean_value(row.get("source") or row.get("source_top")),
        "publication_number": clean_value(
            row.get("publication_number") or row.get("publication_number_top")
        ),
        "category": clean_value(row.get("category") or row.get("category_top")),
        "priority_bucket": clean_value(
            row.get("priority_bucket") or row.get("priority_bucket_top")
        ),
        "cpv_code": clean_value(row.get("cpv_code") or row.get("cpv_code_top")),
        "url": clean_value(row.get("url")),
        "why": clean_value(row.get("why") or row.get("why_top")),
        "summary": clean_value(row.get("summary") or row.get("summary_ai")),
        "verdict": clean_value(row.get("verdict") or row.get("verdict_ai")),
        "relevance_score": clean_value(
            row.get("relevance_score") or row.get("relevance_score_ai")
        ),
        "fit_score": clean_value(
            row.get("final_score") or row.get("score") or row.get("score_top")
        ),
        "country": clean_value(row.get("country") or "FR"),
    }

    if not payload["url"]:
        continue

    if len(rows) < 3:
        print("PAYLOAD SAMPLE:", payload)

    rows.append(payload)

print("ROWS TO UPLOAD:", len(rows))

resp = requests.post(
    f"{SUPABASE_URL}/rest/v1/tenders",
    headers=headers,
    json=rows
)

print("SUPABASE STATUS:", resp.status_code)
print("SUPABASE RESPONSE:", resp.text)
resp.raise_for_status()

print("Upload complete.")
