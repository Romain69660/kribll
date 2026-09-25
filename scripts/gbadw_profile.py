"""
KRIBBL — Profil unique GIL BARTOLOME ADW

Tout le ciblage du pipeline vit ici. Pour affiner Kribbl, on modifie ce
fichier, pas le code du pipeline.

Les mots-clés sont écrits en minuscules SANS accents ni apostrophes
(le texte des avis est normalisé de la même façon avant comparaison).
Chaque mot-clé est cherché comme mot entier ("metro" ne matche pas "metropole").
Un astérisque final en fait un préfixe ("psychiatri*" matche psychiatrie, psychiatrique).
"""

AGENCY = {
    "name": "GIL BARTOLOME ADW",
    "legal_country": "ES",
    "city": "Madrid",
    "founders": "Pablo Gil, Jaime Bartolomé",
    "specialty": "Architecture d'infrastructures de transport",
    "target_sectors": ["TRANSPORT", "INDUSTRIAL", "HEALTH"],
    # Situation d'exercice en France (utilisée par Leman pour juger l'éligibilité)
    "france_eligibility": (
        "Agence espagnole. Les associés sont architectes diplômés en Espagne "
        "(reconnaissance automatique directive 2005/36/CE) : GBADW peut être "
        "mandataire en France via une déclaration de libre prestation de services "
        "auprès de l'Ordre des architectes, ou candidater en cotraitance avec une "
        "agence française partenaire. Pas encore de structure française (SAS en projet)."
    ),
}

# ---------------------------------------------------------------------------
# RÉFÉRENCES GBADW — À COMPLÉTER
# Leman s'en sert pour juger si l'agence a les références demandées.
# Format : {"name": ..., "type": "TRANSPORT|INDUSTRIAL|HEALTH|OTHER",
#           "location": ..., "year": ..., "amount": "montant travaux", "role": ...}
# ---------------------------------------------------------------------------
REFERENCES = [
    # {"name": "Gare de ...", "type": "TRANSPORT", "location": "Madrid", "year": 2023,
    #  "amount": "25 M€", "role": "architecte mandataire"},
]

# ---------------------------------------------------------------------------
# Secteurs cibles
#   strong = signal clair (poids 3)
#   weak   = signal ambigu, ne suffit pas seul (poids 1)
# Un avis est retenu pour un secteur si son score >= SECTOR_MIN_SCORE
# (les occurrences dans le titre comptent double).
# ---------------------------------------------------------------------------
SECTOR_MIN_SCORE = 3

SECTORS = {
    "TRANSPORT": {
        "strong": [
            "gare", "gares", "pole d echanges", "pole d echange", "pole multimodal",
            "multimodal", "intermodal", "station de metro", "stations de metro",
            "metro", "tramway", "bhns", "bus a haut niveau de service",
            "gare routiere", "depot de bus", "centre bus", "remisage",
            "atelier de maintenance des", "centre de maintenance des rames",
            "technicentre", "sncf", "ratp", "societe des grands projets",
            "societe du grand paris", "grand paris express", "ferroviaire",
            "aeroport", "aerogare", "gare maritime", "terminal passagers",
            "passerelle", "viaduc", "ouvrage d art", "ouvrages d art",
            "franchissement", "parc relais", "parking relais", "teleferique",
            "transport par cable", "infrastructure de transport",
            "infrastructures de transport", "halte ferroviaire", "rer",
            "ligne nouvelle", "pole gare", "quartier de gare",
        ],
        "weak": [
            "pont", "mobilite", "mobilites", "terminal", "port", "parking",
            "stationnement", "voirie", "aire de covoiturage", "peage",
            "autoroute", "velo", "cyclable",
        ],
    },
    "INDUSTRIAL": {
        "strong": [
            "batiment industriel", "batiments industriels", "usine", "usines",
            "site industriel", "unite de production", "batiment de production",
            "atelier de production", "plateforme logistique", "entrepot",
            "entrepots", "hangar", "data center", "datacenter",
            "centre de donnees", "station d epuration", "usine de traitement",
            "unite de valorisation", "centre de tri", "unite de methanisation",
            "valorisation energetique", "incinerat*", "chaufferie biomasse",
            "centre technique", "centre d exploitation", "centre d entretien",
            "atelier municipal", "ateliers municipaux", "centre technique municipal",
            "hotel d entreprises", "halle industrielle", "cuisine centrale",
            "industriel", "industrielle", "manufacture",
        ],
        "weak": [
            "atelier", "ateliers", "logistique", "stockage", "laboratoire",
            "dechetterie", "zone d activites",
        ],
    },
    "HEALTH": {
        "strong": [
            "hopital", "hopitaux", "hospitalier", "hospitaliere", "hospitaliers", "hospitalieres", "centre hospitalier",
            "chu", "chr", "chru", "clinique", "ehpad", "maison de sante",
            "pole de sante", "centre de sante", "bloc operatoire", "plateau technique",
            "urgences", "imagerie medicale", "radiotherapie", "psychiatri*", "groupement hospitalier", "ght", "medico social",
            "usld", "maternite", "centre de reeducation", "ap hp", "aphp",
            "hospices civils", "etablissement de sante", "soins de suite",
            "sante mentale",
        ],
        "weak": [
            "sante", "sanitaire", "soins", "medical", "medicale", "laboratoire",
            "pharmacie", "residence autonomie", "ime", "mas", "fam",
        ],
    },
}

# ---------------------------------------------------------------------------
# Signal de mission de conception (au moins un requis)
# ---------------------------------------------------------------------------
MISSION_TERMS = [
    "maitrise d oeuvre", "maitrise d uvre", "maitre d oeuvre", "moe", "concours", "architecte",
    "architecture", "architectural", "conception realisation",
    "conception construction", "marche global de performance", "marche global",
    "esquisse", "mission de base", "loi mop", "conception",
]

# CPV de conception : un seul suffit comme signal de mission
MISSION_CPV_PREFIXES = ("71000000", "712", "7122", "7124", "714", "71221", "71311", "71322")

# ---------------------------------------------------------------------------
# Exclusions dures (sur le TITRE normalisé)
# ---------------------------------------------------------------------------
TITLE_EXCLUSIONS = [
    "fourniture", "fournitures", "nettoyage", "gardiennage", "maintenance des",
    "maintenance preventive", "entretien des", "contrat d entretien",
    "coordination sps", "coordonnateur sps", "coordonnateur de securite", "protection de la sante",
    "assistance juridique", "assistance technique", "analyses financieres", "etude d opportunite",
    "etudes d opportunite", "appui a l animation", "csps", "coordination en matiere de securite",
    "controle technique", "diagnostic amiante", "diagnostics amiante",
    "reperage amiante", "geotechni*", "etude de sol", "etudes de sol",
    "topograph*", "geometre*", "releves", "assurance", "dommages ouvrage",
    "logiciel", "informatique", "restauration collective", "location de",
    "transport scolaire", "transport de personnes", "transport de voyageurs",
    "transport a la demande", "ordonnancement pilotage", "opc", "formation",
    "collecte des dechets", "exploitation de", "delegation de service public",
    "travaux de voirie", "marquage", "signalisation", "carburant",
    "prestations de controle", "bureau de controle", "audit energetique",
    "diagnostic structure", "desamiantage", "demolition",
    "mise en accessibilite", "mise en conformite",
]

# AMO sans maîtrise d'œuvre = NO
AMO_TERMS = ["assistance a maitrise d ouvrage", "amo"]

# Natures BOAMP à rejeter
EXCLUDED_NATURE_FRAGMENTS = ["ATTRIBUTION", "RECTIF", "ANNUL", "RESULTAT", "MODIF"]

# ---------------------------------------------------------------------------
# Règles de verdict transmises à Leman
# ---------------------------------------------------------------------------
VERDICT_RULES = """
GO :
- Concours ou marché de maîtrise d'œuvre avec mission de conception architecturale
- Programme clairement dans un des trois secteurs : TRANSPORT (gares, PEM, stations,
  ponts/passerelles, dépôts et ateliers de maintenance, aérogares), INDUSTRIAL
  (usines, bâtiments de production, logistique, centres techniques, data centers,
  unités de traitement eau/déchets/énergie) ou HEALTH (hôpitaux, CHU, cliniques,
  EHPAD, maisons de santé, plateaux techniques)
- L'architecture est un enjeu réel (pas une mission purement technique)
- Une agence européenne peut candidater (mandataire via LPS ou cotraitance)

MAYBE :
- Conception-réalisation ou marché global où GBADW serait architecte cotraitant
- Programme mixte avec une composante forte dans un des trois secteurs
- Mission MOE pertinente mais petite échelle ou très technique
- Exigences de références ou de chiffre d'affaires potentiellement bloquantes

NO :
- Hors des trois secteurs (logement, scolaire, sport, culture, bureaux…)
- AMO seule, OPC, CSPS, contrôle technique, diagnostics, études de sol, lots travaux
- Mission d'ingénierie pure sans rôle d'architecte
- Petite réhabilitation / mise aux normes sans enjeu architectural
- Montant manifestement trop faible (< 40 k€ d'honoraires)
"""

# ---------------------------------------------------------------------------
# Boucle de correction : chaque verdict contesté par Romain ou Pablo
# s'ajoute ici et part dans le prompt de Leman comme exemple.
# ---------------------------------------------------------------------------
FEEDBACK_EXAMPLES = [
    # {"title": "...", "verdict": "NO", "reason": "..."},
]
