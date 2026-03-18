import os
import json
import requests
import pandas as pd
from openai import OpenAI

print("====================================")
print("KRIBLL — 04 AI SUMMARY (MULTI-PROFIL)")
print("====================================")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY environment variable is required")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

INPUT_FILE  = "data/kribll_results.csv"
OUTPUT_FILE = "data/kribll_agency_feed.csv"

MAX_ROWS_PER_PROFILE = 30
MODEL_NAME = "gpt-4o-mini"

def load_all_profiles():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("SUPABASE non configuré — fallback sur agency_profile.json")
        return [load_profile_from_file()]
    try:
        url = f"{SUPABASE_URL}/rest/v1/agency_profiles"
        headers = {"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"}
        resp = requests.get(url, headers=headers, timeout=15)
        if resp.status_code != 200:
            print(f"Supabase error {resp.status_code} — fallback fichier")
            return [load_profile_from_file()]
        profiles = resp.json()
        if not profiles:
            print("Aucun profil — fallback fichier")
            return [load_profile_from_file()]
        print(f"{len(profiles)} profil(s) trouvé(s)")
        return [normalize_supabase_profile(p) for p in profiles]
    except Exception as e:
        print(f"Erreur: {e} — fallback fichier")
        return [load_profile_from_file()]

def normalize_supabase_profile(p):
    revenue_map = {"<300k": 250000, "300k-600k": 450000, "600k-1.5M": 1000000, "1.5M-5M": 3000000, "5M+": 7000000}
    team_map = {"1-5": 3, "6-15": 10, "16-50": 30, "50+": 75}
    raw_refs = p.get("agency_references") or []
    if isinstance(raw_refs, str):
        try:
            raw_refs = json.loads(raw_refs)
        except Exception:
            raw_refs = []
    references = [{"type": r.get("type",""), "location": r.get("location",""), "year": r.get("year",""), "amount": r.get("amount","")} for r in raw_refs if isinstance(r, dict)]
    return {
        "user_id": p.get("user_id", ""),
        "name": p.get("name", "Agence inconnue"),
        "city": p.get("city", ""),
        "team_size": team_map.get(p.get("team_size", ""), 10),
        "annual_revenue": revenue_map.get(p.get("annual_revenue", ""), 500000),
        "preferred_countries": p.get("preferred_countries") or ["FR"],
        "preferred_regions": p.get("preferred_regions") or [],
        "project_types": p.get("project_types") or [],
        "preferred_categories": p.get("preferred_categories") or [],
        "excluded_categories": p.get("excluded_categories") or [],
        "keywords_positive": p.get("keywords_positive") or [],
        "keywords_negative": p.get("keywords_negative") or [],
        "references": references,
    }

def load_profile_from_file():
    path = os.path.join("data", "agency_profile.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"user_id": "", "name": "Agence générique", "annual_revenue": 500000, "references": []}

def clean_value(value):
    if pd.isna(value):
        return ""
    return str(value).strip()

def compute_pre_ai_score(row):
    score = 0
    category = clean_value(row.get("category")).upper()
    bucket = clean_value(row.get("priority_bucket")).upper()
    source = clean_value(row.get("source")).upper()
    text = f"{clean_value(row.get('title'))} {clean_value(row.get('raw_text'))} {clean_value(row.get('cpv_code'))}".lower()

    if bucket == "CORE": score += 20
    elif bucket == "SECONDARY": score += 8
    if category == "ARCHITECTURE_BUILDING": score += 20
    elif category == "URBANISM_LANDSCAPE": score += 18
    elif category == "COMPETITIONS": score += 16
    elif category == "AMO_PROGRAMMING": score += 12
    elif category == "SURVEY_TOPO": score += 6
    elif category == "ENGINEERING": score += 2
    if source == "BOAMP": score += 4
    elif source == "TED": score += 2

    for term in ["maitrise d'oeuvre", "architect", "architecture", "urbanisme", "paysage", "concours", "rehabilitation", "logements", "ecole", "patrimoine"]:
        if term in text: score += 3
    for term in ["sewage", "waste", "cleaning", "maintenance", "dechets"]:
        if term in text: score -= 8
    if clean_value(row.get("title")): score += 5
    if clean_value(row.get("buyer_name")): score += 3
    return score

def format_references(refs):
    if not refs:
        return "Aucune référence renseignée."
    lines = [" — ".join([v for v in [r.get("type"), r.get("location"), str(r.get("year","")), r.get("amount")] if v]) for r in refs if isinstance(r, dict)]
    return "\n".join(f"  • {l}" for l in lines) if lines else "Aucune référence."

def build_prompt(row, profile):
    return f"""Tu es Leman, une IA experte qui analyse des appels d'offres pour des agences d'architecture.

Tu analyses cet appel d'offres POUR L'AGENCE SUIVANTE :

━━━ PROFIL AGENCE ━━━
Nom : {profile.get("name")}
Ville : {profile.get("city")}
CA annuel : {profile.get("annual_revenue")} €
Taille équipe : {profile.get("team_size")} personnes
Pays préférés : {", ".join(profile.get("preferred_countries", []))}
Régions préférées : {", ".join(profile.get("preferred_regions", []))}
Types de projets : {", ".join(profile.get("project_types", []))}
Catégories préférées : {", ".join(profile.get("preferred_categories", []))}
Catégories exclues : {", ".join(profile.get("excluded_categories", []))}
Mots-clés positifs : {", ".join(profile.get("keywords_positive", []))}
Mots-clés négatifs : {", ".join(profile.get("keywords_negative", []))}

Références :
{format_references(profile.get("references", []))}

━━━ APPEL D'OFFRES ━━━
title: {row.get("title")}
buyer_name: {row.get("buyer_name")}
country: {row.get("country")}
category: {row.get("category")}
cpv_code: {row.get("cpv_code")}
publication_date: {row.get("publication_date")}
url: {row.get("url")}
raw_text: {row.get("raw_text")}

━━━ INSTRUCTIONS ━━━
Verdict GO/MAYBE/NO selon si CETTE agence spécifique devrait candidater.
relevance_score 0-100 en utilisant toute la plage (pas 80 par défaut).
- 90-100 = correspondance quasi parfaite
- 70-89 = bonne correspondance  
- 50-69 = partielle
- 30-49 = faible
- 0-29 = pas de correspondance

Retourne UNIQUEMENT ce JSON brut :
{{
  "project_type": null,
  "program": null,
  "location": null,
  "procedure_type": null,
  "main_discipline": null,
  "estimated_scale": null,
  "estimated_budget": null,
  "required_references": [],
  "required_references_count": null,
  "minimum_revenue_required": null,
  "required_certifications": [],
  "consortium_required": null,
  "architect_mandatory": null,
  "relevance_score": 0,
  "verdict": "GO",
  "summary": "2-4 phrases sur pourquoi cette agence devrait ou non candidater",
  "why_it_matters": "1-2 phrases sur l'intérêt stratégique"
}}
"""

def extract_json(text):
    text = text.strip().replace("```json", "").replace("```", "").strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1: raise ValueError("No JSON found")
    return json.loads(text[start:end+1])

def safe_json_list(value):
    return json.dumps(value if isinstance(value, list) else [], ensure_ascii=False)

def analyze_for_profile(df_top, profile):
    user_id = profile.get("user_id", "")
    print(f"\n→ {profile.get('name')} ({user_id[:8] if user_id else 'no-id'}...)")
    results = []
    for i, (_, row) in enumerate(df_top.iterrows(), start=1):
        print(f"  {i}/{len(df_top)} — {str(row.get('title',''))[:60]}")
        normalized = {k: clean_value(row.get(k)) for k in ["source","title","buyer_name","publication_date","publication_number","country","category","priority_bucket","cpv_code","url","raw_text"]}
        try:
            response = client.chat.completions.create(model=MODEL_NAME, messages=[{"role": "user", "content": build_prompt(normalized, profile)}])
            analysis_json = extract_json(response.choices[0].message.content)
        except Exception as e:
            print(f"    Error: {e}")
            analysis_json = {}
        new_row = row.to_dict()
        new_row.update(normalized)
        new_row["user_id"] = user_id
        new_row["project_type"] = analysis_json.get("project_type")
        new_row["program"] = analysis_json.get("program")
        new_row["location"] = analysis_json.get("location")
        new_row["procedure_type"] = analysis_json.get("procedure_type")
        new_row["main_discipline"] = analysis_json.get("main_discipline")
        new_row["estimated_scale"] = analysis_json.get("estimated_scale")
        new_row["estimated_budget"] = analysis_json.get("estimated_budget")
        new_row["required_references"] = safe_json_list(analysis_json.get("required_references"))
        new_row["required_references_count"] = analysis_json.get("required_references_count")
        new_row["minimum_revenue_required"] = analysis_json.get("minimum_revenue_required")
        new_row["required_certifications"] = safe_json_list(analysis_json.get("required_certifications"))
        new_row["consortium_required"] = analysis_json.get("consortium_required")
        new_row["architect_mandatory"] = analysis_json.get("architect_mandatory")
        new_row["relevance_score"] = analysis_json.get("relevance_score")
        new_row["verdict"] = analysis_json.get("verdict")
        new_row["summary"] = analysis_json.get("summary")
        new_row["why_it_matters"] = analysis_json.get("why_it_matters")
        results.append(new_row)
    return results

def main():
    profiles = load_all_profiles()
    print(f"\n{len(profiles)} profil(s) à traiter")

    print("Loading CSV...")
    df = pd.read_csv(INPUT_FILE, low_memory=False)
    print(f"Rows: {len(df)}")

    df["pre_ai_score"] = df.apply(compute_pre_ai_score, axis=1)
    df_top = df.sort_values(by=["pre_ai_score"], ascending=False).head(MAX_ROWS_PER_PROFILE).copy()
    print(f"Top {len(df_top)} annonces sélectionnées")

    all_results = []
    for profile in profiles:
        all_results.extend(analyze_for_profile(df_top, profile))

    out = pd.DataFrame(all_results)
    out.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")
    print(f"\nExport: {OUTPUT_FILE} — {len(out)} lignes ({len(profiles)} profils)")

    if "verdict" in out.columns:
        print("\nVerdicts par profil:")
        for p in profiles:
            uid = p.get("user_id", "")
            subset = out[out["user_id"] == uid] if uid else out
            print(f"  {p.get('name')}: {dict(subset['verdict'].value_counts())}")

    print("Step 4 completed.")

if __name__ == "__main__":
    main()