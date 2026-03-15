import os
import json
import requests
import pandas as pd

print("====================================")
print("KRIBLL — 02 TED SCRAPER")
print("====================================")

# -----------------------------------
# Paths
# -----------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "kribll_ted_archi.csv")

# -----------------------------------
# TED Search API config
# -----------------------------------

ENDPOINT = "https://api.ted.europa.eu/v3/notices/search"

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
}

# On reste proche de ce qui a réellement marché dans le probe
FIELDS = [
    "notice-title",
    "buyer-name",
    "buyer-country",
    "description-lot",
]

QUERY = "classification-cpv IN (71200000 71220000 71400000) AND publication-date >= 20250101"

PAYLOAD = {
    "query": QUERY,
    "fields": FIELDS,
    "page": 1,
    "limit": 250,
    "scope": "ALL",
    "paginationMode": "PAGE_NUMBER",
}

OUTPUT_COLUMNS = [
    "source",
    "publication_number",
    "publication_date",
    "title",
    "buyer_name",
    "country",
    "cpv_code",
    "cpv_uri",
    "category",
    "ted_url",
    "raw_text",
]

# -----------------------------------
# Helpers
# -----------------------------------

def extract_multilang_text(value):
    if value is None:
        return ""

    if isinstance(value, str):
        return value.strip()

    if isinstance(value, list):
        for item in value:
            if isinstance(item, str) and item.strip():
                return item.strip()
        return ""

    if isinstance(value, dict):
        preferred_languages = ["eng", "fra", "spa", "ita", "deu", "hrv"]

        for lang in preferred_languages:
            if lang in value:
                lang_value = value[lang]

                if isinstance(lang_value, list):
                    for item in lang_value:
                        if isinstance(item, str) and item.strip():
                            return item.strip()

                elif isinstance(lang_value, str) and lang_value.strip():
                    return lang_value.strip()

        for _, lang_value in value.items():
            if isinstance(lang_value, list):
                for item in lang_value:
                    if isinstance(item, str) and item.strip():
                        return item.strip()

            elif isinstance(lang_value, str) and lang_value.strip():
                return lang_value.strip()

    return ""

def extract_country(value):
    if value is None:
        return ""

    if isinstance(value, list):
        for item in value:
            if isinstance(item, str) and item.strip():
                return item.strip()
        return ""

    if isinstance(value, str):
        return value.strip()

    return ""

def build_ted_url(notice):
    links = notice.get("links", {})

    if isinstance(links, dict):
        html_links = links.get("html", {})
        if isinstance(html_links, dict):
            if "ENG" in html_links and isinstance(html_links["ENG"], str) and html_links["ENG"].strip():
                return html_links["ENG"].strip()

            for _, url in html_links.items():
                if isinstance(url, str) and url.strip():
                    return url.strip()

    publication_number = notice.get("publication-number", "")
    if publication_number:
        return f"https://ted.europa.eu/en/notice/-/detail/{publication_number}"

    return ""

def infer_category(title, raw_text):
    text = f"{title} {raw_text}".lower()

    if any(word in text for word in ["urban", "urbanism", "urbanisme", "planning", "masterplan"]):
        return "URBANISM_LANDSCAPE"

    if any(word in text for word in ["landscape", "paysage", "public space", "park"]):
        return "URBANISM_LANDSCAPE"

    if any(word in text for word in [
        "architecture",
        "architect",
        "architectural",
        "building",
        "construction",
        "maîtrise d'œuvre",
        "maitrise d'oeuvre"
    ]):
        return "ARCHITECTURE_BUILDING"

    return "ARCHITECTURE_GENERAL"

# -----------------------------------
# API request
# -----------------------------------

print("Querying TED Search API...")
print("Payload:")
print(json.dumps(PAYLOAD, indent=2, ensure_ascii=False))

response = requests.post(ENDPOINT, headers=HEADERS, json=PAYLOAD, timeout=30)

print("Status:", response.status_code)

if response.status_code != 200:
    print("Error response:")
    print(response.text[:3000])
    raise SystemExit("TED API request failed.")

data = response.json()

print("Top-level response keys:", list(data.keys()))

results = data.get("results")
if results is None:
    results = data.get("notices", [])

print("Rows returned:", len(results))

if len(results) == 0:
    print("No TED notices returned.")
    print("Response preview:")
    print(json.dumps(data, indent=2, ensure_ascii=False)[:3000])

# -----------------------------------
# Transform notices
# -----------------------------------

rows = []

for notice in results:
    publication_number = notice.get("publication-number", "")
    publication_date = notice.get("publication-date", "")

    title = extract_multilang_text(notice.get("notice-title"))
    buyer_name = extract_multilang_text(notice.get("buyer-name"))
    country = extract_country(notice.get("buyer-country"))
    raw_text = extract_multilang_text(notice.get("description-lot"))
    ted_url = build_ted_url(notice)

    category = infer_category(title, raw_text)

    rows.append({
        "source": "TED",
        "publication_number": publication_number,
        "publication_date": publication_date,
        "title": title,
        "buyer_name": buyer_name,
        "country": country,
        "cpv_code": "",
        "cpv_uri": "",
        "category": category,
        "ted_url": ted_url,
        "raw_text": raw_text,
    })

df = pd.DataFrame(rows, columns=OUTPUT_COLUMNS)

# -----------------------------------
# Cleanup
# -----------------------------------

if not df.empty:
    df = df.drop_duplicates(subset=["publication_number"], keep="first")
    df = df.sort_values(
        by=["publication_date", "publication_number"],
        ascending=[False, False]
    )

# -----------------------------------
# Export
# -----------------------------------

df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")

print()
print("Unique rows after dedupe:", len(df))
print()
print("Non-empty title count:", (df["title"].fillna("").str.strip() != "").sum())
print("Non-empty buyer count:", (df["buyer_name"].fillna("").str.strip() != "").sum())
print("Non-empty country count:", (df["country"].fillna("").str.strip() != "").sum())
print("Non-empty raw_text count:", (df["raw_text"].fillna("").str.strip() != "").sum())
print()
print("Category counts:")
print(df["category"].value_counts(dropna=False))
print()
print("Export completed ->", OUTPUT_FILE)
print()
print(df.head(10).to_string(index=False))