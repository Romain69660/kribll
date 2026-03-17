import os
import pandas as pd

print("====================================")
print("KRIBLL MASTER FEED — BOAMP + TED")
print("====================================")

# -----------------------------------
# Paths
# -----------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

BOAMP_FILE = os.path.join(DATA_DIR, "kribll_boamp_v6.csv")
TED_FILE = os.path.join(DATA_DIR, "kribll_ted_archi.csv")
OUTPUT_FILE = os.path.join(DATA_DIR, "kribll_results.csv")

# -----------------------------------
# Canonical output schema
# -----------------------------------

CANONICAL_COLUMNS = [
    "title",
    "buyer_name",
    "publication_date",
    "publication_number",
    "country",
    "category",
    "priority_bucket",
    "cpv_code",
    "url",
    "source",
    "raw_text",
]

# -----------------------------------
# Helpers
# -----------------------------------

def clean_columns(df):
    df = df.copy()
    df.columns = df.columns.str.strip().str.lower()
    return df

def safe_text(value):
    if pd.isna(value):
        return ""
    return str(value).strip()

def first_non_empty(row, candidates):
    for col in candidates:
        if col in row.index:
            value = safe_text(row[col])
            if value != "":
                return value
    return ""

def build_raw_text(row, candidates):
    parts = []
    for col in candidates:
        if col in row.index:
            value = safe_text(row[col])
            if value != "":
                parts.append(value)
    return " | ".join(parts)

def normalize_boamp(df):
    df = clean_columns(df)
    rows = []

    for _, row in df.iterrows():
        item = {
            "title": first_non_empty(row, ["titre", "title", "objet"]),
            "buyer_name": first_non_empty(row, ["acheteur", "buyer_name"]),
            "publication_date": first_non_empty(row, ["date_publication", "publication_date"]),
            "publication_number": first_non_empty(row, ["idweb", "publication_number"]),
            "country": "France",
            "category": first_non_empty(row, ["category", "nature", "type_marche"]),
            "priority_bucket": first_non_empty(row, ["priority_bucket"]),
            "cpv_code": first_non_empty(row, ["cpv_codes", "cpv_code"]),
            "url": first_non_empty(row, ["url"]),
            "source": "BOAMP",
            "raw_text": build_raw_text(
                row,
                [
                    "titre",
                    "descripteurs",
                    "nature",
                    "type_marche",
                    "cpv_codes",
                    "why",
                    "departement",
                    "url",
                ],
            ),
        }
        rows.append(item)

    return pd.DataFrame(rows, columns=CANONICAL_COLUMNS)

def normalize_ted(df):
    df = clean_columns(df)
    rows = []

    for _, row in df.iterrows():
        item = {
            "title": first_non_empty(row, ["title", "titre", "objet"]),
            "buyer_name": first_non_empty(row, ["buyer_name", "acheteur"]),
            "publication_date": first_non_empty(row, ["publication_date", "date_publication"]),
            "publication_number": first_non_empty(row, ["publication_number", "idweb"]),
            "country": first_non_empty(row, ["country"]),
            "category": first_non_empty(row, ["category", "nature", "type_marche"]),
            "priority_bucket": first_non_empty(row, ["priority_bucket"]),
            "cpv_code": first_non_empty(row, ["cpv_code", "cpv_codes"]),
            "url": first_non_empty(row, ["ted_url", "url"]),
            "source": "TED",
            "raw_text": build_raw_text(
                row,
                [
                    "title",
                    "titre",
                    "description",
                    "descripteurs",
                    "cpv_code",
                    "cpv_uri",
                    "why",
                    "ted_url",
                    "url",
                ],
            ),
        }
        rows.append(item)

    return pd.DataFrame(rows, columns=CANONICAL_COLUMNS)

# -----------------------------------
# Filtering logic
# -----------------------------------

ARCHITECTURE_KEYWORDS = [
    "architecture",
    "maîtrise d'œuvre",
    "maitrise d'oeuvre",
    "urbanisme",
    "architecte",
    "urban planning",
    "architectural",
    "bâtiment",
    "construction",
    "aménagement",
    "paysage",
    "urbaniste",
    "paysagiste",
    "design",
    "espace public",
    "logement",
    "immeuble",
    "rénovation",
    "réhabilitation",
]

STRONG_SIGNALS = [
    "architecture",
    "architectural",
    "architect",
    "urbanism",
    "urban planning",
    "landscape architecture",
    "design competition",
    "maîtrise d'oeuvre",
    "maitrise d'oeuvre",
    "services d'architecture",
    "concurso de arquitectura",
    "estudio de arquitectura",
    "servicios de arquitectura",
    "71000000",
    "71200000",
    "71220000",
    "71221000",
    "71240000",
    "71400000",
]

NEGATIVE_KEYWORDS = [
    "cleaning",
    "maintenance",
    "security services",
    "catering",
    "it maintenance",
    "vehicle services",
    "nettoyage",
    "entretien",
    "sécurité",
    "restauration",
    "maintenance informatique",
    "services véhicules",
]

def is_architecture(text):
    if pd.isna(text):
        return False
    text = str(text).lower()
    return any(keyword in text for keyword in ARCHITECTURE_KEYWORDS)

def has_strong_signal(text):
    if pd.isna(text):
        return False
    text = str(text).lower()
    return any(keyword in text for keyword in STRONG_SIGNALS)

def has_negative_keyword(text):
    if pd.isna(text):
        return False
    text = str(text).lower()
    return any(keyword in text for keyword in NEGATIVE_KEYWORDS)

# -----------------------------------
# Load source files
# -----------------------------------

print("Loading files...")

boamp = pd.read_csv(BOAMP_FILE, low_memory=False)
ted = pd.read_csv(TED_FILE, low_memory=False)

print("BOAMP rows:", len(boamp))
print("TED rows:", len(ted))

print("BOAMP raw columns:", list(boamp.columns))
print("TED raw columns:", list(ted.columns))

# -----------------------------------
# Normalize each source separately
# -----------------------------------

print("Normalizing BOAMP...")
boamp_norm = normalize_boamp(boamp)

print("Normalizing TED...")
ted_norm = normalize_ted(ted)

print("BOAMP normalized rows:", len(boamp_norm))
print("TED normalized rows:", len(ted_norm))

# -----------------------------------
# Merge canonical datasets
# -----------------------------------

df = pd.concat([boamp_norm, ted_norm], ignore_index=True)

print("Total merged canonical rows:", len(df))
print("Canonical columns:", list(df.columns))

# -----------------------------------
# Build filter text
# -----------------------------------

df["filter_text"] = (
    df["title"].fillna("").astype(str) + " " +
    df["raw_text"].fillna("").astype(str) + " " +
    df["cpv_code"].fillna("").astype(str)
).str.lower()

# -----------------------------------
# Apply filters
# -----------------------------------

df = df[df["filter_text"].apply(is_architecture)]
print("After architecture filter:", len(df))

mask_negative = df["filter_text"].apply(has_negative_keyword)
mask_strong = df["filter_text"].apply(has_strong_signal)
df = df[~(mask_negative & ~mask_strong)]

print("After negative keyword filter:", len(df))

# -----------------------------------
# Remove duplicates
# -----------------------------------

df["publication_number"] = df["publication_number"].fillna("").astype(str).str.strip()

with_pub = df[df["publication_number"] != ""].copy()
without_pub = df[df["publication_number"] == ""].copy()

with_pub = with_pub.drop_duplicates(subset=["source", "publication_number"], keep="first")
without_pub = without_pub.drop_duplicates(
    subset=["source", "title", "buyer_name", "publication_date"],
    keep="first"
)

df = pd.concat([with_pub, without_pub], ignore_index=True)

print("After deduplication:", len(df))
print("Source distribution:")
print(df["source"].value_counts(dropna=False))

# -----------------------------------
# Final cleanup
# -----------------------------------

df = df.drop(columns=["filter_text"], errors="ignore")
df = df.fillna("")

df = df[CANONICAL_COLUMNS]

# -----------------------------------
# Save output
# -----------------------------------

df.to_csv(OUTPUT_FILE, index=False)

print("Saved results to:", OUTPUT_FILE)
print("Rows exported:", len(df))

print("Step 1 completed: kribll_results.csv generated")
print("====================================")
print("KRIBLL PIPELINE COMPLETE")
print("====================================")