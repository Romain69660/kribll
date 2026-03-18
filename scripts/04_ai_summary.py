import os
import json
import requests
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

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

client = OpenAI(api_key=OPENAI_API_KEY)

INPUT_FILE  = "data/kribll_results.csv"
OUTPUT_FILE = "data/kribll_agency_feed.csv"

MAX_ROWS   = 50
MODEL_NAME = "gpt-4o-mini"

# -----------------------------------
# Charger le profil agence depuis Supabase
# -----------------------------------

def load_profile_from_supabase():
    """
    Charge le premier profil agence depuis Supabase.
    À terme ce sera par user_id — pour l'instant on prend le plus récent.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("SUPABASE_URL/KEY manquants — fallback sur agency_profile.json")
        return load_profile_from_file()

    try:
        url = f"{SUPABASE_URL}/rest/v1/agency_profiles"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        }
        params = {
            "order": "created_at.desc",
            "limit": "1",
        }
        resp = requests.get(url, headers=headers, params=params, timeout=15)

        if resp.status_code != 200:
            print(f"Supabase error {resp.status_code} — fallback sur agency_profile.json")
            return load_profile_from_file()

        profiles = resp.json()
        if not profiles:
            print("Aucun profil dans Supabase — fallback sur agency_profile.json")
            return load_profile_from_file()

        profile = profiles[0]
        print(f"Profil chargé depuis Supabase : {profile.get('name', 'Inconnu')} ({profile.get('city', '')})")
        return normalize_supabase_profile(profile)

    except Exception as e:
        print(f"Erreur Supabase : {e} — fallback sur agency_profile.json")
        return load_profile_from_file()


def normalize_supabase_profile(p):
    """
    Convertit le profil Supabase au format attendu par le prompt Leman.
    """
    # Convertir annual_revenue string en nombre
    revenue_map = {
        "<300k":     250000,
        "300k-600k": 450000,
        "600k-1.5M": 1000000,
        "1.5M-5M":   3000000,
        "5M+":       7000000,
    }
    annual_revenue = revenue_map.get(p.get("annual_revenue", ""), 500000)

    # Convertir team_size string en nombre
    team_map = {
        "1-5":   3,
        "6-15":  10,
        "16-50": 30,
        "50+":   75,
    }
    team_size = team_map.get(p.get("team_size", ""), 10)

    # Références
    raw_refs = p.get("agency_references") or []
    if isinstance(raw_refs, str):
        try:
            raw_refs = json.loads(raw_refs)
        except Exception:
            raw_refs = []

    references = []
    for r in raw_refs:
        if isinstance(r, dict):
            references.append({
                "type":     r.get("type", ""),
                "location": r.get("location", ""),
                "year":     r.get("year", ""),
                "amount":   r.get("amount", ""),
            })

    return {
        "name":                  p.get("name", "Agence inconnue"),
        "city":                  p.get("city", ""),
        "team_size":             team_size,
        "annual_revenue":        annual_revenue,
        "preferred_countries":   p.get("preferred_countries") or ["FR"],
        "preferred_regions":     p.get("preferred_regions") or [],
        "project_types":         p.get("project_types") or [],
        "preferred_categories":  p.get("preferred_categories") or [],
        "excluded_categories":   p.get("excluded_categories") or [],
        "keywords_positive":     p.get("keywords_positive") or [],
        "keywords_negative":     p.get("keywords_negative") or [],
        "references":            references,
    }


def load_profile_from_file():
    """
    Fallback : charge le profil depuis data/agency_profile.json
    """
    profile_path = os.path.join("data", "agency_profile.json")
    if os.path.exists(profile_path):
        with open(profile_path, "r", encoding="utf-8") as f:
            profile = json.load(f)
        print(f"Profil chargé depuis fichier : {profile.get('name', 'Inconnu')}")
        return profile
    print("Aucun profil trouvé — utilisation d'un profil vide")
    return {"name": "Agence générique", "annual_revenue": 500000, "references": []}


# -----------------------------------
# Helpers
# -----------------------------------

def clean_value(value):
    if pd.isna(value):
        return ""
    return str(value).strip()


def compute_pre_ai_score(row):
    score = 0
    category = clean_value(row.get("category")).upper()
    bucket   = clean_value(row.get("priority_bucket")).upper()
    source   = clean_value(row.get("source")).upper()
    title    = clean_value(row.get("title")).lower()
    raw_text = clean_value(row.get("raw_text")).lower()
    cpv_code = clean_value(row.get("cpv_code"))
    text     = f"{title} {raw_text} {cpv_code}".lower()

    if bucket == "CORE":       score += 20
    elif bucket == "SECONDARY": score += 8

    if category == "ARCHITECTURE_BUILDING":  score += 20
    elif category == "URBANISM_LANDSCAPE":   score += 18
    elif category == "COMPETITIONS":         score += 16
    elif category == "AMO_PROGRAMMING":      score += 12
    elif category == "SURVEY_TOPO":          score += 6
    elif category == "ENGINEERING":          score += 2

    if source == "BOAMP": score += 4
    elif source == "TED":  score += 2

    strong_terms = [
        "maîtrise d'œuvre", "maitrise d'oeuvre", "architect",
        "architecture", "urbanisme", "urban planning", "paysage",
        "concours", "zac", "réhabilitation", "rehabilitation",
        "construction", "logements", "college", "école", "ecole",
        "gymnase", "patrimoine", "aménagement", "amenagement",
    ]
    for term in strong_terms:
        if term in text:
            score += 3

    negative_terms = ["sewage", "waste", "refuse", "cleaning", "maintenance",
                      "water treatment", "dechets", "ordures"]
    for term in negative_terms:
        if term in text:
            score -= 8

    if clean_value(row.get("title")):      score += 5
    if clean_value(row.get("buyer_name")): score += 3

    return score


def format_references(refs):
    if not refs:
        return "Aucune référence renseignée."
    lines = []
    for r in refs:
        if isinstance(r, dict):
            parts = []
            if r.get("type"):     parts.append(r["type"])
            if r.get("location"): parts.append(r["location"])
            if r.get("year"):     parts.append(str(r["year"]))
            if r.get("amount"):   parts.append(r["amount"])
            lines.append(" — ".join(parts))
        elif isinstance(r, str):
            lines.append(r)
    return "\n".join(f"  • {l}" for l in lines)


def build_prompt(row, profile):
    refs_text = format_references(profile.get("references", []))

    return f"""Tu es Leman, une IA experte qui analyse des appels d'offres pour des agences d'architecture, d'urbanisme, de paysage et de maîtrise d'œuvre.

Tu analyses cet appel d'offres POUR L'AGENCE SUIVANTE :

━━━ PROFIL AGENCE ━━━
Nom : {profile.get("name", "")}
Ville : {profile.get("city", "")}
CA annuel : {profile.get("annual_revenue", "")} €
Taille équipe : {profile.get("team_size", "")} personnes
Pays préférés : {", ".join(profile.get("preferred_countries", []))}
Régions préférées : {", ".join(profile.get("preferred_regions", []))}
Types de projets : {", ".join(profile.get("project_types", []))}
Catégories préférées : {", ".join(profile.get("preferred_categories", []))}
Catégories exclues : {", ".join(profile.get("excluded_categories", []))}
Mots-clés positifs : {", ".join(profile.get("keywords_positive", []))}
Mots-clés négatifs : {", ".join(profile.get("keywords_negative", []))}

Références de l'agence :
{refs_text}

━━━ APPEL D'OFFRES ━━━
source: {row.get("source", "")}
publication_number: {row.get("publication_number", "")}
publication_date: {row.get("publication_date", "")}
title: {row.get("title", "")}
buyer_name: {row.get("buyer_name", "")}
country: {row.get("country", "")}
category: {row.get("category", "")}
priority_bucket: {row.get("priority_bucket", "")}
cpv_code: {row.get("cpv_code", "")}
url: {row.get("url", "")}

raw_text:
{row.get("raw_text", "")}

━━━ INSTRUCTIONS ━━━
Retourne STRICTEMENT un JSON avec les champs suivants.

Le verdict GO / MAYBE / NO doit refléter si CETTE agence spécifique devrait candidater :
- GO = l'agence a les références, le CA, et les compétences pour candidater
- MAYBE = l'agence pourrait candidater mais il y a un point à vérifier
- NO = l'agence ne correspond pas ou ne peut pas candidater

Le relevance_score doit utiliser TOUTE la plage 0-100 :
- 90-100 = correspondance quasi parfaite (profil, références, CA, localisation tous alignés)
- 70-89  = bonne correspondance avec quelques points à vérifier
- 50-69  = correspondance partielle, incertitudes importantes
- 30-49  = correspondance faible, un critère bloquant
- 0-29   = pas de correspondance
Ne mets PAS 80 par défaut. Évalue vraiment chaque critère par rapport au profil agence.

Champs à retourner :
project_type, program, location, procedure_type, main_discipline,
estimated_scale (small/medium/large/null), estimated_budget (nombre ou null),
required_references (liste strings), required_references_count (nombre ou null),
minimum_revenue_required (nombre ou null), required_certifications (liste strings),
consortium_required (true/false/null), architect_mandatory (true/false/null),
relevance_score (0-100), verdict (GO/MAYBE/NO),
summary (2-4 phrases expliquant pourquoi cette agence devrait ou non candidater),
why_it_matters (1-2 phrases sur l'intérêt stratégique pour cette agence)

Règles :
- Si une information n'est pas détectable, retourne null
- Retourne uniquement du JSON brut, sans markdown, sans texte avant ni après
"""


def extract_json(text):
    text = text.strip()
    if text.startswith("```"):
        text = text.replace("```json", "").replace("```", "").strip()
    start = text.find("{")
    end   = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("No valid JSON object found in model response")
    return json.loads(text[start:end + 1])


def safe_json_list(value):
    if isinstance(value, list):
        return json.dumps(value, ensure_ascii=False)
    return json.dumps([], ensure_ascii=False)


# -----------------------------------
# Main
# -----------------------------------

def main():
    # Charger le profil depuis Supabase
    profile = load_profile_from_supabase()
    print(f"Profil utilisé : {profile.get('name')} | CA: {profile.get('annual_revenue')}€ | Refs: {len(profile.get('references', []))}")

    print("Loading CSV...")
    df = pd.read_csv(INPUT_FILE, low_memory=False)
    print("Rows loaded:", len(df))

    # Pre-rank
    df["pre_ai_score"] = df.apply(compute_pre_ai_score, axis=1)
    df = df.sort_values(by=["pre_ai_score"], ascending=False).head(MAX_ROWS).copy()

    print("Rows selected for AI:", len(df))
    print("Top pre_ai_score preview:")
    print(df[["title", "source", "category", "priority_bucket", "pre_ai_score"]].head(5).to_string(index=False))

    results = []

    for i, (_, row) in enumerate(df.iterrows(), start=1):
        print(f"Analyzing {i}/{len(df)} — {row.get('title', '')[:60]}")

        normalized = {
            "source":             clean_value(row.get("source")),
            "title":              clean_value(row.get("title")),
            "buyer_name":         clean_value(row.get("buyer_name")),
            "publication_date":   clean_value(row.get("publication_date")),
            "publication_number": clean_value(row.get("publication_number")),
            "country":            clean_value(row.get("country")),
            "category":           clean_value(row.get("category")),
            "priority_bucket":    clean_value(row.get("priority_bucket")),
            "cpv_code":           clean_value(row.get("cpv_code")),
            "url":                clean_value(row.get("url")),
            "raw_text":           clean_value(row.get("raw_text")),
        }

        try:
            prompt   = build_prompt(normalized, profile)
            response = client.chat.completions.create(
                model=MODEL_NAME,
                messages=[{"role": "user", "content": prompt}]
            )
            analysis_text = response.choices[0].message.content
            analysis_json = extract_json(analysis_text)
        except Exception as e:
            print(f"  Error: {e}")
            analysis_text = "ERROR"
            analysis_json = {}

        new_row = row.to_dict()
        new_row.update(normalized)
        new_row["leman_analysis"]           = analysis_text
        new_row["project_type"]             = analysis_json.get("project_type")
        new_row["program"]                  = analysis_json.get("program")
        new_row["location"]                 = analysis_json.get("location")
        new_row["procedure_type"]           = analysis_json.get("procedure_type")
        new_row["main_discipline"]          = analysis_json.get("main_discipline")
        new_row["estimated_scale"]          = analysis_json.get("estimated_scale")
        new_row["estimated_budget"]         = analysis_json.get("estimated_budget")
        new_row["required_references"]      = safe_json_list(analysis_json.get("required_references"))
        new_row["required_references_count"]= analysis_json.get("required_references_count")
        new_row["minimum_revenue_required"] = analysis_json.get("minimum_revenue_required")
        new_row["required_certifications"]  = safe_json_list(analysis_json.get("required_certifications"))
        new_row["consortium_required"]      = analysis_json.get("consortium_required")
        new_row["architect_mandatory"]      = analysis_json.get("architect_mandatory")
        new_row["relevance_score"]          = analysis_json.get("relevance_score")
        new_row["verdict"]                  = analysis_json.get("verdict")
        new_row["summary"]                  = analysis_json.get("summary")
        new_row["why_it_matters"]           = analysis_json.get("why_it_matters")

        results.append(new_row)

    out = pd.DataFrame(results)
    if "pre_ai_score" in out.columns:
        out = out.sort_values(by=["pre_ai_score"], ascending=False)

    out.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")

    print()
    print("Export completed:", OUTPUT_FILE)
    print("Rows exported:", len(out))

    # Afficher distribution des scores
    if "relevance_score" in out.columns:
        scores = pd.to_numeric(out["relevance_score"], errors="coerce").dropna()
        print(f"Relevance scores — min: {scores.min():.0f} | max: {scores.max():.0f} | mean: {scores.mean():.1f}")

    if "verdict" in out.columns:
        print("Verdicts:")
        print(out["verdict"].value_counts(dropna=False).to_string())

    print("Step 4 completed: kribll_agency_feed.csv generated")


if __name__ == "__main__":
    main()