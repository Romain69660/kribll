"""
KRIBLL — 01 BOAMP SCRAPER v7
Pagination complète + filtre strict + catégorisation métier
+ extraction enrichie du champ donnees (eForms UBL)
+ date limite de réponse + URL plateforme acheteur
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
print("KRIBLL — 01 BOAMP SCRAPER v7")
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
    text = text.replace("'", " ").replace("'", " ")
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

# -----------------------------------
# Extraction enrichie du champ donnees
# -----------------------------------

# Clés textuelles à extraire en priorité depuis le JSON eForms
TEXT_KEYS = {
    "#text", "description", "Description",
    "intitule", "titreMarche", "Name", "Title",
    "cbc:Description", "cbc:Name",
    "cbc:Note",
}

# Clés à ignorer (URIs, codes, IDs techniques)
SKIP_KEYS = {
    "uri", "url", "href", "id", "code",
    "@listName", "@schemeID", "@languageID", "@schemeName",
    "cbc:ID", "cbc:CustomizationID", "cbc:UBLVersionID",
    "cbc:VersionID", "cbc:RegulatoryDomain",
}

def extract_text_from_donnees(donnees_raw):
    """
    Extrait tout le contenu textuel utile du champ donnees (JSON eForms UBL).
    Retourne une chaîne de texte enrichie pour Leman.
    """
    donnees = parse_json_recursive(donnees_raw)
    parts = []

    def walk(obj, depth=0):
        if depth > 12:
            return
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k in SKIP_KEYS:
                    continue
                if k in TEXT_KEYS:
                    if isinstance(v, str) and len(v.strip()) > 8:
                        parts.append(v.strip())
                    elif isinstance(v, dict) and "#text" in v:
                        text = v["#text"]
                        if isinstance(text, str) and len(text.strip()) > 8:
                            parts.append(text.strip())
                elif isinstance(v, (dict, list)):
                    walk(v, depth + 1)
                elif isinstance(v, str):
                    # Garder les strings longues qui ressemblent à du texte naturel
                    v = v.strip()
                    if (
                        len(v) > 40
                        and not v.startswith("http")
                        and not re.match(r"^[\d\-/+:\.]+$", v)
                        and not re.match(r"^[A-Z0-9\-]{5,}$", v)
                    ):
                        parts.append(v)
        elif isinstance(obj, list):
            for item in obj:
                walk(item, depth + 1)

    walk(donnees)

    # Déduplication en conservant l'ordre
    seen = set()
    unique_parts = []
    for p in parts:
        p_norm = p.lower().strip()
        if p_norm not in seen and len(p_norm) > 8:
            seen.add(p_norm)
            unique_parts.append(p)

    return " | ".join(unique_parts)


def extract_buyer_profile_uri(donnees_raw):
    """
    Extrait l'URL de la plateforme acheteur (BuyerProfileURI) depuis donnees.
    C'est là que sont hébergés les PDFs du DCE.
    """
    donnees = parse_json_recursive(donnees_raw)

    def walk(obj):
        if isinstance(obj, dict):
            # Chercher BuyerProfileURI directement
            if "cbc:BuyerProfileURI" in obj:
                val = obj["cbc:BuyerProfileURI"]
                if isinstance(val, str) and val.startswith("http"):
                    return val
            for v in obj.values():
                result = walk(v)
                if result:
                    return result
        elif isinstance(obj, list):
            for item in obj:
                result = walk(item)
                if result:
                    return result
        return None

    return walk(donnees) or ""


def extract_deadline(rec):
    """
    Extrait la date limite de réponse depuis datelimitereponse ou donnees.
    """
    # Champ direct de l'API
    deadline = rec.get("datelimitereponse", "")
    if deadline:
        return str(deadline)[:10]  # Format YYYY-MM-DD

    # Fallback dans donnees
    donnees = parse_json_recursive(rec.get("donnees"))

    def walk(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if "EndDate" in k or "DueDate" in k or "deadline" in k.lower():
                    if isinstance(v, str) and len(v) >= 10:
                        return v[:10]
                result = walk(v)
                if result:
                    return result
        elif isinstance(obj, list):
            for item in obj:
                result = walk(item)
                if result:
                    return result
        return None

    return walk(donnees) or ""


def extract_department(rec):
    """
    Extrait le département depuis code_departement ou le code NUTS dans donnees.
    """
    dept = rec.get("code_departement")
    if dept:
        depts = ensure_list(dept)
        return " | ".join([str(d) for d in depts if d])

    # Fallback NUTS dans donnees
    donnees = parse_json_recursive(rec.get("donnees"))

    def walk(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k == "cbc:CountrySubentityCode" or (k == "@listName" and v == "nuts"):
                    pass
                if isinstance(v, dict):
                    if v.get("@listName") == "nuts" and "#text" in v:
                        return v["#text"]
                result = walk(v)
                if result:
                    return result
        elif isinstance(obj, list):
            for item in obj:
                result = walk(item)
                if result:
                    return result
        return None

    return walk(donnees) or ""


def build_text_blob(rec):
    """
    Construit le texte complet pour le filtrage et l'analyse IA.
    Combine : titre, descripteurs, résumé, et extraction enrichie de donnees.
    """
    parts = []

    # Champs directs
    for field in ["objet", "nomacheteur", "famille_libelle", "procedure_libelle"]:
        if rec.get(field):
            parts.append(str(rec[field]))

    # Résumé depuis gestion
    gestion = parse_json_recursive(rec.get("gestion"))
    idx = gestion.get("INDEXATION", {}) if isinstance(gestion, dict) else {}
    if idx.get("RESUME_OBJET"):
        parts.append(str(idx["RESUME_OBJET"]))

    # Descripteurs
    descripteurs = rec.get("descripteur_libelle")
    if descripteurs:
        parts.extend([str(x) for x in ensure_list(descripteurs)])

    # Extraction enrichie depuis donnees
    donnees_text = extract_text_from_donnees(rec.get("donnees", ""))
    if donnees_text:
        parts.append(donnees_text)

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

# -----------------------------------
# Scoring
# -----------------------------------

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
    session.headers["User-Agent"] = "Kribll-BOAMP-V7/1.0"

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
    """
    Construit la ligne CSV finale avec tous les champs enrichis.
    Nouveaux champs v7 : raw_text_enrichi, deadline, buyer_profile_uri, departement
    """
    # Extraction des nouvelles données enrichies
    donnees_raw = rec.get("donnees", "")
    donnees_text = extract_text_from_donnees(donnees_raw)
    buyer_profile_uri = extract_buyer_profile_uri(donnees_raw)
    deadline = extract_deadline(rec)
    departement = extract_department(rec)

    # raw_text enrichi = tout ce qu'on a
    raw_text_parts = [
        str(rec.get("objet", "")),
        donnees_text,
    ]
    raw_text = " | ".join([p for p in raw_text_parts if p.strip()])

    return {
        "decision": decision,
        "priority_bucket": priority_bucket,
        "category": category,
        "score": score,
        "titre": rec.get("objet"),
        "acheteur": rec.get("nomacheteur"),
        "date_publication": rec.get("dateparution"),
        "date_limite": deadline,
        "nature": nature,
        "type_marche": type_marche,
        "descripteurs": " | ".join(ensure_list(rec.get("descripteur_libelle"))),
        "cpv_codes": " | ".join(cpvs),
        "departement": departement,
        "url": rec.get("url_avis", f"https://www.boamp.fr/pages/avis/?q=idweb:{rec.get('idweb', '')}"),
        "buyer_profile_uri": buyer_profile_uri,
        "raw_text": raw_text,
        "why": " | ".join(reasons[:10]),
        "idweb": rec.get("idweb"),
    }


# -----------------------------------
# Main
# -----------------------------------

def main():
    print("====================================")
    print("KRIBLL BOAMP V7 — EXTRACTION ENRICHIE")
    print("====================================")

    records, total = fetch_all_records()
    print(f"\nRetrieved {len(records)} records (API total: {total})")

    kept = []
    decision_counts = Counter()
    category_counts = Counter()
    priority_counts = Counter()
    enriched_count = 0

    for rec in records:
        keep, decision, score, reasons, cpvs, nature, type_marche, text = classify(rec)
        decision_counts[decision] += 1

        if keep:
            category, priority_bucket = categorize(rec, cpvs, text)
            category_counts[category] += 1
            priority_counts[priority_bucket] += 1

            row = row_from_record(
                rec, decision, score, reasons, cpvs,
                nature, type_marche, category, priority_bucket
            )

            # Compter les annonces avec donnees enrichies
            if row.get("buyer_profile_uri"):
                enriched_count += 1

            kept.append(row)

    order = {"KEEP_HIGH": 0, "KEEP_MEDIUM": 1, "REVIEW": 2}
    kept.sort(key=lambda r: (order.get(r["decision"], 9), -r["score"]))

    print(f"\n{'─'*62}")
    print(f"Kept              : {len(kept)}")
    print(f"KEEP_HIGH         : {decision_counts['KEEP_HIGH']}")
    print(f"KEEP_MEDIUM       : {decision_counts['KEEP_MEDIUM']}")
    print(f"REVIEW            : {decision_counts['REVIEW']}")
    print(f"EXCLUDE           : {decision_counts['EXCLUDE']}")
    print(f"With buyer URI    : {enriched_count}")
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

    # Afficher exemple d'enrichissement
    print("\nExemple enrichissement (première annonce avec buyer_profile_uri):")
    for r in kept[:20]:
        if r.get("buyer_profile_uri"):
            print(f"  Titre        : {r['titre']}")
            print(f"  Plateforme   : {r['buyer_profile_uri']}")
            print(f"  Date limite  : {r['date_limite']}")
            print(f"  Département  : {r['departement']}")
            raw_preview = str(r.get("raw_text", ""))[:300]
            print(f"  Raw text     : {raw_preview}...")
            break

    print("\nTop 10 kept announcements:\n")
    for i, r in enumerate(kept[:10], 1):
        print(f"{i}. [{r['decision']} | {r['score']}] {r['titre']}")
        print(f"   Category : {r['category']} | Bucket : {r['priority_bucket']}")
        print(f"   Buyer    : {r['acheteur']}")
        print(f"   Deadline : {r['date_limite']}")
        print(f"   Platform : {r['buyer_profile_uri'] or 'N/A'}")
        print(f"   Dept     : {r['departement']} | CPV : {r['cpv_codes']}")
        print(f"   Why      : {r['why']}\n")

    df = pd.DataFrame(kept)
    df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")

    print(f"CSV exported: {OUTPUT_FILE} ({len(df)} rows)")

    # Stats enrichissement
    if "buyer_profile_uri" in df.columns:
        uri_count = (df["buyer_profile_uri"].fillna("") != "").sum()
        print(f"Annonces avec URL plateforme acheteur : {uri_count}/{len(df)}")
    if "date_limite" in df.columns:
        deadline_count = (df["date_limite"].fillna("") != "").sum()
        print(f"Annonces avec date limite             : {deadline_count}/{len(df)}")

    print("\nDone.\n")


if __name__ == "__main__":
    main()