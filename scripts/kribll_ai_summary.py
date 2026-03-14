import os

import pandas as pd
import json
import time
from openai import OpenAI

print("====================================")
print("KRIBLL AI ANALYSIS — LEMAN MVP")
print("====================================")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY environment variable is required")

client = OpenAI(api_key=OPENAI_API_KEY)

INPUT_FILE = "data/kribll_results.csv"
OUTPUT_FILE = "data/kribll_agency_feed.csv"

MAX_ROWS = 10


def build_prompt(row):
    return f"""
Tu es Leman, une IA qui analyse les appels d'offres pour les agences d'architecture.

Analyse les données suivantes et retourne STRICTEMENT un JSON valide.

Données :
Publication number : {row.get("publication_number", "")}
Date : {row.get("publication_date", "")}
Titre : {row.get("title", "")}
Acheteur : {row.get("buyer_name", "")}
Pays : {row.get("country", "")}
Catégorie : {row.get("category", "")}
CPV : {row.get("cpv_code", "")}
URL : {row.get("url", "")}

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
- minimum_revenue_required = nombre uniquement si détectable, sinon null
- required_references_count = nombre uniquement si détectable, sinon null
- required_certifications = liste de strings, [] si rien
- consortium_required = true, false ou null si inconnu
- architect_mandatory = true, false ou null si inconnu
- relevance_score = nombre de 0 à 100
- verdict = GO, MAYBE ou NO
- estimated_budget = nombre uniquement si détectable, sinon null
- estimated_scale = small, medium, large ou null
- Retourne uniquement du JSON brut, sans texte avant ni après
"""


def extract_json(text):
    text = text.strip()

    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()

    start = text.find("{")
    end = text.rfind("}")

    if start == -1 or end == -1:
        raise ValueError("No JSON object found in response")

    return json.loads(text[start:end + 1])


def summarize(row):
    prompt = build_prompt(row)

    response = client.responses.create(
        model="gpt-5-mini",
        input=prompt
    )

    return response.output_text


def main():
    print("Loading CSV...")
    df = pd.read_csv(INPUT_FILE)

    df = df.head(MAX_ROWS)

    results = []

    for i, row in df.iterrows():
        print(f"Analyzing {i + 1}/{len(df)}")

        try:
            analysis_text = summarize(row)
            analysis_json = extract_json(analysis_text)
        except Exception as e:
            print("Error:", e)
            analysis_text = "ERROR"
            analysis_json = {}

        new_row = row.to_dict()

        new_row["leman_analysis"] = analysis_text
        new_row["project_type"] = analysis_json.get("project_type")
        new_row["program"] = analysis_json.get("program")
        new_row["location"] = analysis_json.get("location")
        new_row["procedure_type"] = analysis_json.get("procedure_type")
        new_row["main_discipline"] = analysis_json.get("main_discipline")
        new_row["estimated_scale"] = analysis_json.get("estimated_scale")
        new_row["estimated_budget"] = analysis_json.get("estimated_budget")
        new_row["required_references"] = analysis_json.get("required_references")
        new_row["required_references_count"] = analysis_json.get("required_references_count")
        new_row["minimum_revenue_required"] = analysis_json.get("minimum_revenue_required")
        new_row["required_certifications"] = json.dumps(
            analysis_json.get("required_certifications", []),
            ensure_ascii=False
        )
        new_row["consortium_required"] = analysis_json.get("consortium_required")
        new_row["architect_mandatory"] = analysis_json.get("architect_mandatory")
        new_row["relevance_score"] = analysis_json.get("relevance_score")
        new_row["verdict"] = analysis_json.get("verdict")
        new_row["summary"] = analysis_json.get("summary")
        new_row["why_it_matters"] = analysis_json.get("why_it_matters")

        results.append(new_row)

        time.sleep(1)

    out = pd.DataFrame(results)
    out.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")

    print()
    print("Export completed :", OUTPUT_FILE)
    print("Rows exported :", len(out))
    print("Columns added :")
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
        "why_it_matters"
    ])

    print("Step 2 completed: kribll_agency_feed.csv generated")


if __name__ == "__main__":
    main()