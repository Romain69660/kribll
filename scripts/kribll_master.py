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
# Load files
# -----------------------------------

print("Loading files...")

boamp = pd.read_csv(BOAMP_FILE, low_memory=False)
ted = pd.read_csv(TED_FILE, low_memory=False)

print("BOAMP rows:", len(boamp))
print("TED rows:", len(ted))

# -----------------------------------
# Normalize columns
# -----------------------------------

boamp.columns = boamp.columns.str.lower()
ted.columns = ted.columns.str.lower()

# -----------------------------------
# Merge datasets
# -----------------------------------

df = pd.concat([boamp, ted], ignore_index=True)

print("Total merged rows:", len(df))

# -----------------------------------
# Basic filtering (architecture)
# -----------------------------------

keywords = [
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

def is_architecture(text):
    if pd.isna(text):
        return False
    text = str(text).lower()
    for k in keywords:
        if k in text:
            return True
    return False

def has_strong_signal(text):
    text = str(text).lower()

    architecture_keywords = [
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
        "71400000"
    ]

    return any(k in text for k in architecture_keywords)

def has_negative_keyword(text):
    negative_keywords = [
        "cleaning", "maintenance", "security services", "catering", "IT maintenance", "vehicle services",
        "nettoyage", "entretien", "sécurité", "restauration", "maintenance informatique", "services véhicules"
    ]
    if pd.isna(text):
        return False
    text = str(text).lower()
    for k in negative_keywords:
        if k in text:
            return True
    return False

# Combine title and objet for better matching
available_text_cols = []
if "titre" in df.columns:
    available_text_cols.append("titre")
if "descripteurs" in df.columns:
    available_text_cols.append("descripteurs")
if "objet" in df.columns:
    available_text_cols.append("objet")
if "title" in df.columns:
    available_text_cols.append("title")

cpv_cols = []
if "cpv_code" in df.columns:
    cpv_cols.append("cpv_code")
if "cpv_codes" in df.columns:
    cpv_cols.append("cpv_codes")

df["combined_text"] = df[available_text_cols].fillna("").astype(str).agg(" ".join, axis=1) + " " + df[cpv_cols].fillna("").astype(str).agg(" ".join, axis=1)

df["combined_text"] = df["combined_text"].astype(str)

print("DATAFRAME COLUMNS:", df.columns)

print("TITRE SAMPLE:")
print(df.get("titre", pd.Series()).head())

print("DESCRIPTEURS SAMPLE:")
print(df.get("descripteurs", pd.Series()).head())

print("CPV_CODE SAMPLE:")
print(df.get("cpv_code", pd.Series()).head())

print("CPV_CODES SAMPLE:")
print(df.get("cpv_codes", pd.Series()).head())

print("COMBINED TEXT SAMPLE:")
print(df["combined_text"].head())

# Positive filter
df = df[df["combined_text"].apply(is_architecture)]

print("Architecture filtered rows:", len(df))

# Negative filter: exclude if has negative keyword AND no strong signal
mask_negative = df["combined_text"].apply(has_negative_keyword).astype(bool)
mask_strong = df["combined_text"].apply(has_strong_signal).astype(bool)
df = df[~(mask_negative & ~mask_strong)]

print("After negative keyword filter:", len(df))

# Drop combined_text
df = df.drop(columns=["combined_text"])

print("Architecture filtered rows:", len(df))

# -----------------------------------
# Remove duplicates
# -----------------------------------

df = df.drop_duplicates()

# -----------------------------------
# Save results
# -----------------------------------

df.to_csv(OUTPUT_FILE, index=False)

print("Saved results to:", OUTPUT_FILE)
print("Rows exported:", len(df))

print("Step 1 completed: kribll_results.csv generated")

print("====================================")
print("KRIBLL PIPELINE COMPLETE")
print("====================================")