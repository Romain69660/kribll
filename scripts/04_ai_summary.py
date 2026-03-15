import os
import json
import time
import pandas as pd
from openai import OpenAI

print("====================================")
print("KRIBLL — 04 AI SUMMARY")
print("====================================")

# -----------------------------------
# Config
# -----------------------------------

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY environment variable is required")

client = OpenAI(api_key=OPENAI_API_KEY)

INPUT_FILE = "data/kribll_results.csv"
OUTPUT_FILE = "data/kribll_agency_feed.csv"

# Change this if you want to test on a small sample first
MAX_ROWS = None   # example: 20 for testing, None for all rows
SLEEP_SECONDS = 1

# -----------------------------------
# Helpers
# -----------------------------------

def clean_value(value):
    if pd.isna(value):
        return ""
    return str(value).strip()

def normalize_row(row):
    data = row.to_dict()

    normalized = {
        "source": clean_value(data.get("source")),
        "title": clean_value(data.get("title")),
        "buyer_name": clean_value(data.get("buyer_name")),
        "publication_date": clean_value(data.get("publication_date")),
        "publication_number": clean_value(data.get("publication_number")),
        "country": clean_value(data.get("country")),
        "category": clean_value(data.get("category")),
        "cpv_code": clean_value(data.get("cpv_code")),
        "url": clean_value(data.get("url")),
        "raw_text": clean_value(data.get("raw_text")),
    }

    return normalized

def build_prompt(row):
    return f"""
Tu es Leman, une IA experte qui analyse des appels d'offres pour des agences d'architecture, d'urbanisme, de paysage et de maîtrise d'œuvre.

Tu dois analyser l'opportunité et retourner STRICTEMENT un JSON valide.

Voici les données disponibles :

source: {row.get("source", "")}
publication_number: {row.get("publication_number", "")}
publication_date: {row.get("publication_date", "")}
title: {row.get("title", "")}
buyer_name: {row.get("buyer_name", "")}
country: {row.get("country", "")}
category: {row.get("category", "")}
cpv_code: {row.get("cpv_code", "")}
url: {row.get("url", "")}

raw_text:
{row.get("raw_text", "")}

Retourne STRICTEMENT un JSON avec les champs suivants :

project_type
program
location
procedure_type
main_discipline
estimated_scale
estimated_budget
required_references
required_references_count
minimum_revenue_required
required_certifications
consortium_required
architect_mandatory
relevance_score
verdict
summary
why_it_matters

Règles :
- project_type, program, location, procedure_type, main_discipline = string ou null
- estimated_scale = "small", "medium", "large" ou null
- estimated_budget = nombre uniquement si détectable, sinon null
- required_references = liste de strings, [] si rien
- required_references_count = nombre uniquement si détectable, sinon null
- minimum_revenue_required = nombre uniquement si détectable, sinon null
- required_certifications = liste de strings, [] si rien
- consortium_required = true, false ou null si inconnu
- architect_mandatory = true, false ou null si inconnu
- relevance_score = nombre entier de 0 à 100
- verdict = "GO", "MAYBE" ou "NO"
- summary = résumé clair en 2 à 4 phrases maximum
- why_it_matters = explication brève et concrète de l'intérêt de l'opportunité
- si une information n'est pas détectable, retourne null au lieu d'inventer
- retourne uniquement du JSON brut, sans markdown, sans texte avant, sans texte après
"""

def extract_json(text):
    text = text.strip()

    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()

    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1 or end <= start:
        raise ValueError("No valid JSON object found in model response")

    json_str = text[start:end + 1]
    return json.loads(json_str)

def summarize_with_leman(row):
    prompt = build_prompt(row)

    response = client.responses.create(
        model="gpt-5-mini",
        input=prompt
    )

    return response.output_text

def safe_json_list(value):
    if isinstance(value, list):
        return json.dumps(value, ensure_ascii=False)
    return json.dumps([], ensure_ascii=False)

# -----------------------------------
# Main
# -----------------------------------

def main():
    print("Loading CSV...")

    df = pd.read_csv(INPUT_FILE, low_memory=False)

    if MAX_ROWS is not None:
        df = df.head(MAX_ROWS)

    print("Rows to analyze:", len(df))

    results = []

    for i, (_, row) in enumerate(df.iterrows(), start=1):
        print(f"Analyzing {i}/{len(df)}")

        normalized = normalize_row(row)

        try:
            analysis_text = summarize_with_leman(normalized)
            analysis_json = extract_json(analysis_text)
        except Exception as e:
            print("Error during AI analysis:", e)
            analysis_text = "ERROR"
            analysis_json = {}

        new_row = row.to_dict()

        # keep normalized canonical fields explicit
        new_row["source"] = normalized["source"]
        new_row["title"] = normalized["title"]
        new_row["buyer_name"] = normalized["buyer_name"]
        new_row["publication_date"] = normalized["publication_date"]
        new_row["publication_number"] = normalized["publication_number"]
        new_row["country"] = normalized["country"]
        new_row["category"] = normalized["category"]
        new_row["cpv_code"] = normalized["cpv_code"]
        new_row["url"] = normalized["url"]
        new_row["raw_text"] = normalized["raw_text"]

        # raw response
        new_row["leman_analysis"] = analysis_text

        # structured AI fields
        new_row["project_type"] = analysis_json.get("project_type")
        new_row["program"] = analysis_json.get("program")
        new_row["location"] = analysis_json.get("location")
        new_row["procedure_type"] = analysis_json.get("procedure_type")
        new_row["main_discipline"] = analysis_json.get("main_discipline")
        new_row["estimated_scale"] = analysis_json.get("estimated_scale")
        new_row["estimated_budget"] = analysis_json.get("estimated_budget")
        new_row["required_references"] = safe_json_list(
            analysis_json.get("required_references")
        )
        new_row["required_references_count"] = analysis_json.get("required_references_count")
        new_row["minimum_revenue_required"] = analysis_json.get("minimum_revenue_required")
        new_row["required_certifications"] = safe_json_list(
            analysis_json.get("required_certifications")
        )
        new_row["consortium_required"] = analysis_json.get("consortium_required")
        new_row["architect_mandatory"] = analysis_json.get("architect_mandatory")
        new_row["relevance_score"] = analysis_json.get("relevance_score")
        new_row["verdict"] = analysis_json.get("verdict")
        new_row["summary"] = analysis_json.get("summary")
        new_row["why_it_matters"] = analysis_json.get("why_it_matters")

        results.append(new_row)

        if SLEEP_SECONDS > 0:
            time.sleep(SLEEP_SECONDS)

    out = pd.DataFrame(results)
    out.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")

    print()
    print("Export completed:", OUTPUT_FILE)
    print("Rows exported:", len(out))
    print("Columns added:")
    print([
        "project_type",
        "program",
        "location",
        "procedure_type",
        "main_discipline",
        "estimated_scale",
        "estimated_budget",
        "required_references",
        "required_references_count",
        "minimum_revenue_required",
        "required_certifications",
        "consortium_required",
        "architect_mandatory",
        "relevance_score",
        "verdict",
        "summary",
        "why_it_matters",
    ])
    print("Step 4 completed: kribll_agency_feed.csv generated")

if __name__ == "__main__":
    main()