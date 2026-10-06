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

Toutes typologies (octobre 2026) : Pablo et Jaime veulent voir TOUT ce qui sort en
architecture, pas seulement les trois cibles. Chaque avis reçoit donc :
  typology  le type de bâtiment (EDUCATION, HOUSING, SPORT, CULTURE... ou une des 3 cibles)
  fit       CORE     cœur de métier GBADW (les 3 cibles)
            PARTNER  autre typologie, jouable avec un partenaire spécialisé
            NO       pas une mission d'architecte
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

# ---------------------------------------------------------------------------
# Autres typologies (hors cibles) : gardées et classées, fit = PARTNER.
# Un avis hors cible n'est gardé que si son TITRE (ou son CPV) annonce clairement une
# mission d'architecte, pour ne pas ramasser l'informatique ou les études diverses.
# ---------------------------------------------------------------------------
CORE_SECTORS = ["TRANSPORT", "MAINTENANCE", "HEALTH"]

TYPOLOGIES = {
    "EDUCATION": [
        "ecole", "ecoles", "groupe scolaire", "college", "colleges", "lycee", "lycees", "universite",
        "campus", "creche", "multi accueil", "periscolaire", "restaurant scolaire", "cantine",
        "centre de formation", "internat", "enseignement", "maternelle", "elementaire",
        "accueil de loisirs", "pole enfance", "petite enfance", "cfa",
    ],
    "HOUSING": [
        "logements", "logement", "residence", "residences", "habitat", "habitation", "lotissement",
        "foyer de jeunes travailleurs", "residence etudiante", "pension de famille", "beguinage",
    ],
    "SPORT": [
        "gymnase", "piscine", "centre aquatique", "stade", "complexe sportif", "salle de sport",
        "salle omnisports", "equipement sportif", "halle sportive", "dojo", "patinoire", "tennis",
        "vestiaires", "tribune", "skatepark",
    ],
    "CULTURE": [
        "mediatheque", "bibliotheque", "musee", "salle de spectacle", "theatre", "conservatoire",
        "ecole de musique", "cinema", "centre culturel", "salle polyvalente", "salle des fetes",
        "tiers lieu", "espace culturel", "auditorium", "archives", "office de tourisme",
    ],
    "PUBLIC_OFFICES": [
        "mairie", "hotel de ville", "hotel de region", "hotel du departement", "siege", "bureaux",
        "tribunal", "palais de justice", "gendarmerie", "commissariat", "hotel de police",
        "centre administratif", "maison france services", "prefecture", "cite administrative",
        "maison des associations", "pole administratif",
    ],
    "HERITAGE": [
        "monument historique", "monuments historiques", "eglise", "chateau", "abbaye", "cathedrale",
        "patrimoine", "restauration du", "chapelle", "remparts",
    ],
    "COMMERCE_TOURISM": [
        "halle", "halles", "marche couvert", "commerce", "commerces", "hotel", "camping",
        "centre de congres", "parc des expositions", "restaurant", "capitainerie", "port de plaisance",
    ],
    "URBAN_LANDSCAPE": [
        "espaces publics", "espace public", "amenagement urbain", "centre bourg", "coeur de ville",
        "place", "parc", "requalification urbaine", "zac", "ecoquartier", "front de mer",
    ],
}

TYPOLOGY_LABELS = {
    "TRANSPORT": "Transport",
    "MAINTENANCE": "Industrial and maintenance",
    "HEALTH": "Healthcare",
    "EDUCATION": "Education",
    "HOUSING": "Housing",
    "SPORT": "Sport",
    "CULTURE": "Culture",
    "PUBLIC_OFFICES": "Public buildings and offices",
    "HERITAGE": "Heritage",
    "COMMERCE_TOURISM": "Commerce and tourism",
    "URBAN_LANDSCAPE": "Urban design and landscape",
    "INSPECTION": "Building inspection and audits",
    "PARTICIPATION": "Citizen participation",
    "OTHER": "Other",
}

# ---------------------------------------------------------------------------
# Deux recherches ajoutées le 6 octobre 2026 (demande de Pablo)
# ---------------------------------------------------------------------------
# Seuil de l'onglet « Plus de 10 M€ » du site (le classement reste par date limite).
MIN_WORKS_EUR = 10_000_000

# Pistes hors conception : toujours classées "cœur de métier" quand elles sont retenues.
SPECIAL_TRACKS = ["INSPECTION", "PARTICIPATION"]

# 1. Inspection et audit d'un parc de bâtiments (référence : ADIF lot 2, 100 000 m² de gares).
INSPECTION_TERMS = [
    "inspection", "inspections", "inspection des batiments", "inspections detaillees",
    "audit technique", "audits techniques", "audit du patrimoine", "audit patrimonial",
    "audit immobilier", "audits immobiliers", "audit batimentaire", "audits batimentaires",
    "diagnostic technique", "diagnostics techniques", "diagnostic du patrimoine",
    "diagnostic batimentaire", "diagnostics batimentaires", "diagnostic immobilier",
    "diagnostic technique global", "etat du patrimoine", "etat des lieux du patrimoine",
    "schema directeur immobilier", "schema directeur patrimonial", "schema directeur du patrimoine",
    "strategie patrimoniale", "strategie immobiliere", "plan pluriannuel de travaux",
    "plan pluriannuel d investissement", "carnet de sante", "visites periodiques",
    "visites techniques", "cotation de l etat", "connaissance du patrimoine",
]
INSPECTION_CONTEXT = [
    "batiment", "batiments", "patrimoine bati", "patrimoine immobilier", "parc immobilier",
    "gares", "gare", "sites", "etablissements", "colleges", "lycees", "immeubles", "ouvrages batis",
]
# Titres à écarter : contrôles réglementaires et diagnostics d'un seul lot technique.
INSPECTION_EXCLUSIONS = [
    "controle technique", "bureau de controle", "amiante", "plomb", "termites", "ascenseur*",
    "vehicule*", "extincteur*", "legionel*", "radon", "aires de jeux", "aire de jeux",
    "assainissement", "canalisation*", "reseaux", "reseau", "eau potable", "ouvrages d art",
    "ouvrage d art", "ponts", "pont", "chaussee*", "voirie*", "eclairage public", "installations electriques",
    "installations gaz", "paratonnerre*", "portes automatiques", "alimentaire*", "sanitaire des",
    "du travail", "fiscal*", "comptable*", "financier*", "informatique", "logiciel", "arbres",
    "fourniture", "fournitures", "nettoyage", "coordination sps", "geotechni*", "topograph*",
]
INSPECTION_CPV_PREFIXES = ("71315400", "71631300", "71315300", "71631000")

# 2. Budgets participatifs et participation citoyenne, sur toute l'Europe
#    (référence : Barakaldo, CPV 98300000-6). Termes sans accents, comme tout le préfiltre.
PARTICIPATION_CPV = "98300000"
PARTICIPATION_STRONG = [
    "budget participatif", "budgets participatifs", "presupuesto participativo",
    "presupuestos participativos", "participatory budget*", "bilancio partecipativo", "bilanci partecipativi",
    "orcamento participativo", "orcamentos participativos", "burgerhaushalt*", "burgerbudget*", "beteiligungshaushalt*",
    "burgerbegroting*", "participatieve begroting", "budzet obywatelski*", "budzetu obywatelskiego", "budzecie obywatelskim",
    "participativni rozpocet", "participativny rozpocet", "kozossegi koltsegvetes",
    "aurrekontu parte hartzaile*", "pressupost participatiu", "pressupostos participatius",
]
PARTICIPATION_WEAK = [
    "participation citoyenne", "concertation citoyenne", "democratie participative",
    "participacion ciudadana", "proceso participativo", "procesos participativos",
    "citizen participation", "citizen engagement", "public participation",
    "partecipazione civica", "processo partecipativo", "participacao cidada",
    "burgerbeteiligung*", "burgerparticipatie*", "gobierno abierto",
]
# Requête plein texte TED (accents conservés : c'est l'index de TED qui cherche).
PARTICIPATION_TED_PHRASES = [
    "budget participatif", "presupuesto participativo", "presupuestos participativos",
    "participatory budget", "participatory budgeting", "bilancio partecipativo",
    "orçamento participativo", "Bürgerhaushalt", "Bürgerbudget", "burgerbegroting*",
    "budżet obywatelski", "pressupost participatiu",
]

# Hors cible : titres d'infrastructure ou de lot technique seul, écartés sans appeler l'IA
NON_BUILDING_TITLE_TERMS = [
    "eau potable", "assainissement", "eaux usees", "eaux pluviales", "station d epuration", "step", "steps",
    "endiguement", "digue", "digues", "riviere", "cours d eau", "hydraulique", "fontainerie",
    "voirie", "voiries", "chaussee", "route", "routes", "rn13", "deviation", "giratoire", "carrefour",
    "enfouissement", "reseaux", "reseau de chaleur", "eclairage public", "piste cyclable", "pistes cyclables",
    "ouvrage d art", "ouvrages d art", "pont", "passerelle", "passage superieur", "passage inferieur", "tunnel",
    "chaudiere", "chaufferie", "traitement d air", "desenfumage", "ascenseur", "ascenseurs", "photovoltaique",
    "terrain synthetique", "terrain de football", "pelouse", "compteurs", "sols pollues", "depollution",
    "graphique", "impression", "maitrise d oeuvre urbaine et sociale", "mous", "relogement",
    "cimetiere", "aire de jeux", "restauration ecologique", "telecommunications", "fibre optique",
]

# Signal fort de mission d'architecte, exigé dans le TITRE pour les avis hors cible
STRICT_MOE_TERMS = [
    "concours", "maitrise d oeuvre", "maitrise d uvre", "maitre d oeuvre", "moe",
    "architecte", "architectes", "mission de base", "conception realisation",
    "equipe de maitrise", "marche global",
]
# CPV d'architecture (et pas d'ingénierie générale) : suffisent aussi hors cible
ARCHITECTURE_CPV_PREFIXES = ("7122", "71200000", "71210000", "71240000", "71250000")

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

L'agence veut aussi voir les autres typologies (scolaire, logement, sport, culture, bureaux
publics, patrimoine...) pour y répondre avec des partenaires spécialisés.

IMPORTANT : une typologie hors des trois cibles n'est JAMAIS une raison de répondre NO.
Une école, des logements, un gymnase, une médiathèque, une mairie, des bureaux : si c'est une
mission de conception d'un bâtiment avec un architecte, c'est PARTNER et MAYBE, pas NO.

architect_mission (vrai ou faux), à donner pour chaque avis :
- true : la mission porte sur la conception d'un BÂTIMENT (construction neuve, réhabilitation,
  restructuration, extension) et un architecte est attendu dans l'équipe.
- false : infrastructure, voirie, réseaux, eau, ouvrages d'art ; lot technique seul (chauffage,
  ventilation, électricité, toiture, façade seule) ; étude sans conception ; AMO, programmation,
  contrôle, diagnostics ; travaux seuls ; fournitures ; informatique.

Adéquation (fit) :
- CORE : architect_mission true (ou étude de planification) dans une des trois cibles.
- PARTNER : architect_mission true pour un bâtiment d'une autre typologie. Jouable avec un
  partenaire qui a les références.
- NO : architect_mission false.

Type de contrat (contract_type), à déterminer en premier et avec soin :
- ARCHITECT_LED : concours ou marché de maîtrise d'œuvre, l'architecte est mandataire.
- STUDY : étude, schéma directeur, plan-guide, programmation.
- DESIGN_BUILD : conception-réalisation, marché global (MGP, MGS, CREM), ou toute équipe menée
  par une entreprise de travaux où l'architecte est sous-traitant ou cotraitant.
- OTHER : autre ou impossible à dire.

Deux pistes hors conception, que l'agence veut voir (fit CORE, contract_type STUDY ou OTHER,
architect_mission sans importance pour elles) :
- INSPECTION : inspection, audit ou diagnostic technique d'un PARC de bâtiments, schéma
  directeur immobilier, plan pluriannuel de travaux. Référence de l'agence : inspection et
  catalogage de 100 000 m² de gares pour ADIF. GO si le marché porte sur l'état général de
  bâtiments ; NO pour un contrôle réglementaire (contrôle technique de construction, amiante,
  plomb, ascenseurs, électricité) ou un diagnostic limité à un seul lot technique.
- PARTICIPATION : animation, conception ou accompagnement d'un budget participatif ou d'une
  démarche de participation citoyenne, dans n'importe quel pays d'Europe. Référence de
  l'agence : budget participatif de Barakaldo (Espagne). GO si c'est l'objet principal du
  marché ; NO si la participation n'est qu'une petite partie d'un autre marché.
Pour ces deux pistes, typology vaut INSPECTION ou PARTICIPATION.

GO (uniquement ARCHITECT_LED ou STUDY, fit CORE) :
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
- Petits projets bienvenus, pas de montant minimum pour le verdict.
  Donne toujours budget_eur quand le montant des travaux est écrit dans l'avis : le site
  s'en sert pour l'onglet des opérations de plus de 10 millions d'euros.
- Références exigées compatibles avec celles de GBADW, ou apportables par un cotraitant.

MAYBE :
- ARCHITECT_LED ou STUDY dans les cibles, mais références exigées que GBADW n'a pas
  (ex. EHPAD ou hôpitaux livrés de moins de 5 ans) : à monter avec une agence française.
- Étude de transport où l'architecture n'est qu'une partie de l'équipe.
- Autre typologie (fit PARTNER), ARCHITECT_LED : toujours MAYBE, jamais GO. Dans blocking_points,
  dire quelles références de la typologie sont exigées et quel type de partenaire il faut.
- DESIGN_BUILD dans les cibles : jamais GO, toujours MAYBE au maximum, pour information
  seulement. Le premier point bloquant doit dire que l'équipe est menée par une entreprise
  de travaux et que GBADW serait sous-traitant.

- Patrimoine exigeant un architecte du patrimoine ou un architecte en chef des monuments
  historiques comme mandataire : MAYBE avec ce point bloquant, pas NO.

NO (fit NO), uniquement quand architect_mission est false :
- Marché de travaux seuls ou de fournitures.
- Voirie, réseaux ou espaces publics seuls, sans bâtiment ni mission d'architecte.
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
