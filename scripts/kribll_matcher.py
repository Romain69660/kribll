import json
import re
import unicodedata
import pandas as pd

print("====================================")
print("KRIBLL MATCHER — AGENCY FEED")
print("====================================")

MASTER_FILE = "data/kribll_top_feed.csv"
PROFILE_FILE = "data/agency_profile.json"
OUTPUT_FILE = "data/kribll_final_feed.csv"


def normalize(text):
    if text is None:
        return ""
    text = str(text).lower()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.replace("’", " ").replace("'", " ")
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def load_profile(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def safe_float(value):
    try:
        if value is None or value == "":
            return None
        if pd.isna(value):
            return None
        return float(value)
    except:
        return None


def safe_int(value):
    try:
        if value is None or value == "":
            return None
        if pd.isna(value):
            return None
        return int(float(value))
    except:
        return None


def compute_score(row, profile):
    score = 0
    reasons = []

    # Use precomputed score from feed if available (helps keep shortlist scores consistent)
    row_score = safe_float(row.get("score"))
    if row_score is not None:
        score = row_score
        reasons.append(f"+ base score from feed: {row_score}")

    category = str(row.get("category", "")).strip()
    country = str(row.get("country", "")).strip()
    title = str(row.get("title", "")).strip()
    buyer = str(row.get("buyer_name", "")).strip()
    priority = str(row.get("priority_bucket", "")).strip()
    source = str(row.get("source", "")).strip()
    verdict = str(row.get("verdict", "")).strip().upper()

    minimum_revenue_required = safe_float(row.get("minimum_revenue_required"))
    required_references_count = safe_int(row.get("required_references_count"))
    consortium_required = row.get("consortium_required")
    architect_mandatory = row.get("architect_mandatory")
    relevance_score = safe_float(row.get("relevance_score"))

    text_blob = normalize(" ".join([title, buyer, category]))

    preferred_categories = profile.get("preferred_categories", [])
    excluded_categories = profile.get("excluded_categories", [])
    preferred_countries = profile.get("preferred_countries", [])
    keywords_positive = profile.get("keywords_positive", [])
    keywords_negative = profile.get("keywords_negative", [])
    project_types = profile.get("project_types", [])

    agency_revenue = safe_float(profile.get("annual_revenue"))
    agency_references = profile.get("references", [])

    if category in preferred_categories:
        score += 30
        reasons.append(f"+ preferred category: {category}")

    if category in excluded_categories:
        score -= 40
        reasons.append(f"- excluded category: {category}")

    if country and country in preferred_countries:
        score += 20
        reasons.append(f"+ preferred country: {country}")
    elif country == "":
        if source == "BOAMP":
            score += 20
            reasons.append("+ BOAMP assumed FR")
    else:
        score -= 10
        reasons.append(f"- non preferred country: {country}")

    if priority == "CORE":
        score += 15
        reasons.append("+ core priority")
    elif priority == "SECONDARY":
        score += 3
        reasons.append("+ secondary priority")

    for kw in keywords_positive:
        if normalize(kw) in text_blob:
            score += 8
            reasons.append(f"+ keyword: {kw}")

    for kw in keywords_negative:
        if normalize(kw) in text_blob:
            score -= 12
            reasons.append(f"- keyword: {kw}")

    for pt in project_types:
        if normalize(pt) in text_blob:
            score += 12
            reasons.append(f"+ project type match: {pt}")

    if category == "COMPETITIONS":
        score += 10
        reasons.append("+ competition bonus")

    if category in ["ARCHITECTURE_BUILDING", "ARCHITECTURE_GENERAL"]:
        score += 10
        reasons.append("+ architecture bonus")

    if minimum_revenue_required is not None and agency_revenue is not None:
        if agency_revenue >= minimum_revenue_required:
            score += 20
            reasons.append(f"+ revenue fit: {agency_revenue} >= {minimum_revenue_required}")
        else:
            score -= 35
            reasons.append(f"- revenue too low: {agency_revenue} < {minimum_revenue_required}")

    if required_references_count is not None:
        agency_references_count = len(agency_references)
        if agency_references_count >= required_references_count:
            score += 15
            reasons.append(f"+ references fit: {agency_references_count} >= {required_references_count}")
        else:
            score -= 20
            reasons.append(f"- not enough references: {agency_references_count} < {required_references_count}")

    if str(consortium_required).lower() == "true":
        score -= 5
        reasons.append("! consortium may be required")

    if str(architect_mandatory).lower() == "true":
        score += 8
        reasons.append("+ architect mandatory")

    if verdict == "GO":
        score += 15
        reasons.append("+ leman verdict: GO")
    elif verdict == "MAYBE":
        score -= 10
        reasons.append("- leman verdict: MAYBE")
    elif verdict == "NO":
        score -= 40
        reasons.append("- leman verdict: NO")

    if relevance_score is not None:
        if relevance_score >= 85:
            score += 10
            reasons.append(f"+ high relevance score: {relevance_score}")
        elif relevance_score >= 70:
            score += 5
            reasons.append(f"+ medium relevance score: {relevance_score}")
        elif relevance_score < 40:
            score -= 15
            reasons.append(f"- low relevance score: {relevance_score}")

    return score, reasons, verdict


def classify_fit(score, verdict):
    if verdict == "NO":
        return "LOW_FIT"
    if verdict == "MAYBE":
        if score >= 60:
            return "GOOD_FIT"
        return "LOW_FIT"
    if score >= 85:
        return "EXCELLENT_FIT"
    elif score >= 60:
        return "GOOD_FIT"
    else:
        return "LOW_FIT"


def main():
    print("Loading AI-enriched feed...")
    df = pd.read_csv(MASTER_FILE, low_memory=False)

    print("Loading agency profile...")
    profile = load_profile(PROFILE_FILE)

    print("Rows:", len(df))
    print("Agency:", profile.get("name", "Unknown agency"))

    results = []

    for _, row in df.iterrows():
        score, reasons, verdict = compute_score(row, profile)
        fit = classify_fit(score, verdict)

        if fit in ["EXCELLENT_FIT", "GOOD_FIT"]:
            results.append({
                "fit": fit,
                "score": score,
                "source": row.get("source", ""),
                "publication_number": row.get("publication_number", ""),
                "publication_date": row.get("publication_date", ""),
                "title": row.get("title", ""),
                "buyer_name": row.get("buyer_name", ""),
                "country": row.get("country", ""),
                "category": row.get("category", ""),
                "priority_bucket": row.get("priority_bucket", ""),
                "cpv_code": row.get("cpv_code", ""),
                "minimum_revenue_required": row.get("minimum_revenue_required", ""),
                "required_references_count": row.get("required_references_count", ""),
                "consortium_required": row.get("consortium_required", ""),
                "architect_mandatory": row.get("architect_mandatory", ""),
                "relevance_score": row.get("relevance_score", ""),
                "verdict": row.get("verdict", ""),
                "summary": row.get("summary", ""),
                "url": row.get("url", ""),
                "why": " | ".join(reasons[:14])
            })

    out = pd.DataFrame(results)

    fit_order = {
        "EXCELLENT_FIT": 0,
        "GOOD_FIT": 1
    }

    if not out.empty:
        out["fit_order"] = out["fit"].map(fit_order)
        out = out.sort_values(
            by=["fit_order", "score", "publication_date"],
            ascending=[True, False, False]
        ).drop(columns=["fit_order"])

    out.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")

    print()
    print("Selected rows:", len(out))
    print()
    if not out.empty:
        print("By fit:")
        print(out["fit"].value_counts(dropna=False))
        print()
        print("Top 20:")
        print(out.head(20).to_string(index=False))
    else:
        print("No matching opportunities found.")

    print()
    print("Export completed ->", OUTPUT_FILE)

    print("Step 4 completed: kribll_final_feed.csv generated")


if __name__ == "__main__":
    main()

    df_final = pd.read_csv(OUTPUT_FILE, low_memory=False)
    print("FINAL DF COLUMNS:", list(df_final.columns))
    print("FINAL DF SAMPLE:")
    print(df_final.head(3).to_dict(orient="records"))


def upload_to_supabase():
    import os
    import requests

    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")

    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY environment variables are required")

    csv_path = OUTPUT_FILE

    print()
    print("Uploading results to Supabase...")

    import numpy as np

    df = pd.read_csv(csv_path, low_memory=False)

    print("UPLOAD DF COLUMNS:", list(df.columns))

    # Replace non-serializable numeric values (NaN, inf, -inf) with None
    df = df.replace([np.inf, -np.inf], None)
    records = df.where(pd.notnull(df), None).to_dict(orient="records")

    url = SUPABASE_URL.rstrip("/") + "/rest/v1/tenders"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }

    import math

    def clean_value(v):
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return None
        return v

    allowed_fields = {
        "url",
        "title",
        "publication_date",
        "buyer_name",
        "country",
        "category",
        "summary",
        "verdict",
        "fit_score",
        "relevance_score",
    }

    def pick(row, *keys):
        for key in keys:
            if key in row and row[key] is not None:
                try:
                    import pandas as pd

                    if pd.isna(row[key]):
                        continue
                except Exception:
                    pass
                return row[key]
        return None

    # Send in chunks to avoid overly large requests
    chunk_size = 200
    debug_row_count = 0
    for i in range(0, len(records), chunk_size):
        batch_rows = records[i : i + chunk_size]
        batch = []

        for row in batch_rows:
            if debug_row_count < 3:
                print("ROW SAMPLE:", row)
                debug_row_count += 1

            payload = {
                "url": pick(row, "url"),
                "title": pick(row, "title", "titre"),
                "publication_date": pick(row, "publication_date", "date_publication", "publication_date_raw"),
                "buyer_name": pick(row, "buyer_name", "buyer", "acheteur"),
                "country": pick(row, "country", "pays"),
                "category": pick(row, "category"),
                "summary": pick(row, "summary", "ai_summary", "why"),
                "verdict": pick(row, "verdict"),
                "fit_score": pick(row, "fit_score", "final_score", "score"),
                "relevance_score": pick(row, "relevance_score", "score"),
            }

            if not payload["url"]:
                continue

            if len(batch) < 3:
                print("PAYLOAD SAMPLE:", payload)

            batch.append({k: clean_value(v) for k, v in payload.items() if k in allowed_fields})

        resp = requests.post(url, json=batch, headers=headers)
        if resp.status_code >= 400:
            print("Supabase error:")
            print("Status:", resp.status_code)
            print(resp.text)
            raise RuntimeError("Supabase insert failed")
        print(f"Uploaded {len(batch)} rows (batch {i//chunk_size + 1})")

    print("Supabase upload complete.")


upload_to_supabase()