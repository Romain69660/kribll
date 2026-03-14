import pandas as pd

print("====================================")
print("KRIBLL TOP FEED — SELLABLE SHORTLIST")
print("====================================")

INPUT_FILE = "kribll_agency_feed.csv"
OUTPUT_FILE = "kribll_top_feed.csv"

TOP_EXCELLENT = 20
TOP_GOOD = 30


def safe_str(series):
    return series.fillna("").astype(str).str.strip()


print("Loading agency feed...")
df = pd.read_csv(INPUT_FILE, low_memory=False)

print("Rows loaded:", len(df))

# Clean string columns if they exist
string_cols = [
    "fit",
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
    "why",
    # AI fields to preserve
    "summary",
    "verdict",
    "location",
    "procedure_type",
    "main_discipline",
    "estimated_budget",
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

# Numeric columns
numeric_cols = [
    "score",
    "final_score",
    "relevance_score",
    "required_references_count",
    "minimum_revenue_required",
]

for col in numeric_cols:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

# Remove obvious weak / noisy rows
if "category" in df.columns:
    df = df[df["category"] != "ENGINEERING"]

# Keep only good levels
if "fit" in df.columns:
    df = df[df["fit"].isin(["EXCELLENT_FIT", "GOOD_FIT"])]

# Extra scoring tweaks
if "score" not in df.columns:
    df["score"] = 0

df["score"] = df["score"].fillna(0)
df["final_score"] = df["score"]

# Bonus for competitions
if "category" in df.columns:
    df.loc[df["category"] == "COMPETITIONS", "final_score"] += 8

    # Bonus for architecture core
    df.loc[df["category"].isin(["ARCHITECTURE_BUILDING", "ARCHITECTURE_GENERAL"]), "final_score"] += 5

    # Bonus for urbanism / amo
    df.loc[df["category"].isin(["URBANISM_LANDSCAPE", "AMO_PROGRAMMING"]), "final_score"] += 3

# Penalty if title is empty
if "title" in df.columns:
    df.loc[df["title"] == "", "final_score"] -= 15

# Prefer BOAMP a bit for now because titles are richer
if "source" in df.columns:
    df.loc[df["source"] == "BOAMP", "final_score"] += 4

# Parse date for sorting
if "publication_date" in df.columns:
    df["publication_date_sort"] = pd.to_datetime(df["publication_date"], errors="coerce")
else:
    df["publication_date_sort"] = pd.NaT

# Split
excellent = df[df["fit"] == "EXCELLENT_FIT"].copy() if "fit" in df.columns else df.copy()
good = df[df["fit"] == "GOOD_FIT"].copy() if "fit" in df.columns else pd.DataFrame(columns=df.columns)

excellent = excellent.sort_values(
    by=["final_score", "publication_date_sort"],
    ascending=[False, False]
).head(TOP_EXCELLENT)

good = good.sort_values(
    by=["final_score", "publication_date_sort"],
    ascending=[False, False]
).head(TOP_GOOD)

top = pd.concat([excellent, good], ignore_index=True)

# Remove duplicates by URL or publication_number if possible
if "url" in top.columns:
    top = top.drop_duplicates(subset=["url"])
elif "publication_number" in top.columns:
    top = top.drop_duplicates(subset=["publication_number"])

# Final sort
fit_order = {"EXCELLENT_FIT": 0, "GOOD_FIT": 1}
if "fit" in top.columns:
    top["fit_order"] = top["fit"].map(fit_order).fillna(9)
else:
    top["fit_order"] = 9

top = top.sort_values(
    by=["fit_order", "final_score", "publication_date_sort"],
    ascending=[True, False, False]
).drop(columns=["fit_order"])

# Add shortlist rank
top.insert(0, "rank", range(1, len(top) + 1))

# Keep existing shortlist columns + AI fields
final_cols = [
    "rank",
    "fit",
    "final_score",
    "score",
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
    "why",
    # AI fields preserved
    "summary",
    "verdict",
    "relevance_score",
    "location",
    "procedure_type",
    "main_discipline",
    "estimated_budget",
    "why_it_matters",
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

final_cols = [c for c in final_cols if c in top.columns]
top = top[final_cols]

top.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")

print()
print("Top shortlist rows:", len(top))
print()
if "fit" in top.columns:
    print("By fit:")
    print(top["fit"].value_counts(dropna=False))
    print()
if "category" in top.columns:
    print("By category:")
    print(top["category"].value_counts(dropna=False))
    print()
print("Top 20 preview:")
print(top.head(20).to_string(index=False))
print()
print("Export completed ->", OUTPUT_FILE)
