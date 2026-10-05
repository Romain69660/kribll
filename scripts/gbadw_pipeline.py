"""
KRIBBL — Pipeline GBADW (mono-client GIL BARTOLOME ADW)

Étapes :
  1. BOAMP  : avis dont la date limite de réponse n'est pas passée
  2. TED    : avis France, CPV de conception, date limite non passée
  3. Préfiltre déterministe : live + mission de conception + secteur
     (transport / industriel et maintenance / santé) + type de contrat
     (la conception-réalisation est gardée mais marquée DESIGN-AND-BUILD)
  4. Leman  : verdict GO / MAYBE / NO sur le texte complet de l'avis
  5. Sorties: data/gbadw_feed.csv, data/gbadw_rundown.md (récap pour Pablo),
              résumé GitHub Actions, upload Supabase

Usage local :
  python scripts/gbadw_pipeline.py                  # tout
  python scripts/gbadw_pipeline.py --no-ai          # préfiltre seulement
  python scripts/gbadw_pipeline.py --no-upload      # sans Supabase
  python scripts/gbadw_pipeline.py --source boamp   # une seule source

Variables d'environnement :
  OPENAI_API_KEY   (requis sauf --no-ai)
  LEMAN_MODEL      (défaut gpt-4o)
  SUPABASE_URL, SUPABASE_KEY
  GBADW_USER_ID    user_id Supabase du compte qui doit voir le feed
"""

import argparse
import json
import math
import os
import re
import sys
import time
import unicodedata
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

import pandas as pd
import requests

sys.path.insert(0, os.path.dirname(__file__))
import gbadw_profile as P  # noqa: E402

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
FEED_CSV = os.path.join(DATA_DIR, "gbadw_feed.csv")
PREFILTER_CSV = os.path.join(DATA_DIR, "gbadw_prefiltered.csv")
RUNDOWN_MD = os.path.join(DATA_DIR, "gbadw_rundown.md")

TODAY = datetime.now(ZoneInfo("Europe/Paris")).date()

BOAMP_BASE = "https://boamp-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/boamp"
TED_SEARCH = "https://api.ted.europa.eu/v3/notices/search"

MAX_LEMAN = 500          # plafond de NOUVEAUX avis envoyés à Leman par run (les anciens sont repris du cache)
LEMAN_WORKERS = 4        # appels Leman en parallèle (au-delà, OpenAI limite le débit)
LEMAN_RETRIES = 6
NO_CREDIT = {"hit": False}   # passe à True dès qu'OpenAI répond "plus de crédit" : on arrête d'appeler
SEED_CSV = os.path.join(DATA_DIR, "gbadw_seed.csv")   # analyses d'un run précédent, pour amorcer le cache
PLATFORM_TABLE = "gbadw_tenders"  # table de la plateforme agence (une ligne par avis, clé publication_number)
LEMAN_TEXT_CHARS = 7000  # texte d'avis transmis à Leman
TED_LOOKBACK_DAYS = 150  # fenêtre de publication TED (le filtre "live" se fait sur la date limite)

HTTP = requests.Session()
HTTP.headers["User-Agent"] = "Kribbl-GBADW/1.0"


def log(msg=""):
    print(msg, flush=True)


# ===========================================================================
# Texte
# ===========================================================================

def normalize(text):
    if text is None or (isinstance(text, float) and math.isnan(text)):
        return ""
    text = unicodedata.normalize("NFKD", str(text).lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.replace("œ", "oe").replace("æ", "ae")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return f" {text.strip()} "


_PATTERNS = {}


def _pattern(term):
    if term not in _PATTERNS:
        t = normalize(term.rstrip("*")).strip()
        if term.endswith("*"):
            _PATTERNS[term] = re.compile(rf"(?<![a-z0-9]){re.escape(t)}")
        else:
            _PATTERNS[term] = re.compile(rf"(?<![a-z0-9]){re.escape(t)}(?![a-z0-9])")
    return _PATTERNS[term]


def hits(text_norm, terms):
    return [t for t in terms if _pattern(t).search(text_norm)]


def parse_json(raw):
    if isinstance(raw, (dict, list)):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            return parse_json(json.loads(raw))
        except Exception:
            return {}
    return {}


def as_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]


def parse_date(value):
    """Accepte '2026-10-15', '2026-10-15T12:00:00+02:00', '2026-10-15+02:00', '20261015'."""
    if value is None:
        return None
    s = str(value).strip()
    m = re.match(r"(\d{4})-?(\d{2})-?(\d{2})", s)
    if not m:
        return None
    try:
        return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    except ValueError:
        return None


# ===========================================================================
# 1. BOAMP
# ===========================================================================

BOAMP_FULLTEXT = ["maitrise", "architecte", "architecture", "concours", "conception"]

TEXT_KEYS = {
    "#text", "description", "Description", "intitule", "titreMarche", "Name", "Title",
    "cbc:Description", "cbc:Name", "cbc:Note", "cbc:ProcurementLegislationDocumentReference",
}
SKIP_KEYS = {
    "uri", "url", "href", "id", "code", "@listName", "@schemeID", "@languageID",
    "@schemeName", "cbc:ID", "cbc:CustomizationID", "cbc:UBLVersionID",
    "cbc:VersionID", "cbc:RegulatoryDomain",
}


def donnees_text(raw):
    data = parse_json(raw)
    parts = []

    def walk(obj, depth=0):
        if depth > 14:
            return
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k in SKIP_KEYS:
                    continue
                if k in TEXT_KEYS:
                    if isinstance(v, str) and len(v.strip()) > 8:
                        parts.append(v.strip())
                    elif isinstance(v, dict) and isinstance(v.get("#text"), str):
                        if len(v["#text"].strip()) > 8:
                            parts.append(v["#text"].strip())
                    elif isinstance(v, (dict, list)):
                        walk(v, depth + 1)
                elif isinstance(v, (dict, list)):
                    walk(v, depth + 1)
                elif isinstance(v, str):
                    v = v.strip()
                    if (len(v) > 40 and not v.startswith("http")
                            and not re.match(r"^[\d\-/+:\.T ]+$", v)):
                        parts.append(v)
        elif isinstance(obj, list):
            for it in obj:
                walk(it, depth + 1)

    walk(data)
    seen, out = set(), []
    for p in parts:
        key = p.lower()
        if key not in seen:
            seen.add(key)
            out.append(p)
    return " | ".join(out)


def donnees_cpvs(raw):
    data = parse_json(raw)
    cpvs = set()

    def walk(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if k == "cbc:ItemClassificationCode" and isinstance(v, dict):
                    if v.get("@listName") == "cpv" and "#text" in v:
                        cpvs.add(str(v["#text"]))
                elif k in ("classPrincipale", "CPV_CODE", "cpv") and isinstance(v, str):
                    cpvs.add(v)
                elif k == "CPV_CODE" and isinstance(v, dict) and v.get("@CODE"):
                    cpvs.add(str(v["@CODE"]))
                else:
                    walk(v)
        elif isinstance(obj, list):
            for it in obj:
                walk(it)

    walk(data)
    return sorted(c for c in cpvs if re.match(r"^\d{8}", c))


DCE_SKIP_HOSTS = ("boamp.fr", "ted.europa.eu", "europa.eu", "legifrance", "w3.org", "oasis-open", "telerecours",
                  "chorus-pro", "economie.gouv", "service-public")


def donnees_dce_url(raw):
    """Meilleur lien vers le dossier de consultation trouvé dans l'avis.
    Priorité : adresse des documents, puis adresse de dépôt, puis profil acheteur."""
    data = parse_json(raw)
    found = []

    def walk(obj, path):
        if isinstance(obj, dict):
            for k, v in obj.items():
                walk(v, path + "/" + str(k))
        elif isinstance(obj, list):
            for it in obj:
                walk(it, path)
        elif isinstance(obj, str):
            for u in re.findall(r"https?://[^\s\"'<>|]+", obj):
                found.append((path, u.rstrip(".,;)")))

    walk(data, "")
    best, best_score = "", -1
    for path, u in found:
        low, pl = u.lower(), path.lower()
        if any(h in low for h in DCE_SKIP_HOSTS):
            continue
        if any(k in pl for k in ("callfortendersdocumentreference", "url_document", "urldocconsul", "document")):
            score = 100
        elif any(k in pl for k in ("url_participation", "tenderrecipient", "endpointid", "participation")):
            score = 60
        elif any(k in pl for k in ("url_information", "additionalinformation")):
            score = 50
        elif any(k in pl for k in ("buyerprofileuri", "url_profil_acheteur")):
            score = 20
        else:
            score = 10
        rest = re.sub(r"^https?://[^/]+", "", u)
        if "?" in rest or rest.strip("/").count("/") >= 1 or len(rest.strip("/")) > 12:
            score += 15   # lien profond : pointe sur la consultation, pas sur l'accueil
        if score > best_score:
            best, best_score = u, score
    return best


def is_deep_link(u):
    rest = re.sub(r"^https?://[^/]+", "", u or "")
    return bool(u) and ("?" in rest or len(rest.strip("/")) > 12)


def donnees_first(raw, key_fragments):
    data = parse_json(raw)

    def walk(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if any(f in k for f in key_fragments):
                    if isinstance(v, (str, int, float)) and str(v).strip():
                        return str(v).strip()
                    if isinstance(v, dict) and v.get("#text"):
                        return str(v["#text"]).strip()
                r = walk(v)
                if r:
                    return r
        elif isinstance(obj, list):
            for it in obj:
                r = walk(it)
                if r:
                    return r
        return None

    return walk(data) or ""


def boamp_fetch():
    since = TODAY.isoformat()
    text_clause = " OR ".join(f'"{t}"' for t in BOAMP_FULLTEXT)
    where_full = f'datelimitereponse >= "{since}" AND ({text_clause})'
    where_date = f'datelimitereponse >= "{since}"'

    strategies = [
        ("export+fulltext", "export", where_full, None),
        ("records+fulltext", "records", where_full, None),
        ("records+q (legacy)", "records", where_date, " OR ".join(BOAMP_FULLTEXT)),
    ]

    for label, mode, where, q in strategies:
        log(f"BOAMP stratégie : {label}")
        try:
            if mode == "export":
                r = HTTP.get(f"{BOAMP_BASE}/exports/json", params={"where": where}, timeout=300)
                if r.status_code != 200:
                    log(f"  HTTP {r.status_code} : {r.text[:300]}")
                    continue
                records = r.json()
                if isinstance(records, list):
                    log(f"  {len(records)} avis live récupérés")
                    return records
                continue

            records, offset = [], 0
            while offset < 9900:
                params = {"where": where, "limit": 100, "offset": offset,
                          "order_by": "datelimitereponse ASC"}
                if q:
                    params["q"] = q
                r = HTTP.get(f"{BOAMP_BASE}/records", params=params, timeout=60)
                if r.status_code != 200:
                    log(f"  HTTP {r.status_code} : {r.text[:300]}")
                    records = None
                    break
                batch = r.json().get("results", [])
                records.extend(batch)
                if len(batch) < 100:
                    break
                offset += 100
            if records is not None:
                log(f"  {len(records)} avis live récupérés")
                return records
        except Exception as e:
            log(f"  Erreur : {e}")
    log("BOAMP : toutes les stratégies ont échoué")
    return []


def boamp_to_rows(records):
    rows = []
    for rec in records:
        nature = str(rec.get("nature") or rec.get("nature_libelle") or "").upper()
        type_marche = " ".join(str(x) for x in as_list(rec.get("type_marche"))).upper()
        raw_donnees = rec.get("donnees")
        dtext = donnees_text(raw_donnees)
        gestion = parse_json(rec.get("gestion"))
        resume = ""
        if isinstance(gestion, dict):
            resume = str((gestion.get("INDEXATION") or {}).get("RESUME_OBJET") or "")

        idweb = rec.get("idweb") or ""
        rows.append({
            "source": "BOAMP",
            "publication_number": idweb,
            "title": str(rec.get("objet") or "").strip(),
            "buyer_name": str(rec.get("nomacheteur") or "").strip(),
            "publication_date": str(rec.get("dateparution") or "")[:10],
            "deadline": str(parse_date(rec.get("datelimitereponse")) or ""),
            "nature": nature,
            "type_marche": type_marche,
            "procedure": str(rec.get("procedure_libelle") or rec.get("type_procedure") or ""),
            "departement": " | ".join(str(d) for d in as_list(rec.get("code_departement")) if d),
            "cpv_code": " | ".join(donnees_cpvs(raw_donnees)),
            "estimated_value": donnees_first(raw_donnees, ["EstimatedOverallContractAmount", "VALEUR_ESTIMEE", "MONTANT"]),
            "url": rec.get("url_avis") or f"https://www.boamp.fr/pages/avis/?q=idweb:{idweb}",
            "buyer_profile_uri": donnees_first(raw_donnees, ["BuyerProfileURI", "URL_PROFIL_ACHETEUR"]),
            "dce_url": donnees_dce_url(raw_donnees),
            "country": "France",
            "full_text": " | ".join(p for p in [
                str(rec.get("objet") or ""), resume,
                " | ".join(str(x) for x in as_list(rec.get("descripteur_libelle"))),
                dtext,
            ] if p.strip()),
        })
    return rows


# ===========================================================================
# 2. TED
# ===========================================================================

TED_CPVS = [
    "71000000", "71200000", "71210000", "71220000", "71221000", "71222000",
    "71223000", "71230000", "71240000", "71241000", "71242000", "71250000",
    "71251000", "71300000", "71310000", "71311000", "71311200", "71311210",
    "71311220", "71311230", "71311240", "71311300", "71320000", "71322000",
    "71400000", "71410000", "71420000",
]
TED_BASE_FIELDS = ["publication-number", "notice-title", "buyer-name", "buyer-country",
                   "description-lot", "publication-date"]
TED_OPTIONAL_FIELDS = [
    "deadline-receipt-tender-date-lot", "deadline-receipt-request-date-lot",
    "deadline-receipt-request", "deadline-date-lot", "deadline",
    "notice-type", "procedure-type", "estimated-value-lot", "estimated-value-proc",
    "place-of-performance-city-lot", "organisation-city-buyer", "classification-cpv",
    "document-url-lot", "submission-url-lot", "buyer-profile",
]


def ted_post(query, fields, page=1, limit=250):
    payload = {"query": query, "fields": fields, "page": page, "limit": limit,
               "scope": "ACTIVE", "paginationMode": "PAGE_NUMBER"}
    r = HTTP.post(TED_SEARCH, json=payload, timeout=60,
                  headers={"Content-Type": "application/json", "Accept": "application/json"})
    if r.status_code == 400 and "scope" in r.text.lower():
        payload["scope"] = "ALL"
        r = HTTP.post(TED_SEARCH, json=payload, timeout=60,
                      headers={"Content-Type": "application/json", "Accept": "application/json"})
    return r


def ted_fetch():
    since = (TODAY - timedelta(days=TED_LOOKBACK_DAYS)).strftime("%Y%m%d")
    cpv_clause = f"classification-cpv IN ({' '.join(TED_CPVS)})"
    queries = [
        f"buyer-country=FRA AND {cpv_clause} AND publication-date>={since}",
        f"place-of-performance=FRA AND {cpv_clause} AND publication-date>={since}",
        f"{cpv_clause} AND publication-date>={since}",
    ]

    query = None
    for q in queries:
        try:
            r = ted_post(q, TED_BASE_FIELDS, limit=1)
            if r.status_code == 200:
                query = q
                break
            log(f"TED requête refusée ({r.status_code}) : {q[:80]}… {r.text[:200]}")
        except Exception as e:
            log(f"TED erreur : {e}")
    if not query:
        log("TED : aucune requête acceptée")
        return []
    log(f"TED requête : {query[:120]}…")

    fields = list(TED_BASE_FIELDS)
    for f in TED_OPTIONAL_FIELDS:
        try:
            r = ted_post(query, fields + [f], limit=1)
            if r.status_code == 200:
                fields.append(f)
        except Exception:
            pass
    log(f"TED champs : {fields}")

    notices = []
    for page in range(1, 21):
        r = ted_post(query, fields, page=page)
        if r.status_code != 200:
            log(f"TED page {page} : HTTP {r.status_code} {r.text[:200]}")
            break
        batch = r.json().get("notices") or r.json().get("results") or []
        notices.extend(batch)
        if len(batch) < 250:
            break
        time.sleep(0.5)
    log(f"TED : {len(notices)} avis récupérés")
    return notices


def ted_text(value, langs=("fra", "FRA", "fr", "eng", "ENG", "en")):
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return " | ".join(t for t in (ted_text(v, langs) for v in value) if t)
    if isinstance(value, dict):
        for lg in langs:
            if lg in value:
                return ted_text(value[lg], langs)
        for v in value.values():
            t = ted_text(v, langs)
            if t:
                return t
    return str(value)


def ted_dates(value):
    out = []
    for v in as_list(value):
        if isinstance(v, dict):
            for x in v.values():
                out.extend(ted_dates(x))
        else:
            d = parse_date(v)
            if d:
                out.append(d)
    return out


def ted_to_rows(notices):
    rows = []
    for n in notices:
        countries = ted_text(n.get("buyer-country"))
        if countries and "FRA" not in countries.upper() and "FR" not in countries.upper().split(" | "):
            continue

        deadlines = []
        for f in ["deadline-receipt-request-date-lot", "deadline-receipt-request",
                  "deadline-receipt-tender-date-lot", "deadline-date-lot", "deadline"]:
            deadlines.extend(ted_dates(n.get(f)))
        future = sorted(d for d in deadlines if d >= TODAY)
        deadline = str(future[0]) if future else ("PAST" if deadlines else "")

        pub = n.get("publication-number", "")
        url = ""
        links = n.get("links") or {}
        if isinstance(links, dict):
            html = links.get("html") or {}
            if isinstance(html, dict):
                url = html.get("FRA") or html.get("ENG") or next(iter(html.values()), "")
        url = url or f"https://ted.europa.eu/fr/notice/-/detail/{pub}"

        title = ted_text(n.get("notice-title"))
        desc = ted_text(n.get("description-lot"))
        rows.append({
            "source": "TED",
            "publication_number": pub,
            "title": title,
            "buyer_name": ted_text(n.get("buyer-name")),
            "publication_date": str(parse_date(n.get("publication-date")) or ""),
            "deadline": deadline,
            "nature": ted_text(n.get("notice-type")).upper(),
            "type_marche": "",
            "procedure": ted_text(n.get("procedure-type")),
            "departement": ted_text(n.get("place-of-performance-city-lot")) or ted_text(n.get("organisation-city-buyer")),
            "cpv_code": ted_text(n.get("classification-cpv")),
            "estimated_value": ted_text(n.get("estimated-value-lot")) or ted_text(n.get("estimated-value-proc")),
            "url": url,
            "buyer_profile_uri": ted_text(n.get("buyer-profile")),
            "dce_url": ted_text(n.get("document-url-lot")).split(" | ")[0].split(", ")[0]
                       or ted_text(n.get("submission-url-lot")).split(" | ")[0].split(", ")[0],
            "country": "France",
            "full_text": f"{title} | {desc}",
        })
    return rows


# ===========================================================================
# 3. Préfiltre
# ===========================================================================

def sector_scores(title_n, text_n):
    scores = {}
    for sector, kw in P.SECTORS.items():
        s = 0
        matched = []
        for weight, terms in ((3, kw["strong"]), (1, kw["weak"])):
            for t in hits(text_n, terms):
                s += weight
                matched.append(t)
            s += weight * len(hits(title_n, terms))  # le titre compte double
        scores[sector] = (s, matched)
    return scores


def contract_type_of(row):
    """Type de contrat déterministe (Leman le confirme ensuite)."""
    head = normalize(row["title"] + " " + row["procedure"] + " " + row["full_text"][:3000])
    if hits(head, P.DESIGN_BUILD_TERMS):
        return "DESIGN_BUILD"
    title_n = normalize(row["title"])
    if hits(title_n, ["concours", "maitrise d oeuvre", "maitrise d uvre", "moe"]):
        return "ARCHITECT_LED"
    if hits(title_n, P.PLANNING_TERMS + ["etude", "etudes"]):
        return "STUDY"
    if hits(head, ["concours", "maitrise d oeuvre", "maitrise d uvre"]):
        return "ARCHITECT_LED"
    return "OTHER"


def prefilter(row):
    """Retourne (garder, raison, secteur, score, mots-clés, type de contrat)."""
    title_n = normalize(row["title"])
    text_n = normalize(row["title"] + " " + row["full_text"])

    # live
    dl = parse_date(row["deadline"])
    if row["deadline"] == "PAST":
        return False, "date limite passée", "", 0, "", ""
    if dl and dl < TODAY:
        return False, "date limite passée", "", 0, "", ""
    if dl and (dl - TODAY).days < 3:
        return False, "date limite dans moins de 3 jours", "", 0, "", ""
    if not dl:
        pub = parse_date(row["publication_date"])
        if not pub or (TODAY - pub).days > 45:
            return False, "date limite inconnue et avis ancien", "", 0, "", ""

    # nature
    if any(f in row["nature"] for f in P.EXCLUDED_NATURE_FRAGMENTS):
        return False, f"nature {row['nature']}", "", 0, "", ""
    if row["nature"].startswith(("CAN", "PIN", "VEAT")):  # TED : attribution / préinformation
        return False, f"type d'avis {row['nature']}", "", 0, "", ""
    if "FOURNITURES" in row["type_marche"] and "SERVICES" not in row["type_marche"]:
        return False, "marché de fournitures", "", 0, "", ""

    # type de contrat : la conception-réalisation est gardée mais marquée
    ctype = contract_type_of(row)

    # exclusions titre
    ex = hits(title_n, P.TITLE_EXCLUSIONS)
    if ex:
        return False, f"exclusion titre : {ex[0]}", "", 0, "", ""
    planning = hits(title_n, P.PLANNING_TERMS)
    if hits(title_n, P.AMO_TERMS) and not hits(title_n, ["maitrise d oeuvre", "moe", "concours"]) and not planning:
        return False, "AMO seule", "", 0, "", ""

    # mission de conception (une conception-réalisation en contient une par définition,
    # et elle est souvent publiée comme marché de travaux)
    if ctype != "DESIGN_BUILD":
        cpvs = [c.strip() for c in str(row["cpv_code"]).split("|") if c.strip()]
        cpv_ok = any(c.startswith(P.MISSION_CPV_PREFIXES) for c in cpvs)
        mission = hits(text_n, P.MISSION_TERMS)
        if not cpv_ok and not mission:
            return False, "pas de mission de conception", "", 0, "", ""
        if "TRAVAUX" in row["type_marche"]:
            return False, "marché de travaux", "", 0, "", ""

    # secteur
    scores = sector_scores(title_n, text_n)
    if scores.get("TRANSPORT", (0,))[0] and not hits(text_n, P.TRANSPORT_TERMS):
        scores["TRANSPORT"] = (0, [])
    best = max(scores, key=lambda k: scores[k][0])
    best_score, matched = scores[best]
    if best_score < P.SECTOR_MIN_SCORE:
        # hors cible : gardé seulement si le titre ou le CPV annonce une vraie mission d'architecte
        cpvs_all = [c.strip() for c in str(row["cpv_code"]).split("|") if c.strip()]
        strict = hits(title_n, P.STRICT_MOE_TERMS) or any(c.startswith(P.ARCHITECTURE_CPV_PREFIXES) for c in cpvs_all)
        if not strict:
            return False, "hors cibles et pas de mission d'architecte dans le titre", "", best_score, "", ""
        nb = hits(title_n, P.NON_BUILDING_TITLE_TERMS)
        if nb:
            return False, "hors cibles : infrastructure ou lot technique", "", best_score, "", ""
        typo, tmatched = "OTHER", []
        for name, terms in P.TYPOLOGIES.items():
            h = hits(title_n, terms)
            if h:
                typo, tmatched = name, h
                break
        if typo == "OTHER":
            for name, terms in P.TYPOLOGIES.items():
                h = hits(text_n, terms)
                if len(h) >= 2:
                    typo, tmatched = name, h
                    break
        bonus = 10 if hits(title_n, ["concours"]) else 0
        why = "ok autre typologie"
        return True, why, typo, 1 + bonus, ", ".join(sorted(set(tmatched))[:8]), ctype

    bonus = 10 if hits(title_n, ["concours"]) else 0
    bonus += 5 if hits(title_n, ["maitrise d oeuvre", "moe"]) else 0
    if ctype == "DESIGN_BUILD":
        bonus -= 20
    why = "ok (conception-réalisation, marquée)" if ctype == "DESIGN_BUILD" else "ok"
    return True, why, best, best_score + bonus, ", ".join(sorted(set(matched))[:8]), ctype


def dedupe(rows):
    seen, out = set(), []
    for r in sorted(rows, key=lambda r: 0 if r["source"] == "BOAMP" else 1):
        t = re.sub(r"^\s*france\s*[-–]\s*[^-–]+[-–]\s*", "", r["title"], flags=re.I)
        key = normalize(t)[:60] + "|" + normalize(r["buyer_name"])[:20]
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


# ===========================================================================
# 4. Leman
# ===========================================================================

def leman_prompt(row):
    refs = "\n".join(
        f"- {r.get('name')} ({r.get('type')}, {r.get('location')}, {r.get('year')}, {r.get('amount', '')}, {r.get('role', '')})"
        for r in P.REFERENCES
    ) or "- (références non renseignées : ne pas pénaliser, signaler seulement les exigences de références)"
    examples = "\n".join(
        f"- « {e['title']} » → {e.get('contract_type', '?')}, {e['verdict']} : {e['reason']}"
        for e in P.FEEDBACK_EXAMPLES
    ) or "- (aucun pour l'instant)"

    return f"""Tu es Leman, analyste des marchés publics français pour UNE seule agence d'architecture.

=== AGENCE ===
{P.AGENCY['name']} ({P.AGENCY['city']}, Espagne), fondée par {P.AGENCY['founders']}.
Spécialité : {P.AGENCY['specialty']}.
Cibles en France (cœur de métier) : bâtiments de transport et schémas directeurs de transport (gares, pôles d'échanges, aéroports), bâtiments industriels et de maintenance, tous les bâtiments liés à la santé.
Autres typologies : l'agence veut aussi les voir, pour y répondre avec des partenaires.
Éligibilité en France : {P.AGENCY['france_eligibility']}

Références :
{refs}

=== RÈGLES DE VERDICT ===
{P.VERDICT_RULES}

Verdicts corrigés par l'agence (à respecter pour des cas similaires) :
{examples}

=== AVIS ===
Source : {row['source']} ({row['publication_number']})
Titre : {row['title']}
Acheteur : {row['buyer_name']}
Localisation : {row['departement']}
Procédure : {row['procedure']}
Nature / type : {row['nature']} / {row['type_marche']}
CPV : {row['cpv_code']}
Valeur estimée : {row['estimated_value'] or 'non indiquée'}
Date limite : {row['deadline'] or 'non trouvée'}
Secteur pressenti (préfiltre) : {row['sector']}
Type de contrat pressenti (préfiltre, à vérifier) : {row.get('contract_type', 'OTHER')}

Texte de l'avis :
{row['full_text'][:LEMAN_TEXT_CHARS]}

=== RÉPONSE ===
Réponds UNIQUEMENT avec un objet JSON :
{{
  "contract_type": "ARCHITECT_LED" | "STUDY" | "DESIGN_BUILD" | "OTHER",
  "team_lead": "qui mène l'équipe candidate : architecte | entreprise de travaux | bureau d'études | inconnu",
  "verdict": "GO" | "MAYBE" | "NO",
  "relevance_score": 0-100 (utilise toute l'échelle),
  "architect_mission": true | false,
  "fit": "CORE" | "PARTNER" | "NO",
  "sector": "TRANSPORT" | "MAINTENANCE" | "HEALTH" | "OTHER",
  "typology": "TRANSPORT" | "MAINTENANCE" | "HEALTH" | "EDUCATION" | "HOUSING" | "SPORT" | "CULTURE" | "PUBLIC_OFFICES" | "HERITAGE" | "COMMERCE_TOURISM" | "URBAN_LANDSCAPE" | "OTHER",
  "project_type": "type de bâtiment/ouvrage, court",
  "program": "programme en une phrase",
  "location": "ville (département)",
  "procedure_type": "concours restreint | concours ouvert | procédure avec négociation | appel d'offres ouvert | conception-réalisation | marché global | autre",
  "mission": "mission demandée (ex : MOE mission de base + EXE)",
  "estimated_budget": "montant travaux ou honoraires si indiqué, sinon null",
  "budget_eur": montant des travaux en euros HT sous forme de nombre entier si indiqué, sinon null,
  "prize_eur": montant de la prime de concours en euros HT (nombre entier) si indiqué, sinon null,
  "teams_shortlisted": nombre d'équipes admises à concourir (nombre entier) si indiqué, sinon null,
  "deadline_type": "candidatures | offres | inconnu",
  "required_references": ["références exigées"],
  "minimum_revenue_required": "CA minimum exigé si indiqué, sinon null",
  "architect_mandatory": true | false | null,
  "consortium_required": true | false | null,
  "eligibility": "comment GBADW peut candidater (mandataire LPS, cotraitant d'une agence française, non éligible…)",
  "blocking_points": ["points bloquants concrets"],
  "summary_en": "2-3 phrases en ANGLAIS pour Pablo : le projet et pourquoi c'est (ou non) pour GBADW",
  "summary_fr": "même chose en français",
  "summary_es": "même chose en ESPAGNOL"
}}"""


def leman_one(row, model):
    from openai import OpenAI
    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
    result = {}
    for attempt in range(LEMAN_RETRIES):
        if NO_CREDIT["hit"]:
            break
        try:
            resp = client.chat.completions.create(
                model=model,
                temperature=0,
                response_format={"type": "json_object"},
                messages=[{"role": "user", "content": leman_prompt(row)}],
            )
            result = json.loads(resp.choices[0].message.content)
            break
        except Exception as e:
            msg = str(e)
            if "insufficient_quota" in msg or "credit_balance" in msg or "no credits remaining" in msg:
                if not NO_CREDIT["hit"]:
                    log("    OpenAI : plus de crédit sur le compte. Les avis restants seront analysés au prochain run.")
                NO_CREDIT["hit"] = True
                break
            if "rate_limit" in msg or "429" in msg:
                time.sleep(min(60, 4 * (attempt + 1)))   # limite de débit : on attend, sans bruit
                continue
            log(f"    erreur ({attempt + 1}/{LEMAN_RETRIES}) : {msg[:200]}")
            time.sleep(3 * (attempt + 1))
    merged = dict(row)
    # côté prudent : si le préfiltre ou Leman voit une conception-réalisation, elle est marquée
    ctype = str(result.get("contract_type") or "").upper()
    if ctype not in P.CONTRACT_LABELS:
        ctype = row.get("contract_type") or "OTHER"
    if row.get("contract_type") == "DESIGN_BUILD":
        ctype = "DESIGN_BUILD"
    verdict = str(result.get("verdict") or "").upper() or "ERROR"
    fit = str(result.get("fit") or "").upper()
    typology = str(result.get("typology") or "").upper()
    if typology not in P.TYPOLOGY_LABELS:
        typology = row.get("sector") if row.get("sector") in P.TYPOLOGY_LABELS else "OTHER"
    # le groupe se décide ici, pas dans la réponse de l'IA : une autre typologie n'est jamais un "non"
    arch = result.get("architect_mission")
    if isinstance(arch, str):
        arch = arch.strip().lower() in ("true", "vrai", "oui", "yes")
    if arch is None:
        arch = ctype in ("ARCHITECT_LED", "DESIGN_BUILD") and bool(result)
    if typology in P.CORE_SECTORS:
        fit = "NO" if (verdict == "NO" or (arch is False and ctype != "STUDY")) else "CORE"
    else:
        fit = "PARTNER" if arch else "NO"
    if fit == "NO":
        verdict = "NO"
    elif fit == "PARTNER":
        verdict = "MAYBE"
    elif verdict == "GO" and ctype == "DESIGN_BUILD":
        verdict = "MAYBE"
    elif verdict not in ("GO", "MAYBE"):
        verdict = "MAYBE"
    if not result:   # appel raté : ni verdict ni cache, l'avis sera réanalysé au prochain run
        verdict, fit = "ERROR", ("CORE" if typology in P.CORE_SECTORS else "PARTNER")

    def _int(v):
        try:
            return int(float(str(v).replace(" ", "").replace(",", ".")))
        except Exception:
            return None

    merged.update({
        "contract_type": ctype,
        "team_lead": result.get("team_lead"),
        "verdict": verdict,
        "fit": fit,
        "typology": typology,
        "relevance_score": result.get("relevance_score"),
        "leman_sector": result.get("sector"),
        "project_type": result.get("project_type"),
        "program": result.get("program"),
        "location": result.get("location"),
        "procedure_type": result.get("procedure_type"),
        "mission": result.get("mission"),
        "estimated_budget": result.get("estimated_budget"),
        "budget_eur": _int(result.get("budget_eur")),
        "prize_eur": _int(result.get("prize_eur")),
        "teams_shortlisted": _int(result.get("teams_shortlisted")),
        "deadline_type": result.get("deadline_type"),
        "required_references": json.dumps(result.get("required_references") or [], ensure_ascii=False),
        "minimum_revenue_required": result.get("minimum_revenue_required"),
        "architect_mandatory": result.get("architect_mandatory"),
        "consortium_required": result.get("consortium_required"),
        "eligibility": result.get("eligibility"),
        "blocking_points": json.dumps(result.get("blocking_points") or [], ensure_ascii=False),
        "summary_en": result.get("summary_en"),
        "summary_es": result.get("summary_es"),
        "summary": result.get("summary_fr"),
        "analysed": bool(result),
    })
    return merged


def leman_run(rows, model, light_model=None):
    """Analyse en parallèle. Les avis hors cible passent par le modèle léger."""
    from concurrent.futures import ThreadPoolExecutor
    light_model = light_model or model

    def work(args):
        i, row = args
        m = model if row.get("sector") in P.CORE_SECTORS else light_model
        log(f"  Leman {i}/{len(rows)} [{m}] {row['title'][:70]}")
        return leman_one(row, m)

    with ThreadPoolExecutor(max_workers=LEMAN_WORKERS) as ex:
        return list(ex.map(work, enumerate(rows, 1)))


# ===========================================================================
# 5. Sorties
# ===========================================================================

TYPO_LABEL = P.TYPOLOGY_LABELS

ANALYSIS_FIELDS = [
    "contract_type", "team_lead", "verdict", "fit", "typology", "relevance_score",
    "project_type", "program", "location", "procedure_type", "mission", "estimated_budget",
    "budget_eur", "prize_eur", "teams_shortlisted", "deadline_type", "required_references",
    "eligibility", "blocking_points", "summary_en", "summary_es", "summary",
]


def days_left(d):
    d = parse_date(d)
    return (d - TODAY).days if d else None


def _s(v):
    return v if isinstance(v, str) and v.strip() else ""


def _money(v):
    try:
        v = float(v)
        if math.isnan(v) or v <= 0:
            return ""
    except Exception:
        return ""
    return f"€{round(v / 1e6, 1):g}M" if v >= 1e6 else f"€{round(v / 1e3, 1):g}k"


def _entries(sub, lines):
    sub = sub.assign(_v=sub["verdict"].map({"GO": 0, "MAYBE": 1}).fillna(2),
                     _d=pd.to_datetime(sub["deadline"], errors="coerce"))
    for _, r in sub.sort_values(["_v", "_d"]).iterrows():
        dl = _s(r.get("deadline")) or "?"
        left = days_left(dl)
        left_s = f" ({left} days left)" if left is not None else ""
        ctype = _s(r.get("contract_type")) or "OTHER"
        if ctype == "DESIGN_BUILD":
            tag = "DESIGN-AND-BUILD"
        elif r.get("fit") == "PARTNER":
            tag = "With partner"
        else:
            tag = "GO" if r.get("verdict") == "GO" else "To study"
        new = " · NEW" if r.get("is_new") is True else ""
        lines.append(f"### [{tag}]{new} {r['title']}")
        lead = _s(r.get("team_lead"))
        lines.append(f"- **Contract:** {P.CONTRACT_LABELS.get(ctype, ctype)}" + (f" (team led by: {lead})" if lead else ""))
        lines.append(f"- **Typology:** {TYPO_LABEL.get(r.get('typology'), r.get('typology'))}")
        lines.append(f"- **Client:** {r['buyer_name']}" + (f", {_s(r.get('location'))}" if _s(r.get("location")) else ""))
        meta = [x for x in [_s(r.get("procedure_type")), _s(r.get("mission"))] if x]
        if meta:
            lines.append(f"- **Procedure:** {' / '.join(meta)}")
        money = [x for x in [
            (f"works {_money(r.get('budget_eur'))}" if _money(r.get("budget_eur")) else _s(r.get("estimated_budget"))),
            (f"prize {_money(r.get('prize_eur'))}" if _money(r.get("prize_eur")) else ""),
        ] if x]
        if money:
            lines.append(f"- **Budget:** {', '.join(money)}")
        dtype = _s(r.get("deadline_type"))
        lines.append(f"- **Deadline:** {dl}{left_s}" + (f", {dtype}" if dtype not in ("", "inconnu") else ""))
        if _s(r.get("summary_en")):
            lines.append(f"- {r['summary_en']}")
        try:
            blocks = json.loads(r.get("blocking_points") or "[]")
        except Exception:
            blocks = []
        if blocks:
            lines.append(f"- **Watch out:** {'; '.join(str(b) for b in blocks)}")
        lines.append(f"- {r['url']}")
        lines.append("")


def write_rundown(df):
    lines = [
        f"# Architecture tenders in France: {TODAY.strftime('%d %B %Y')}",
        "",
        "All building typologies, live notices only. Three groups: core business (transport, industrial and "
        "maintenance, healthcare), other typologies to consider with a partner, and design-and-build (contractor-led).",
        "",
    ]
    for col in ("verdict", "contract_type", "fit", "typology", "is_new"):
        if col not in df.columns:
            df = df.assign(**{col: None})
    keep = df[df["verdict"].isin(["GO", "MAYBE"])]
    if keep.empty:
        lines.append("_No relevant live notice found today._")
        _write_rundown_text("\n".join(lines))
        return
    db = keep[keep["contract_type"] == "DESIGN_BUILD"]
    rest = keep[keep["contract_type"] != "DESIGN_BUILD"]
    core = rest[rest["fit"] != "PARTNER"]
    partner = rest[rest["fit"] == "PARTNER"]
    new = keep[keep["is_new"] == True]  # noqa: E712
    lines += [f"**{len(core)} core business** ({int((core['verdict'] == 'GO').sum())} GO, "
              f"{int((core['verdict'] == 'MAYBE').sum())} to study), **{len(partner)} with a partner**, "
              f"**{len(db)} design-and-build**. **{len(new)} new today.**", ""]

    # tableau de synthèse : une ligne par avis, trié par date limite
    lines += ["## Overview by deadline", "",
              "| Deadline | Group | Typology | Project | Client | Works | Contract |",
              "|---|---|---|---|---|---|---|"]
    ov = keep.assign(_d=pd.to_datetime(keep["deadline"], errors="coerce")).sort_values("_d")
    for _, r in ov.iterrows():
        grp = "Design-build" if r["contract_type"] == "DESIGN_BUILD" else ("Partner" if r["fit"] == "PARTNER" else "Core")
        title = str(r["title"]).replace("|", "/")
        title = re.sub(r"^\s*France\s*[-–]\s*[^-–]+[-–]\s*", "", title)[:90]
        lines.append(f"| {_s(r.get('deadline')) or '?'} | {grp}{' · NEW' if r.get('is_new') is True else ''} | "
                     f"{TYPO_LABEL.get(r.get('typology'), r.get('typology'))} | [{title}]({r['url']}) | "
                     f"{str(r['buyer_name']).replace('|', '/')[:40]} | {_money(r.get('budget_eur')) or _s(r.get('estimated_budget'))[:20]} | "
                     f"{_s(r.get('procedure_type'))[:30]} |")
    lines.append("")

    if not new.empty:
        lines += [f"## New today ({len(new)})", ""]
        _entries(new, lines)

    lines += ["# Core business", ""]
    for sector in P.CORE_SECTORS:
        sub = core[core["typology"] == sector]
        if sub.empty:
            continue
        lines += [f"## {TYPO_LABEL[sector]} ({len(sub)})", ""]
        _entries(sub, lines)
    other_core = core[~core["typology"].isin(P.CORE_SECTORS)]
    if not other_core.empty:
        lines += [f"## Other ({len(other_core)})", ""]
        _entries(other_core, lines)

    if not partner.empty:
        lines += ["# Other typologies, with a partner", ""]
        for typo in [t for t in TYPO_LABEL if t not in P.CORE_SECTORS]:
            sub = partner[partner["typology"] == typo]
            if sub.empty:
                continue
            lines += [f"## {TYPO_LABEL[typo]} ({len(sub)})", ""]
            _entries(sub, lines)

    if not db.empty:
        lines += [f"# Design-and-build: contractor-led ({len(db)})", "",
                  "_A construction company leads the team and the architect is a subcontractor._", ""]
        _entries(db, lines)

    _write_rundown_text("\n".join(lines))


def _write_rundown_text(text):
    with open(RUNDOWN_MD, "w", encoding="utf-8") as f:
        f.write(text)
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        # le résumé GitHub est limité à 1 Mo : on tronque proprement
        with open(summary_path, "a", encoding="utf-8") as f:
            f.write(text[:900_000] + "\n")
    log(f"Récap : {RUNDOWN_MD}")


def clean(v):
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if isinstance(v, str) and not v.strip():
        return None
    return v


BASE_COLUMNS = [
    "rank", "user_id", "verdict", "final_score", "relevance_score", "source",
    "publication_number", "publication_date", "title", "buyer_name", "country",
    "category", "priority_bucket", "cpv_code", "url", "summary", "why_it_matters",
    "location", "procedure_type", "main_discipline", "estimated_budget", "project_type",
    "program", "estimated_scale", "required_references", "required_references_count",
    "minimum_revenue_required", "required_certifications", "consortium_required",
    "architect_mandatory",
]
EXTRA_COLUMNS = ["deadline", "sector", "eligibility", "blocking_points", "summary_en", "contract_type"]


def supabase_upload(df):
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY")
    if not url or not key:
        log("Supabase non configuré, upload ignoré")
        return
    user_id = os.environ.get("GBADW_USER_ID") or None
    headers = {"apikey": key, "Authorization": f"Bearer {key}",
               "Content-Type": "application/json", "Prefer": "return=minimal"}

    feed = df[df["verdict"].isin(["GO", "MAYBE"])].copy()
    rows = []
    for i, (_, r) in enumerate(feed.iterrows(), 1):
        is_db = r.get("contract_type") == "DESIGN_BUILD"
        title = r.get("title")
        if is_db and title and not str(title).startswith("[DESIGN-AND-BUILD]"):
            title = f"[DESIGN-AND-BUILD] {title}"
        row = {
            "rank": i,
            "user_id": user_id,
            "verdict": r.get("verdict"),
            "final_score": r.get("final_score"),
            "relevance_score": r.get("relevance_score"),
            "source": r.get("source"),
            "publication_number": r.get("publication_number"),
            "publication_date": r.get("publication_date"),
            "title": title,
            "buyer_name": r.get("buyer_name"),
            "country": "France",
            "category": r.get("sector"),
            "priority_bucket": "DESIGN_BUILD" if is_db else ("CORE" if r.get("verdict") == "GO" else "SECONDARY"),
            "cpv_code": r.get("cpv_code"),
            "url": r.get("url"),
            "summary": r.get("summary"),
            "why_it_matters": r.get("eligibility"),
            "location": r.get("location"),
            "procedure_type": r.get("procedure_type"),
            "main_discipline": r.get("mission"),
            "estimated_budget": None,
            "project_type": r.get("project_type"),
            "program": r.get("program"),
            "estimated_scale": r.get("estimated_budget"),
            "required_references": r.get("required_references"),
            "required_references_count": None,
            "minimum_revenue_required": None,
            "required_certifications": "[]",
            "consortium_required": r.get("consortium_required"),
            "architect_mandatory": r.get("architect_mandatory"),
            "deadline": r.get("deadline") or None,
            "sector": r.get("sector"),
            "eligibility": r.get("eligibility"),
            "blocking_points": r.get("blocking_points"),
            "summary_en": r.get("summary_en"),
            "contract_type": r.get("contract_type"),
        }
        rows.append({k: clean(v) for k, v in row.items()})

    # purge de l'ancien feed
    flt = f"user_id=eq.{user_id}" if user_id else "id=gte.0"
    d = HTTP.delete(f"{url}/rest/v1/tenders?{flt}", headers=headers, timeout=30)
    log(f"Supabase DELETE ({flt}) : {d.status_code}")
    if not rows:
        return

    r = HTTP.post(f"{url}/rest/v1/tenders", headers=headers, json=rows, timeout=60)
    if r.status_code >= 400:
        log(f"Supabase POST {r.status_code} : {r.text[:300]}")
        log("Nouvel essai sans les colonnes GBADW (lancer scripts/gbadw_migration.sql pour les ajouter)")
        slim = [{k: v for k, v in row.items() if k in BASE_COLUMNS} for row in rows]
        r = HTTP.post(f"{url}/rest/v1/tenders", headers=headers, json=slim, timeout=60)
    log(f"Supabase POST : {r.status_code} {r.text[:200]}")
    r.raise_for_status()


# ===========================================================================
# 6. Table de la plateforme (gbadw_tenders) : cache des analyses et suivi "nouveau"
# ===========================================================================

def _sb():
    url, key = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_KEY")
    if not url or not key:
        return None, None
    return url.rstrip("/"), {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def platform_load():
    """Avis déjà connus, par publication_number. {} si la table n'existe pas encore."""
    url, headers = _sb()
    if not url:
        return {}
    known, offset = {}, 0
    while True:
        r = HTTP.get(f"{url}/rest/v1/{PLATFORM_TABLE}", headers=headers, timeout=60,
                     params={"select": "*", "limit": 1000, "offset": offset})
        if r.status_code != 200:
            log(f"Table {PLATFORM_TABLE} illisible ({r.status_code}) : {r.text[:200]}")
            log("  → lancer scripts/gbadw_platform.sql dans Supabase. Le run continue sans cache.")
            return seed_load()
        batch = r.json()
        for row in batch:
            known[str(row.get("publication_number"))] = row
        if len(batch) < 1000:
            break
        offset += 1000
    log(f"Cache : {len(known)} avis déjà connus dans {PLATFORM_TABLE}")
    if not known:
        return seed_load()
    return known


def seed_load():
    """Amorce le cache avec le feed d'un run précédent (data/gbadw_seed.csv), si la table est vide."""
    if not os.path.exists(SEED_CSV):
        return {}
    try:
        seed = pd.read_csv(SEED_CSV, dtype={"publication_number": str})
    except Exception as e:
        log(f"Seed illisible : {e}")
        return {}
    known = {}
    for _, r in seed.iterrows():
        d = {k: (None if (isinstance(v, float) and math.isnan(v)) else v) for k, v in r.items()}
        if d.get("verdict") in ("GO", "MAYBE", "NO"):
            d["summary_fr"] = d.get("summary")
            d["first_seen"] = str(TODAY - timedelta(days=1))   # déjà vus : pas "nouveaux" aujourd'hui
            known[str(d["publication_number"])] = d
    log(f"Cache amorcé depuis {SEED_CSV} : {len(known)} avis déjà analysés")
    return known


def from_cache(row, cached):
    """Reprend l'analyse stockée pour un avis déjà analysé."""
    merged = dict(row)
    for f in ANALYSIS_FIELDS:
        merged[f] = cached.get("summary_fr" if f == "summary" else f)
    for f in ("required_references", "blocking_points"):
        v = merged.get(f)
        merged[f] = json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else (v or "[]")
    merged["analysed"] = True
    merged["first_seen"] = cached.get("first_seen")
    return merged


def platform_upload(df):
    url, headers = _sb()
    if not url:
        log("Supabase non configuré, upload plateforme ignoré")
        return
    rows = []
    for _, r in df.iterrows():
        def j(v):
            try:
                return json.loads(v) if isinstance(v, str) else (v if isinstance(v, list) else [])
            except Exception:
                return []
        buyer_uri = r.get("buyer_profile_uri") if isinstance(r.get("buyer_profile_uri"), str) else ""
        dce = r.get("dce_url") if isinstance(r.get("dce_url"), str) and r.get("dce_url") else buyer_uri
        row = {
            "publication_number": str(r.get("publication_number")),
            "source": r.get("source"),
            "title": r.get("title"),
            "buyer_name": r.get("buyer_name"),
            "location": r.get("location"),
            "departement": r.get("departement"),
            "url": r.get("url"),
            "dce_url": dce or None,
            "platform": "AWS" if "marches-publics.info" in dce else ("PLACE" if "marches-publics.gouv.fr" in dce else None),
            "publication_date": r.get("publication_date") or None,
            "deadline": r.get("deadline") or None,
            "deadline_type": r.get("deadline_type"),
            "typology": r.get("typology"),
            "fit": r.get("fit"),
            "contract_type": r.get("contract_type"),
            "team_lead": r.get("team_lead"),
            "verdict": r.get("verdict"),
            "score": r.get("final_score"),
            "relevance_score": r.get("relevance_score"),
            "procedure_type": r.get("procedure_type"),
            "mission": r.get("mission"),
            "estimated_budget": r.get("estimated_budget"),
            "budget_eur": r.get("budget_eur"),
            "prize_eur": r.get("prize_eur"),
            "teams_shortlisted": r.get("teams_shortlisted"),
            "project_type": r.get("project_type"),
            "program": r.get("program"),
            "required_references": j(r.get("required_references")),
            "eligibility": r.get("eligibility"),
            "blocking_points": j(r.get("blocking_points")),
            "summary_fr": r.get("summary"),
            "summary_en": r.get("summary_en"),
            "summary_es": r.get("summary_es"),
            "cpv_code": r.get("cpv_code"),
            "is_live": True,
            "first_seen": r.get("first_seen") or str(TODAY),
            "last_seen": str(TODAY),
        }
        row = {k: clean(v) for k, v in row.items()}
        for k in ("budget_eur", "prize_eur", "teams_shortlisted", "score", "relevance_score"):
            if row.get(k) is not None:
                try:
                    row[k] = int(float(row[k]))
                except Exception:
                    row[k] = None
        row["required_references"] = row.get("required_references") or []
        row["blocking_points"] = row.get("blocking_points") or []
        rows.append(row)

    # tout ce qui n'est plus dans le run du jour n'est plus "live"
    r = HTTP.patch(f"{url}/rest/v1/{PLATFORM_TABLE}?is_live=eq.true", headers={**headers, "Prefer": "return=minimal"},
                   json={"is_live": False}, timeout=60)
    log(f"Plateforme : remise à zéro des avis live → {r.status_code}")
    if r.status_code >= 400:
        log(f"  {r.text[:300]}")
        log(f"  → lancer scripts/gbadw_platform.sql dans Supabase pour créer la table {PLATFORM_TABLE}")
        return
    for i in range(0, len(rows), 200):
        r = HTTP.post(f"{url}/rest/v1/{PLATFORM_TABLE}?on_conflict=publication_number",
                      headers={**headers, "Prefer": "resolution=merge-duplicates,return=minimal"},
                      json=rows[i:i + 200], timeout=120)
        log(f"Plateforme : upsert {i}-{i + len(rows[i:i + 200])} → {r.status_code} {r.text[:200]}")
        if r.status_code in (401, 403) or "row-level security" in r.text:
            log("  → la clé SUPABASE_KEY n'a pas le droit d'écrire dans gbadw_tenders.")
            log("    Mettre la clé 'service_role' de Supabase dans le secret GitHub SUPABASE_KEY.")
            raise SystemExit(1)
        r.raise_for_status()


# ===========================================================================
# Main
# ===========================================================================

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-ai", action="store_true")
    ap.add_argument("--no-upload", action="store_true")
    ap.add_argument("--no-cache", action="store_true", help="réanalyser tous les avis")
    ap.add_argument("--source", choices=["all", "boamp", "ted"], default="all")
    args = ap.parse_args()

    log("====================================")
    log(f"KRIBBL GBADW — {TODAY}")
    log("====================================")
    os.makedirs(DATA_DIR, exist_ok=True)

    rows = []
    if args.source in ("all", "boamp"):
        rows += boamp_to_rows(boamp_fetch())
    if args.source in ("all", "ted"):
        rows += ted_to_rows(ted_fetch())
    log(f"\nTotal brut : {len(rows)}")

    for r in rows:
        r["title"] = re.sub(r"\s+", " ", r["title"]).strip()
        r["buyer_name"] = re.sub(r"\s+", " ", r["buyer_name"]).strip().rstrip(". ")

    kept, reasons = [], {}
    for r in dedupe(rows):
        ok, why, sector, score, matched, ctype = prefilter(r)
        reasons[why] = reasons.get(why, 0) + 1
        if ok:
            r.update({"sector": sector, "prefilter_score": score, "keywords": matched,
                      "contract_type": ctype})
            kept.append(r)
    log("Préfiltre :")
    for k, v in sorted(reasons.items(), key=lambda x: -x[1]):
        log(f"  {v:>5}  {k}")

    if not kept:
        log("Aucun avis retenu.")
        write_rundown(pd.DataFrame(columns=["title", "verdict", "deadline"]))
        return
    pd.DataFrame(kept).drop(columns=["full_text"]).to_csv(PREFILTER_CSV, index=False, encoding="utf-8-sig")
    log(f"\n{len(kept)} avis après préfiltre "
        f"({pd.Series([r['sector'] for r in kept]).value_counts().to_dict()})")

    # cache : on ne réanalyse que les avis jamais vus
    known = {} if (args.no_cache or args.no_ai) else platform_load()
    first_run = not known
    done, todo = [], []
    for r in kept:
        c = known.get(str(r["publication_number"]))
        if c and c.get("verdict") and c.get("verdict") != "ERROR":
            done.append(from_cache(r, c))
        else:
            todo.append(r)
    todo.sort(key=lambda r: (0 if r["sector"] in P.CORE_SECTORS else 1, -r["prefilter_score"]))
    skipped = todo[MAX_LEMAN:]
    todo = todo[:MAX_LEMAN]
    log(f"{len(done)} repris du cache, {len(todo)} nouveaux à analyser"
        + (f", {len(skipped)} reportés au prochain run (plafond {MAX_LEMAN})" if skipped else ""))

    if args.no_ai:
        for r in todo:
            r.update({"verdict": "MAYBE", "typology": r["sector"],
                      "fit": "CORE" if r["sector"] in P.CORE_SECTORS else "PARTNER"})
        analysed = todo
    elif todo:
        model = os.environ.get("LEMAN_MODEL", "gpt-4o")
        light = os.environ.get("LEMAN_MODEL_LIGHT", "gpt-4o-mini")
        analysed = leman_run(todo, model, light)
        analysed = [r for r in analysed if r.get("analysed")] or analysed
    else:
        analysed = []
    for r in analysed:
        r["first_seen"] = str(TODAY)

    df = pd.DataFrame(done + analysed)
    for col in ANALYSIS_FIELDS + ["first_seen", "buyer_profile_uri", "dce_url"]:
        if col not in df.columns:
            df[col] = None
    deep = sum(1 for u in df["dce_url"] if isinstance(u, str) and is_deep_link(u))
    log(f"Dossiers de consultation : {deep} liens directs sur {len(df)} avis")
    # au tout premier run, rien n'est "nouveau" : tout vient d'être découvert d'un coup
    df["is_new"] = (df["first_seen"].astype(str) == str(TODAY)) & (not first_run)
    df["sector"] = df["typology"]
    df["relevance_score"] = pd.to_numeric(df["relevance_score"], errors="coerce").fillna(50)
    df["final_score"] = (df["relevance_score"]
                         + df["verdict"].map({"GO": 20, "MAYBE": 5}).fillna(0)
                         - (df["fit"] == "PARTNER") * 15
                         - (df["contract_type"] == "DESIGN_BUILD") * 40).clip(0, 100).round().astype(int)
    df = df.sort_values(["final_score"], ascending=False)

    df.drop(columns=["full_text"], errors="ignore").to_csv(FEED_CSV, index=False, encoding="utf-8-sig")
    log(f"Feed : {FEED_CSV}")
    log(f"Verdicts : {df['verdict'].value_counts().to_dict()}")
    log(f"Groupes : {df['fit'].value_counts().to_dict()}")
    log(f"Typologies : {df['typology'].value_counts().to_dict()}")

    write_rundown(df)

    if not args.no_upload and not args.no_ai:
        platform_upload(df)
        try:
            supabase_upload(df[df["fit"] == "CORE"])   # ancien feed du site : cœur de métier seulement
        except Exception as e:
            log(f"Ancien feed (table tenders) non mis à jour : {e}")

    log("\nTerminé.")


if __name__ == "__main__":
    main()
