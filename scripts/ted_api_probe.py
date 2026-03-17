"""
scripts/ted_api_probe.py
────────────────────────────────────────────────────────────────────────────────
Probe MINIMAL v4 — TED Search API v3 — Query syntax corrigée
Ne modifie aucun autre script du projet.

Historique des erreurs résolues :
  v1 : champs "notice-title" / "buyer-name" → 400 unsupported
  v2 : champs "ND" / "PD" / "CONTENT"       → 400 unsupported
  v3 : fields absent                          → 400 "must not be empty"
  v3 : query cpv=[...]                        → QUERY_SYNTAX_ERROR col 4

Cause de l'erreur actuelle (QUERY_SYNTAX_ERROR at col 4) :
  L'opérateur "[" n'est pas valide dans l'API v3.
  La syntaxe correcte pour les multi-valeurs est : IN (val1 val2 ...)
  Source confirmée : workshops TED reusers Q&A 2023 (Publications Office EU)
  Exemple officiel : classification-cpv IN (71000000)

Champs utilisés dans ce probe :
  Tous extraits de la vraie liste retournée par l'erreur 400 (probe v3).
  Aucun champ inventé.
    notice-title    → titre de l'avis
    buyer-name      → nom de l'acheteur
    buyer-country   → pays de l'acheteur
    description-lot → description du lot
    contract-url    → URL du contrat

Stratégie :
  APPEL 1 : query la plus simple possible sans filtre de date ni opérateur
            → valider que l'endpoint répond 200 avec ces champs
  APPEL 2 : query avec filtre CPV (syntaxe IN)
  APPEL 3 : query avec filtre CPV + date (si appel 2 réussit)

Usage :
  pip install requests
  python scripts/ted_api_probe.py
────────────────────────────────────────────────────────────────────────────────
"""

import json
import requests

URL     = "https://api.ted.europa.eu/v3/notices/search"
HEADERS = {"Content-Type": "application/json", "Accept": "application/json"}

# Champs confirmés depuis la liste extraite en probe v3 — aucun inventé
FIELDS = [
    "notice-title",
    "buyer-name",
    "buyer-country",
    "description-lot",
    "contract-url",
]

SEP  = "─" * 64
SEP2 = "=" * 64


# ── Appel générique ───────────────────────────────────────────────────────────

def call(query: str, label: str) -> dict | None:
    payload = {
        "query": query,
        "fields": FIELDS,
        "page": 1,
        "limit": 3,
        "scope": "ALL",
        "paginationMode": "PAGE_NUMBER",
    }

    print(f"\n{SEP2}")
    print(f"  {label}")
    print(SEP2)
    print(f"\n  Payload envoyé :")
    print(json.dumps(payload, indent=4, ensure_ascii=False))

    try:
        r = requests.post(URL, headers=HEADERS, json=payload, timeout=20)
    except requests.ConnectionError as e:
        print(f"\n  [ERREUR FATALE] Connexion impossible : {e}")
        return None

    print(f"\n  Status HTTP : {r.status_code}")

    if r.status_code != 200:
        print(f"\n  Corps d'erreur complet :")
        print(r.text)
        return None

    try:
        data = r.json()
    except ValueError:
        print(f"\n  Réponse non-JSON :\n{r.text}")
        return None

    total   = data.get("total", data.get("totalNoticeCount", "?"))
    results = data.get("results", data.get("notices", []))

    print(f"\n  Total notices matchées : {total}")
    print(f"  Notices dans ce batch  : {len(results)}")

    if not results:
        print("\n  Requête valide mais aucun résultat.")
        return data

    # JSON complet de la notice 1
    print(f"\n{SEP}")
    print("  JSON COMPLET — notice 1")
    print(SEP)
    print(json.dumps(results[0], indent=2, ensure_ascii=False))

    # Résumé champ par champ
    print(f"\n{SEP}")
    print("  RÉSUMÉ CHAMP PAR CHAMP — notice 1")
    print(SEP)
    for k, v in results[0].items():
        icon  = "✓" if v else "✗"
        val   = str(v) if not isinstance(v, (dict, list)) else json.dumps(v, ensure_ascii=False)
        print(f"  {icon}  {k:<30}  {val[:80]}")

    return results


# ── Verdict ───────────────────────────────────────────────────────────────────

def verdict(r1, r2, r3):
    print(f"\n{SEP2}")
    print("  VERDICT GLOBAL")
    print(SEP2)

    # Trouver le premier appel qui a renvoyé des résultats
    successful = None
    for label, result in [("Appel 1 (query vide)", r1),
                           ("Appel 2 (CPV IN)", r2),
                           ("Appel 3 (CPV + date)", r3)]:
        if isinstance(result, list) and result:
            successful = (label, result[0])
            break

    if successful is None:
        print("""
❌  Aucun appel n'a retourné de résultats.
   → Si les 3 appels ont eu 200 mais 0 résultats : CPV trop restreint, élargir.
   → Si certains ont eu 400 : lire les corps d'erreur ci-dessus.
   → Tester manuellement : https://api.ted.europa.eu/swagger-ui/
""")
        return

    label, first = successful
    nonempty = {k: v for k, v in first.items() if v}
    empty    = [k for k, v in first.items() if not v]

    print(f"""
✅  Premier appel réussi : {label}

   Champs non-vides sur la notice 1 :""")
    for k, v in nonempty.items():
        val = str(v) if not isinstance(v, (dict, list)) else json.dumps(v, ensure_ascii=False)
        print(f"     {k:<30}  {val[:80]}")

    if empty:
        print(f"\n   Champs vides : {empty}")

    print(f"""
   → Utiliser ces noms exacts dans 02_ted_scraper.py.
   → Mapping vers le schéma canonique :
       title      ← notice-title  (si non-vide)
       buyer_name ← buyer-name    (si non-vide)
       country    ← buyer-country (si non-vide)
       raw_text   ← description-lot (si non-vide)
       url        ← contract-url  (si non-vide)
""")


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"\n{SEP2}")
    print("  TED Search API v3 — PROBE QUERY SYNTAX v4")
    print(f"  Endpoint : {URL}")
    print(f"  Champs   : {FIELDS}")
    print(SEP2)

    # Appel 1 : query minimale — juste un champ avec wildcard
    # Syntaxe la plus simple possible pour valider l'endpoint
    r1 = call(
        query="publication-number=*",
        label="APPEL 1 — Query minimale (publication-number=*)",
    )

    # Appel 2 : filtre CPV avec syntaxe IN confirmée par les workshops TED
    # Source : Publications Office Q&A workshops 2023
    r2 = call(
        query="classification-cpv IN (71200000 71220000 71400000)",
        label="APPEL 2 — Filtre CPV (syntaxe IN)",
    )

    # Appel 3 : CPV + date — seulement si appel 2 réussit
    if isinstance(r2, list) and r2 is not None:
        r3 = call(
            query="classification-cpv IN (71200000 71220000 71400000) AND publication-date >= 20250101",
            label="APPEL 3 — CPV + filtre date",
        )
    elif isinstance(r2, dict):
        # 200 mais 0 résultats — tenter quand même avec date
        r3 = call(
            query="classification-cpv IN (71200000 71220000 71400000) AND publication-date >= 20250101",
            label="APPEL 3 — CPV + filtre date",
        )
    else:
        print(f"\n{SEP2}")
        print("  APPEL 3 — Ignoré (appel 2 a échoué)")
        print(SEP2)
        r3 = None

    verdict(r1, r2, r3)