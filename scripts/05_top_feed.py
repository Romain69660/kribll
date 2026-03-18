import pandas as pd

print("====================================")
print("KRIBLL — 05 TOP FEED")
print("====================================")

INPUT_FILE = "data/kribll_agency_feed.csv"
OUTPUT_FILE = "data/kribll_top_feed.csv"

TOP_GO = 30
TOP_MAYBE = 20

# -----------------------------------
# Helpers
# -----------------------------------

def safe_str(series):
    return series.fillna("").astype(str).str.strip()

# -----------------------------------
# Load
# -----------------------------------

print("Loading agency feed...")
df = pd.read_csv(INPUT_FILE, low_memory=False)

print("Rows loaded:", len(df))

# -----------------------------------
# Clean string columns
# -----------------------------------

string_cols = [
    "source",
    "publication_number",
    "publication_date",
    "title",
    "buyer_name",
    "country",
    "category",
    "priority_bucket",
    "cpv_code",
    "url",
    "raw_text",
    "summary",
    "verdict",
    "location",
    "procedure_type",
    "main_discipline",
    "why_it_matters",
    "project_type",
    "program",
    "estimated_scale",
    "required_references",
    "required_certifications",
]

for col in string_cols:
    if col in df.columns:
        df[col] = safe_str(df[col])

# -----------------------------------
# Clean numeric columns
# -----------------------------------

numeric_cols = [
    "relevance_score",
    "estimated_budget",
    "required_references_count",
    "minimum_revenue_required",
]

for col in numeric_cols:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

# -----------------------------------
# Base filters
# -----------------------------------

# Remove obvious weak rows
if "verdict" in df.columns:
    df = df[df["verdict"].isin(["GO", "MAYBE"])]

# Remove empty-title rows
if "title" in df.columns:
    df = df[df["title"] != ""]

# Fallback if relevance_score missing
if "relevance_score" not in df.columns:
    df["relevance_score"] = 0

df["relevance_score"] = df["relevance_score"].fillna(0)

# -----------------------------------
# Build final score
# -----------------------------------

df["final_score"] = df["relevance_score"].fillna(50)

df.loc[df["verdict"] == "GO",    "final_score"] += 20
df.loc[df["verdict"] == "MAYBE", "final_score"] += 5

df.loc[df["category"] == "COMPETITIONS",         "final_score"] += 15
df.loc[df["category"] == "ARCHITECTURE_BUILDING","final_score"] += 10
df.loc[df["category"] == "URBANISM_LANDSCAPE",   "final_score"] += 8
df.loc[df["category"] == "AMO_PROGRAMMING",      "final_score"] += 6
df.loc[df["category"] == "ARCHITECTURE_GENERAL", "final_score"] += 4

df.loc[df["source"] == "BOAMP", "final_score"] += 3

df.loc[df["summary"]    == "", "final_score"] -= 25
df.loc[df["buyer_name"] == "", "final_score"] -= 15

df["final_score"] = df["final_score"].clip(upper=100).round().astype(int)

# -----------------------------------
# Sort date
# -----------------------------------

if "publication_date" in df.columns:
    df["publication_date_sort"] = pd.to_datetime(df["publication_date"], errors="coerce")
else:
    df["publication_date_sort"] = pd.NaT

# -----------------------------------
# Split by verdict
# -----------------------------------

go_df = df[df["verdict"] == "GO"].copy() if "verdict" in df.columns else df.copy()
maybe_df = df[df["verdict"] == "MAYBE"].copy() if "verdict" in df.columns else pd.DataFrame(columns=df.columns)

go_df = go_df.sort_values(
    by=["final_score", "publication_date_sort"],
    ascending=[False, False]
).head(TOP_GO)

maybe_df = maybe_df.sort_values(
    by=["final_score", "publication_date_sort"],
    ascending=[False, False]
).head(TOP_MAYBE)

top = pd.concat([go_df, maybe_df], ignore_index=True)

# -----------------------------------
# Deduplicate
# -----------------------------------

if "url" in top.columns:
    top = top.drop_duplicates(subset=["url"])
elif "publication_number" in top.columns:
    top = top.drop_duplicates(subset=["publication_number"])

# -----------------------------------
# Final sort
# -----------------------------------

verdict_order = {"GO": 0, "MAYBE": 1}
if "verdict" in top.columns:
    top["verdict_order"] = top["verdict"].map(verdict_order).fillna(9)
else:
    top["verdict_order"] = 9

top = top.sort_values(
    by=["verdict_order", "final_score", "publication_date_sort"],
    ascending=[True, False, False]
).drop(columns=["verdict_order"])

# Add rank
top.insert(0, "rank", range(1, len(top) + 1))

# -----------------------------------
# Final column selection
# -----------------------------------

final_cols = [
    "rank",
    "user_id",
    "verdict",
    "final_score",
    "relevance_score",
    "source",
    "publication_number",
    "publication_date",
    "title",
    "buyer_name",
    "country",
    "category",
    "priority_bucket",
    "cpv_code",
    "url",
    "summary",
    "why_it_matters",
    "location",
    "procedure_type",
    "main_discipline",
    "estimated_budget",
    "project_type",
    "program",
    "estimated_scale",
    "required_references",
    "required_references_count",
    "minimum_revenue_required",
    "required_certifications",
    "consortium_required",
    "architect_mandatory",
]

final_cols = [col for col in final_cols if col in top.columns]
top = top[final_cols]

# -----------------------------------
# Export
# -----------------------------------

top.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")

print()
print("Top shortlist rows:", len(top))
print()

if "verdict" in top.columns:
    print("By verdict:")
    print(top["verdict"].value_counts(dropna=False))
    print()

if "category" in top.columns:
    print("By category:")
    print(top["category"].value_counts(dropna=False))
    print()

VERDICT_DISPLAY = {"GO": "GO", "MAYBE": "À étudier", "NO": "Non pertinent"}

print("Top 20 preview:")
preview = top.head(20).copy()
if "verdict" in preview.columns:
    preview["verdict"] = preview["verdict"].map(lambda v: VERDICT_DISPLAY.get(v, v))
print(preview.to_string(index=False))
print()
print("Export completed ->", OUTPUT_FILE)