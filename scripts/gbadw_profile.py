"""
KRIBBL — Profil unique GIL BARTOLOME ADW

Tout le ciblage du pipeline vit ici. Pour affiner Kribbl, on modifie ce
fichier, pas le code du pipeline.

Les mots-clés sont écrits en minuscules SANS accents ni apostrophes
(le texte des avis est normalisé de la même façon avant comparaison).
Chaque mot-clé est cherché comme mot entier ("metro" ne matche pas "metropole").
Un astérisque final en fait un préfixe ("psychiatri*" matche psychiatrie, psychiatrique).

Cibles (septembre 2026, demande de Pablo et Jaime) :
  1. TRANSPORT    gares, pôles d'échanges, aéroports, parkings de gare, métro, tram,
                  et schémas directeurs / plans-guides de transport
  2. MAINTENANCE  bâtiments industriels, de maintenance et d'exploitation
                  (dépôts, ateliers, centres techniques, logistique)
  3. HEALTH       tous les bâtiments liés à la santé, sans taille minimale
                  (centres et maisons de santé, hôpitaux, cliniques, EHPAD,
                  médico-social, psychiatrie, rééducation, laboratoires)

Type de contrat : chaque avis reçoit un type, affiché en tête de fiche.
  ARCHITECT_LED  concours ou marché de maîtrise d'œuvre, l'architecte est mandataire (modèle GBADW)
  STUDY          étude, schéma directeur, AMO de planification
  DESIGN_BUILD   conception-réalisation ou marché global : une entreprise de travaux
                 mène l'équipe, l'architecte est sous-traitant. Gardé dans le feed
                 mais signalé clairement et jamais GO.
Toujours exclus : marchés de travaux seuls, fournitures, services hors conception.
"""

AGENCY = {
    "name": "GIL BARTOLOME ADW",
    "legal_country": "ES",
    "city": "Madrid",
    "founders": "Pablo Gil, Jaime Bartolomé",
    "specialty": "Architecture d'infrastructures de transport (aéroports, gares, bases de maintenance ferroviaire)",
    "target_sectors": ["TRANSPORT", "MAINTENANCE", "HEALTH"],
    # Situation d'exercice en France (utilisée par Leman pour juger l'éligibilité)
    "france_eligibility": (
        "Agence espagnole. Les associés sont architectes diplômés en Espagne et inscrits au COA "
        "(reconnaissance automatique directive 2005/36/CE) : GBADW peut être mandataire en France "
        "via une déclaration de libre prestation de services auprès de l'Ordre des architectes "
        "(article 10-1 de la loi de 1977), ou candidater avec une agence française partenaire. "
        "Pas encore de structure française (SAS en projet). GBADW refuse d'être architecte "
        "sous-traitant d'une entreprise de travaux : la conception-réalisation n'est pas son modèle."
    ),
}

# ---------------------------------------------------------------------------
# RÉFÉRENCES GBADW (portfolio général, juin 2026). Montants à confirmer.
# ---------------------------------------------------------------------------
REFERENCES = [
    {"name": "Base de maintenance ferroviaire de Ronda", "type": "MAINTENANCE", "location": "Ronda (Espagne), ADIF",
     "year": 2024, "amount": "à confirmer (4 M€ ou 28 M€ selon le portfolio), 2 400 m²",
     "role": "architecte : conception, études détaillées, suivi de chantier"},
    {"name": "Base de maintenance de Málaga", "type": "MAINTENANCE", "location": "Málaga (Espagne), ADIF",
     "year": 2024, "amount": "3,6 M€", "role": "architecte : conception et études détaillées"},
    {"name": "Entrepôt ferroviaire de Valencia", "type": "MAINTENANCE", "location": "Valencia (Espagne), ADIF",
     "year": 2024, "amount": "4,2 M€", "role": "architecte : conception et études détaillées"},
    {"name": "Ateliers de maintenance de Barcelone et Tarragone", "type": "MAINTENANCE", "location": "Espagne, ADIF",
     "year": 2025, "amount": "0,42 M€ et 0,52 M€", "role": "architecte : conception et études détaillées"},
    {"name": "Gare de Dos Hermanas", "type": "TRANSPORT", "location": "Séville (Espagne), ADIF",
     "year": 2024, "amount": "9,5 M€ (à confirmer)", "role": "architecte principal, en chantier"},
    {"name": "Gare de Montoro", "type": "TRANSPORT", "location": "Cordoue (Espagne), ADIF",
     "year": 2024, "amount": "7,3 M€", "role": "architecte, en cours"},
    {"name": "Stations de métro Sant Andreu et El Clot", "type": "TRANSPORT", "location": "Barcelone, ADIF",
     "year": 2022, "amount": "19,45 M€ et 6,3 M€", "role": "conception et architecture intérieure"},
    {"name": "Extension de l'aéroport Allama Iqbal", "type": "TRANSPORT", "location": "Lahore (Pakistan)",
     "year": 2015, "amount": "420 M€, 320 000 m²", "role": "plan-guide (masterplan), conception, études techniques"},
    {"name": "Extension de l'aéroport de Dammam", "type": "TRANSPORT", "location": "Arabie saoudite",
     "year": 2024, "amount": "650 M€", "role": "plan-guide, conception, planification du terminal"},
    {"name": "Terminal T5 de Riyad", "type": "TRANSPORT", "location": "Arabie saoudite",
     "year": 2023, "amount": "875 M€", "role": "planification"},
    {"name": "Aéroport Silvio Pettirossi", "type": "TRANSPORT", "location": "Asunción (Paraguay)",
     "year": 2019, "amount": "54,6 M€", "role": "conception fonctionnelle et esquisse, livré"},
    {"name": "Hôpital général de La Corogne (concours non lauréat)", "type": "HEALTH", "location": "Espagne",
     "year": 2021, "amount": "140 000 m²", "role": "conception (concours restreint)"},
]

# ---------------------------------------------------------------------------
# Secteurs cibles
#   strong = signal clair (poids 3)
#   weak   = signal ambigu, ne suffit pas seul (poids 1)
# Un avis est retenu pour un secteur si son score >= SECTOR_MIN_SCORE
# (les occurrences dans le titre comptent double).
# ---------------------------------------------------------------------------
SECTOR_MIN_SCORE = 3

SECTOR_LABELS = {
    "TRANSPORT": "Transport buildings and master plans",
    "MAINTENANCE": "Industrial and maintenance buildings",
    "HEALTH": "Health centres and healthcare buildings",
}

SECTORS = {
    "TRANSPORT": {
        "strong": [
            "gare", "gares", "pole d echanges", "pole d echange", "pole d echanges multimodal",
            "pole multimodal", "pem", "quartier de gare", "pole gare", "gare routiere",
            "station de metro", "stations de metro", "station de tramway", "stations de tramway",
            "aeroport", "aeroports", "aerogare", "aerodrome", "plateforme aeroportuaire",
            "terminal passagers", "gare maritime", "halte ferroviaire", "parking silo",
            "parc relais", "p+r", "serm", "rer metropolitain", "tramway", "teleporte*",
            "schema directeur", "plan guide", "plan-guide", "masterplan", "master plan",
        ],
        "weak": [
            "transport", "transports", "ferroviaire", "metro", "bhns", "parking", "port", "terminal",
            "stationnement", "voyageurs", "passagers", "mobilite", "mobilites",
            "intermodal", "multimodal", "programmation", "etude de faisabilite",
        ],
    },
    "MAINTENANCE": {
        "strong": [
            "centre technique", "centres techniques", "centre technique municipal",
            "centre technique communautaire", "centre technique departemental",
            "centre d exploitation", "centre d entretien", "centre routier",
            "atelier municipal", "ateliers municipaux", "services techniques",
            "atelier de maintenance", "ateliers de maintenance", "base de maintenance",
            "centre de maintenance", "site de maintenance", "technicentre",
            "depot de bus", "depot bus", "centre bus", "remisage", "garage de bus",
            "depot de tramway", "depot tram", "atelier de remisage",
            "batiment industriel", "batiments industriels", "batiment d activites", "hotel d entreprises",
            "garage", "garages", "hangar", "hangars", "entrepot", "entrepots",
            "plateforme logistique", "centre de secours", "caserne de pompiers",
            "centre d incendie et de secours", "sdis", "cis",
            "cuisine centrale", "centre de tri", "dechetterie", "centre de collecte",
            "station de lavage",
        ],
        "weak": [
            "atelier", "ateliers", "logistique", "stockage", "vehicules", "engins", "industriel",
        ],
    },
    "HEALTH": {
        "strong": [
            # soins de proximité
            "maison de sante", "maisons de sante", "maison de sante pluriprofessionnelle", "msp",
            "centre de sante", "centres de sante", "pole de sante", "pole sante", "pole medical",
            "centre medical", "cabinet medical", "maison medicale", "centre de soins", "dispensaire",
            "maison de naissance", "pmi", "protection maternelle", "centre de vaccination",
            # hospitalier
            "hopital", "hopitaux", "hospitalier", "hospitaliere", "hospitaliers", "centre hospitalier",
            "chu", "chr", "ght", "clinique", "cliniques", "etablissement de sante",
            "urgences", "plateau technique", "bloc operatoire", "blocs operatoires", "maternite",
            "imagerie medicale", "radiotherapie", "dialyse", "hopital de jour", "unite de soins",
            "soins de suite", "ssr", "usld", "centre de reeducation", "reeducation",
            "pharmacie a usage interieur", "laboratoire d analyses", "biologie medicale",
            # santé mentale
            "psychiatri*", "centre medico psychologique", "cmp", "cattp", "sante mentale",
            # médico-social et personnes âgées
            "ehpad", "residence autonomie", "maison de retraite", "medico social",
            "maison d accueil specialisee", "foyer d accueil medicalise",
            "institut medico educatif", "unite de vie", "accueil de jour",
        ],
        "weak": [
            "sante", "soins", "medical", "medicale", "medicaux", "patients", "lits",
            "therapeutique", "pharmacie", "laboratoire", "cabinet", "ime", "mas", "fam",
        ],
    },
}

# Les termes de planification seuls (schéma directeur, masterplan) ne classent un avis
# en TRANSPORT que s'il contient aussi un terme de transport.
TRANSPORT_TERMS = [
    "aeroport", "aeroports", "aerogare", "aerodrome", "aeroportuaire", "gare", "gares",
    "pole d echanges", "pole d echange", "pole multimodal", "pem", "gare routiere", "station de metro",
    "terminal passagers", "gare maritime", "ferroviaire", "tramway", "metro", "bhns", "serm", "mobilite", "mobilites",
    "intermodal", "multimodal", "transport", "transports", "parking", "stationnement",
]

# ---------------------------------------------------------------------------
# Signal de mission de conception ou d'étude (au moins un requis)
# ---------------------------------------------------------------------------
MISSION_TERMS = [
    "maitrise d oeuvre", "maitrise d uvre", "maitre d oeuvre", "moe", "concours", "architecte",
    "architecture", "architectural", "esquisse", "mission de base", "loi mop", "conception",
    "schema directeur", "plan guide", "masterplan", "master plan", "plan de composition",
    "etude de programmation", "programmation", "etude de faisabilite", "etudes de faisabilite",
    "etude urbaine", "etude de definition",
]

# Études de planification : on les garde même en AMO
PLANNING_TERMS = [
    "schema directeur", "plan guide", "masterplan", "master plan", "plan de composition",
    "plan de developpement", "etude de programmation", "programmation", "etude de faisabilite",
    "etudes de faisabilite", "etude de definition",
]

# CPV de conception : un seul suffit comme signal de mission
MISSION_CPV_PREFIXES = ("71000000", "712", "7122", "7124", "714", "71221", "71311", "71322", "71241")

# ---------------------------------------------------------------------------
# Type de contrat
# DESIGN_BUILD n'est plus exclu : l'avis est gardé et marqué "DESIGN-AND-BUILD"
# (cherché dans le titre, la procédure et le début du texte de l'avis).
# ---------------------------------------------------------------------------
DESIGN_BUILD_TERMS = [
    "conception realisation", "conception construction", "marche global", "marches globaux",
    "marche global de performance", "marche global sectoriel", "mgp", "mgs", "crem", "remc",
    "conception realisation exploitation maintenance", "design and build", "design build",
]

CONTRACT_LABELS = {
    "ARCHITECT_LED": "Architect-led (GBADW can lead)",
    "STUDY": "Study / master plan",
    "DESIGN_BUILD": "DESIGN-AND-BUILD: contractor leads, architect is a subcontractor",
    "OTHER": "Other / unclear",
}

# ---------------------------------------------------------------------------
# Exclusions dures (sur le TITRE normalisé)
# ---------------------------------------------------------------------------
TITLE_EXCLUSIONS = [
    "fourniture", "fournitures", "nettoyage", "gardiennage", "maintenance des",
    "maintenance preventive", "entretien des", "contrat d entretien",
    "coordination sps", "coordonnateur sps", "coordonnateur de securite", "protection de la sante",
    "assistance juridique", "analyses financieres", "etude d opportunite",
    "etudes d opportunite", "appui a l animation", "csps", "coordination en matiere de securite",
    "controle technique", "diagnostic amiante", "diagnostics amiante",
    "reperage amiante", "geotechni*", "etude de sol", "etudes de sol",
    "topograph*", "geometre*", "releves", "assurance", "dommages ouvrage",
    "logiciel", "informatique", "restauration collective", "location de",
    "transport scolaire", "transport de personnes", "transport de voyageurs",
    "transport a la demande", "transport sanitaire", "ordonnancement pilotage", "opc", "formation",
    "collecte des dechets", "exploitation de", "delegation de service public",
    "travaux de voirie", "marquage", "signalisation", "carburant",
    "prestations de controle", "bureau de controle", "audit energetique",
    "diagnostic structure", "desamiantage", "demolition",
    "mise en accessibilite", "mise en conformite", "achat de", "acquisition de",
    "equipements medicaux", "materiel medical", "dispositifs medicaux", "medicaments",
]

# AMO sans maîtrise d'œuvre = NO, sauf pour les études de planification
AMO_TERMS = ["assistance a maitrise d ouvrage", "amo"]

# Natures BOAMP à rejeter
EXCLUDED_NATURE_FRAGMENTS = ["ATTRIBUTION", "RECTIF", "ANNUL", "RESULTAT", "MODIF"]

# ---------------------------------------------------------------------------
# Règles de verdict transmises à Leman
# ---------------------------------------------------------------------------
VERDICT_RULES = """
Modèle GBADW : l'agence veut être l'architecte mandataire (concours d'architecture, marché de
maîtrise d'œuvre) ou le prestataire principal d'une étude de planification.

Type de contrat (contract_type), à déterminer en premier et avec soin :
- ARCHITECT_LED : concours ou marché de maîtrise d'œuvre, l'architecte est mandataire.
- STUDY : étude, schéma directeur, plan-guide, programmation.
- DESIGN_BUILD : conception-réalisation, marché global (MGP, MGS, CREM), ou toute équipe menée
  par une entreprise de travaux où l'architecte est sous-traitant ou cotraitant.
- OTHER : autre ou impossible à dire.

GO (uniquement ARCHITECT_LED ou STUDY) :
- Projet dans une des trois cibles :
  TRANSPORT : gares, haltes, pôles d'échanges multimodaux, gares routières, stations de métro
    ou de tram, aéroports, parkings silo et parcs relais liés au transport, et schémas
    directeurs, plans-guides, études de programmation ou de faisabilité pour ces ouvrages ;
  MAINTENANCE : bâtiments industriels, centres techniques, ateliers et bases de maintenance,
    dépôts de bus ou de tramway, garages, centres d'exploitation, casernes de secours,
    bâtiments logistiques ;
  HEALTH : tout bâtiment lié à la santé, quelle que soit la taille : maisons et centres de
    santé, pôles médicaux, hôpitaux, cliniques, urgences, plateaux techniques, EHPAD,
    établissements médico-sociaux, psychiatrie, rééducation, laboratoires.
- Petits projets bienvenus, pas de montant minimum.
- Références exigées compatibles avec celles de GBADW, ou apportables par un cotraitant.

MAYBE :
- ARCHITECT_LED ou STUDY dans les cibles, mais références exigées que GBADW n'a pas
  (ex. EHPAD ou hôpitaux livrés de moins de 5 ans) : à monter avec une agence française.
- Étude de transport où l'architecture n'est qu'une partie de l'équipe.
- DESIGN_BUILD dans les cibles : jamais GO, toujours MAYBE au maximum, pour information
  seulement. Le premier point bloquant doit dire que l'équipe est menée par une entreprise
  de travaux et que GBADW serait sous-traitant.

NO :
- Marché de travaux seuls ou de fournitures.
- Hors des trois cibles (logement, scolaire, sport, culture, bureaux, voirie seule…).
- AMO seule hors schéma directeur, OPC, CSPS, contrôle technique, diagnostics, sols.
- Mission d'ingénierie pure sans rôle d'architecte ou de planificateur.
"""

# ---------------------------------------------------------------------------
# Boucle de correction : chaque verdict contesté par Romain, Pablo ou Jaime
# s'ajoute ici et part dans le prompt de Leman comme exemple.
# ---------------------------------------------------------------------------
FEEDBACK_EXAMPLES = [
    {"title": "Marché de conception-réalisation pour la construction d'un site de maintenance et de remisage ferroviaire (Région Occitanie)",
     "contract_type": "DESIGN_BUILD",
     "verdict": "MAYBE",
     "reason": "Programme dans la cible, mais équipe menée par une entreprise de travaux ferroviaires : "
               "GBADW refuse d'y être architecte sous-traitant. À afficher seulement pour information."},
    {"title": "Concours restreint de maîtrise d'œuvre, pôle d'échange multimodal de la Pilleuse (Grand Annecy)",
     "contract_type": "ARCHITECT_LED",
     "verdict": "GO",
     "reason": "Concours entre architectes pour un bâtiment de transport : exactement le modèle GBADW."},
    {"title": "Concours restreint de maîtrise d'œuvre pour la construction d'une extension de 48 lits d'EHPAD (CHU Limoges)",
     "contract_type": "ARCHITECT_LED",
     "verdict": "MAYBE",
     "reason": "Bon programme santé, mais 4 EHPAD livrés de moins de 5 ans exigés : seulement avec une agence française spécialisée."},
]
