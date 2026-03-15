"""
KRIBLL — 01 BOAMP SCRAPER
Pagination complète + filtre strict + catégorisation métier
"""

import os
import json
import re
import unicodedata
from collections import Counter
from datetime import datetime, timedelta, timezone

import pandas as pd
import requests

print("====================================")
print("KRIBLL — 01 BOAMP SCRAPER")
print("====================================")

# -----------------------------------
# Paths
# -----------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "kribll_boamp_v6.csv")

# -----------------------------------
# BOAMP API config
# -----------------------------------

API_BASE = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp/records"

DAYS_BACK = 45
PAGE_SIZE = 100
MAX_PAGES = 50  # 5000 résultats max

QUERY = (
    "architecture OR architecte OR urbanisme OR geometre OR topographie "
    "OR ingenierie OR etude OR concours OR amenagement OR programmation OR amo"
)

STRONG_CPV_PREFIXES = {"71000000", "712", "714"}
MEDIUM_CPV_PREFIXES = {"713", "715"}

POSITIVE_STRONG = [
    "maitrise d oeuvre",
    "maitre d oeuvre",
    "mission de maitrise d oeuvre",
    "architecte",
    "architecte d interieur",
    "architecture",
    "assistance a maitrise d ouvrage",
    " amo ",
    "urbanisme",
    "concours d architecture",
    "concours architecture",
    "concours de maitrise d oeuvre",
    "programmation architecturale",
    "programmation urbaine",
]

POSITIVE_MEDIUM = [
    "rehabilitation",
    "amenagement",
    "espace public",
    "topographique",
    "topographie",
    "geometre",
    "geometre expert",
    "etude de faisabilite",
    "etude",
    "ingenierie",
    "paysage",
    "paysagiste",
    "amenagement urbain",
    "zac",
    "batimentaire",
    "signaletique",
    "interieur",
    "mobilites",
    "mobilite",
]

NEGATIVE_STRONG = [
    "fourniture",
    "fournitures",
    "materiel",
    "maintenance",
    "entretien",
    "nettoyage",
    "gardiennage",
    "audiovisuel",
    "video",
    "cinema",
    "signalisation",
    "carburant",
    "hydrocarbure",
    "informatique",
    "logiciel",
    "tma",
    "dechets",
    "collecte",
    "sonorisation",
    "scenique",
    "photovoltaique",
    "ventilation",
    "serrurerie",
    "etancheite",
    "terrassement",
    "cheque cadeau",
    "cistude",
    "crapaud",
    "faune",
    "biodiversite",
    "plan national d actions",
    "animation du plan",
]

NEGATIVE_MEDIUM = [
    "location de materiel",
    "mise a disposition de personnel",
    "evenementiel",
    "communication",
    "accompagnement",
    "plan national",
    "animation",
]

EXCLUDED_NATURES = {"ATTRIBUTION", "RECTIFICATIF"}
PREFERRED_NATURE = "APPEL_OFFRE"
PREFERRED_TYPE = "SERVICES"

# -----------------------------------
# Helpers
# -----------------------------------

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

def parse_json_recursive(raw):
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return parse_json_recursive(json.loads(raw))
        except Exception:
            return {}
    return {}

def ensure_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]

def first_type_marche(rec):
    tm = rec.get("type_marche")
    if isinstance(tm, list) and tm:
        return str(tm[0]).upper()
    if isinstance(tm, str):
        return tm.upper()
    return ""

def nature_value(rec):
    return str(rec.get("nature", "")).upper()

def build_text_blob(rec):
    parts = []

    for field in ["objet", "nomacheteur", "famille_libelle", "procedure_libelle"]:
        if rec.get(field):
            parts.append(str(rec[field]))

    gestion = parse_json_recursive(rec.get("gestion"))
    idx = gestion.get("INDEXATION", {}) if isinstance(gestion, dict) else {}

    if idx.get("RESUME_OBJET"):
        parts.append(str(idx["RESUME_OBJET"]))

    descripteurs = rec.get("descripteur_libelle")
    if descripteurs:
        parts.extend([str(x) for x in ensure_list(descripteurs)])

    donnees = parse_json_recursive(rec.get("donnees"))

    def walk(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, (dict, list)):
                    walk(v)
                else:
                    if k in {
                        "#text",
                        "description",
                        "Description",
                        "intitule",
                        "titreMarche",
                        "Name",
                        "Title",
                        "cbc:Description",
                        "cbc:Name",
                    }:
                        parts.append(str(v))
        elif isinstance(obj, list):
            for item in obj:
                walk(item)

    walk(donnees)
    return f" {normalize(' '.join(parts))} "

def extract_cpvs(rec):
    cpvs = set()
    donnees = parse_json_recursive(rec.get("donnees"))

    def walk(obj):
        if isinstance(obj, dict):
            for key, value in obj.items():
                if key == "cbc:ItemClassificationCode" and isinstance(value, dict):
                    if value.get("@listName") == "cpv" and "#text" in value:
                        cpvs.add(str(value["#text"]))
                elif key == "classPrincipale" and isinstance(value, str):
                    cpvs.add(value)
                else:
                    walk(value)
        elif isinstance(obj, list):
            for item in obj:
                walk(item)

    walk(donnees)
    return sorted(cpvs)

def cpv_score(cpvs):
    score = 0
    reasons = []
    strong_archi = False
    medium_archi = False

    for cpv in cpvs:
        if cpv == "71000000":
            score += 10
            reasons.append(f"CPV fort {cpv}")
            strong_archi = True
        elif any(cpv.startswith(prefix) for prefix in STRONG_CPV_PREFIXES if prefix != "71000000"):
            score += 8
            reasons.append(f"CPV archi {cpv}")
            strong_archi = True
        elif any(cpv.startswith(prefix) for prefix in MEDIUM_CPV_PREFIXES):
            score += 3
            reasons.append(f"CPV secondaire {cpv}")
            medium_archi = True

        if cpv.startswith("323"):
            score -= 10
            reasons.append(f"CPV parasite {cpv}")
        if cpv.startswith("905"):
            score -= 10
            reasons.append(f"CPV parasite {cpv}")
        if cpv.startswith("0933"):
            score -= 8
            reasons.append(f"CPV parasite {cpv}")
        if cpv.startswith("452"):
            score -= 6
            reasons.append(f"CPV travaux {cpv}")
        if cpv.startswith("505"):
            score -= 8
            reasons.append(f"CPV maintenance {cpv}")
        if cpv.startswith("488") or cpv.startswith("722") or cpv.startswith("725"):
            score -= 8
            reasons.append(f"CPV informatique {cpv}")

    return score, reasons, strong_archi, medium_archi

def phrase_score(text, phrases, weight, label):
    score = 0
    reasons = []
    hits = 0
    for p in phrases:
        if p in text:
            score += weight
            reasons.append(f"{label}: {p}")
            hits += 1
    return score, reasons, hits

def classify(rec):
    nature = nature_value(rec)
    type_marche = first_type_marche(rec)
    cpvs = extract_cpvs(rec)
    text = build_text_blob(rec)

    score = 0
    reasons = []

    if nature in EXCLUDED_NATURES:
        return False, "EXCLUDE", -999, reasons + ["nature exclue"], cpvs, nature, type_marche, text

    if nature == PREFERRED_NATURE:
        score += 4
        reasons.append("nature APPEL_OFFRE")
    else:
        score -= 5
        reasons.append(f"nature non ideale: {nature}")

    if type_marche == "FOURNITURES":
        return False, "EXCLUDE", -999, reasons + ["type FOURNITURES"], cpvs, nature, type_marche, text

    if type_marche == "TRAVAUX":
        score -= 8
        reasons.append("type TRAVAUX")
    elif type_marche == PREFERRED_TYPE:
        score += 4
        reasons.append("type SERVICES")

    cs, cr, strong_archi_cpv, medium_archi_cpv = cpv_score(cpvs)
    score += cs
    reasons.extend(cr)

    s1, r1, pos_strong_hits = phrase_score(text, POSITIVE_STRONG, 5, "+ fort")
    s2, r2, pos_medium_hits = phrase_score(text, POSITIVE_MEDIUM, 2, "+ moyen")
    n1, nr1, neg_strong_hits = phrase_score(text, NEGATIVE_STRONG, -7, "- fort")
    n2, nr2, neg_medium_hits = phrase_score(text, NEGATIVE_MEDIUM, -3, "- moyen")

    score += s1 + s2 + n1 + n2
    reasons.extend(r1 + r2 + nr1 + nr2)

    strong_archi_signal = strong_archi_cpv or pos_strong_hits > 0
    medium_archi_signal = medium_archi_cpv or pos_medium_hits >= 2

    if neg_strong_hits >= 1 and not strong_archi_signal and not strong_archi_cpv:
        return False, "EXCLUDE", score, reasons + ["parasite fort sans signal archi"], cpvs, nature, type_marche, text

    if type_marche == "TRAVAUX" and not strong_archi_signal and not strong_archi_cpv:
        return False, "EXCLUDE", score, reasons + ["travaux purs sans signal de conception"], cpvs, nature, type_marche, text

    if not cpvs and not strong_archi_signal and pos_medium_hits < 2:
        return False, "EXCLUDE", score, reasons + ["aucun CPV et signal texte trop faible"], cpvs, nature, type_marche, text

    if not strong_archi_signal and not strong_archi_cpv and neg_medium_hits >= 2:
        return False, "EXCLUDE", score, reasons + ["profil trop flou service generique"], cpvs, nature, type_marche, text

    if score >= 14:
        return True, "KEEP_HIGH", score, reasons, cpvs, nature, type_marche, text
    if score >= 8 and (strong_archi_signal or strong_archi_cpv or medium_archi_signal):
        return True, "KEEP_MEDIUM", score, reasons, cpvs, nature, type_marche, text
    if score >= 5 and strong_archi_signal:
        return True, "REVIEW", score, reasons, cpvs, nature, type_marche, text

    return False, "EXCLUDE", score, reasons, cpvs, nature, type_marche, text

def categorize(rec, cpvs, text):
    title = normalize(rec.get("objet", ""))

    if "concours" in text or "concours" in title:
        return "COMPETITIONS", "CORE"

    if (
        any(cpv.startswith("7122") or cpv.startswith("7124") or cpv == "71000000" or cpv.startswith("7120") for cpv in cpvs)
        and (
            "maitrise d oeuvre" in text
            or "architecte" in text
            or "batiment" in text
            or "reconstruction" in text
            or "rehabilitation" in text
            or "equipement" in text
            or "ecole" in text
            or "ehpad" in text
            or "gymnase" in text
        )
    ):
        return "ARCHITECTURE_BUILDING", "CORE"

    if (
        any(cpv.startswith("714") or cpv.startswith("71222") for cpv in cpvs)
        or "urbanisme" in text
        or "zac" in text
        or "espace public" in text
        or "amenagement urbain" in text
        or "paysage" in text
        or "paysagiste" in text
        or "mobilite" in text
    ):
        return "URBANISM_LANDSCAPE", "CORE"

    if (
        "assistance a maitrise d ouvrage" in text
        or " amo " in text
        or "programmation" in text
        or any(cpv.startswith("71241") for cpv in cpvs)
    ):
        return "AMO_PROGRAMMING", "CORE"

    if (
        "geometre" in text
        or "topographie" in text
        or "topographique" in text
        or any(cpv.startswith("713518") or cpv.startswith("71250") for cpv in cpvs)
    ):
        return "SURVEY_TOPO", "SECONDARY"

    if (
        any(cpv.startswith("713") or cpv.startswith("715") for cpv in cpvs)
        or "ingenierie" in text
        or "etude de faisabilite" in text
        or "etude" in text
    ):
        return "ENGINEERING", "SECONDARY"

    return "OTHER_RELEVANT", "SECONDARY"

def fetch_all_records():
    since = (datetime.now(timezone.utc) - timedelta(days=DAYS_BACK)).strftime("%Y-%m-%d")

    session = requests.Session()
    session.headers["User-Agent"] = "Kribll-BOAMP-V6/1.0"

    all_records = []
    total_count = None

    print("Connecting to BOAMP API...")
    print(f"Query     : {QUERY}")
    print(f"Since     : {since}")
    print(f"Page size : {PAGE_SIZE}")

    for page in range(MAX_PAGES):
        offset = page * PAGE_SIZE
        params = {
            "q": QUERY,
            "where": f'dateparution >= "{since}"',
            "order_by": "dateparution DESC",
            "limit": PAGE_SIZE,
            "offset": offset,
        }

        resp = session.get(API_BASE, params=params, timeout=30)

        if resp.status_code != 200:
            print(f"\nBOAMP API error on page {page + 1}: {resp.status_code}")
            print(resp.text[:1000])
            resp.raise_for_status()

        data = resp.json()

        if total_count is None:
            total_count = data.get("total_count", 0)

        results = data.get("results", [])
        print(f"Page {page + 1}: {len(results)} results (offset={offset})")

        if not results:
            break

        all_records.extend(results)

        if len(results) < PAGE_SIZE:
            break

        if len(all_records) >= total_count:
            break

    return all_records, total_count or 0

def row_from_record(rec, decision, score, reasons, cpvs, nature, type_marche, category, priority_bucket):
    return {
        "decision": decision,
        "priority_bucket": priority_bucket,
        "category": category,
        "score": score,
        "titre": rec.get("objet"),
        "acheteur": rec.get("nomacheteur"),
        "date_publication": rec.get("dateparution"),
        "date_limite": rec.get("datelimitereponse"),
        "nature": nature,
        "type_marche": type_marche,
        "descripteurs": " | ".join(ensure_list(rec.get("descripteur_libelle"))),
        "cpv_codes": " | ".join(cpvs),
        "departement": " | ".join([str(x) for x in ensure_list(rec.get("code_departement"))]),
        "url": rec.get("url_avis", f"https://www.boamp.fr/pages/avis/?q=idweb:{rec.get('idweb', '')}"),
        "why": " | ".join(reasons[:10]),
        "idweb": rec.get("idweb"),
    }

# -----------------------------------
# Main
# -----------------------------------

def main():
    print("====================================")
    print("KRIBLL BOAMP V6 — CATEGORISATION METIER")
    print("====================================")

    records, total = fetch_all_records()
    print(f"\nRetrieved {len(records)} records (API total: {total})")

    kept = []
    decision_counts = Counter()
    category_counts = Counter()
    priority_counts = Counter()

    for rec in records:
        keep, decision, score, reasons, cpvs, nature, type_marche, text = classify(rec)
        decision_counts[decision] += 1

        if keep:
            category, priority_bucket = categorize(rec, cpvs, text)
            category_counts[category] += 1
            priority_counts[priority_bucket] += 1

            kept.append(
                row_from_record(
                    rec,
                    decision,
                    score,
                    reasons,
                    cpvs,
                    nature,
                    type_marche,
                    category,
                    priority_bucket,
                )
            )

    order = {"KEEP_HIGH": 0, "KEEP_MEDIUM": 1, "REVIEW": 2}
    kept.sort(key=lambda r: (order.get(r["decision"], 9), -r["score"]))

    print(f"\n{'─'*62}")
    print(f"Kept         : {len(kept)}")
    print(f"KEEP_HIGH    : {decision_counts['KEEP_HIGH']}")
    print(f"KEEP_MEDIUM  : {decision_counts['KEEP_MEDIUM']}")
    print(f"REVIEW       : {decision_counts['REVIEW']}")
    print(f"EXCLUDE      : {decision_counts['EXCLUDE']}")
    print(f"{'─'*62}")

    print("\nCategory distribution:")
    for cat, count in category_counts.most_common():
        print(f"  {cat:<22} {count}")

    print("\nPriority distribution:")
    for bucket, count in priority_counts.most_common():
        print(f"  {bucket:<10} {count}")

    if not kept:
        print("\nNo announcements kept.")
        return

    print("\nTop 10 kept announcements:\n")
    for i, r in enumerate(kept[:10], 1):
        print(f"{i}. [{r['decision']} | {r['score']}] {r['titre']}")
        print(f"   Category : {r['category']} | Bucket : {r['priority_bucket']}")
        print(f"   Buyer    : {r['acheteur']}")
        print(f"   Nature   : {r['nature']} | Type : {r['type_marche']}")
        print(f"   Dept     : {r['departement']} | Deadline : {r['date_limite']}")
        print(f"   CPV      : {r['cpv_codes']}")
        print(f"   Why      : {r['why']}")
        print(f"   URL      : {r['url']}\n")

    df = pd.DataFrame(kept)
    df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")

    print(f"CSV exported: {OUTPUT_FILE} ({len(df)} rows)")
    print("\nDone.\n")

if __name__ == "__main__":
    main()