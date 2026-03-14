import pandas as pd

print("====================================")
print("KRIBLL TOP FEED — SELLABLE SHORTLIST")
print("====================================")

INPUT_FILE = "data/kribll_agency_feed.csv"
OUTPUT_FILE = "data/kribll_top_feed.csv"

TOP_EXCELLENT = 20
TOP_GOOD = 30


def safe_str(series):
    return series.fillna("").astype(str).str.strip()


print("Loading agency feed...")
df = pd.read_csv(INPUT_FILE, low_memory=False)

print("Rows loaded:", len(df))

# Determine title column (English or French)
TITLE_COL = None
if "title" in df.columns:
    TITLE_COL = "title"
elif "titre" in df.columns:
    TITLE_COL = "titre"

# Clean columns
for col in ["fit", "verdict", "source", "publication_number", "publication_date", "buyer_name", "country", "category", "priority_bucket", "cpv_code", "url", "why"]:
    if col in df.columns:
        df[col] = safe_str(df[col])

if TITLE_COL in df.columns:
    df[TITLE_COL] = safe_str(df[TITLE_COL])

if "score" in df.columns:
    df["score"] = pd.to_numeric(df["score"], errors="coerce").fillna(0)

# Remove obvious weak / noisy rows
if "category" in df.columns:
    df = df[df["category"] != "ENGINEERING"]

# Map verdict to fit levels (for compatibility with existing logic)
if "verdict" in df.columns:
    df["fit"] = df["verdict"].map({
        "GO": "EXCELLENT_FIT",
        "MAYBE": "GOOD_FIT"
    })

# Keep only good levels
if "fit" in df.columns:
    df = df[df["fit"].isin(["EXCELLENT_FIT", "GOOD_FIT"]) ]

# Extra scoring tweaks
df["final_score"] = df["score"]

# Bonus for competitions
df.loc[df["category"] == "COMPETITIONS", "final_score"] += 8

# Bonus for architecture core
df.loc[df["category"].isin(["ARCHITECTURE_BUILDING", "ARCHITECTURE_GENERAL"]), "final_score"] += 5

# Bonus for urbanism / amo
df.loc[df["category"].isin(["URBANISM_LANDSCAPE", "AMO_PROGRAMMING"]), "final_score"] += 3

# Penalty if title is empty
if TITLE_COL and TITLE_COL in df.columns:
    df.loc[df[TITLE_COL] == "", "final_score"] -= 15

# Prefer BOAMP a bit for now because titles are richer
df.loc[df["source"] == "BOAMP", "final_score"] += 4

# Parse date for sorting
df["publication_date_sort"] = pd.to_datetime(df["publication_date"], errors="coerce")

# Split
excellent = df[df["fit"] == "EXCELLENT_FIT"].copy()
good = df[df["fit"] == "GOOD_FIT"].copy()

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

# Keep only useful columns
final_cols = [
    "rank",
    "fit",
    "final_score",
    "score",
    "source",
    "publication_number",
    "publication_date",
    TITLE_COL if TITLE_COL else None,
    "buyer_name",
    "country",
    "category",
    "priority_bucket",
    "cpv_code",
    "url",
    "why",
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
print("By category:")
print(top["category"].value_counts(dropna=False))
print()
print("Top 20 preview:")
print(top.head(20).to_string(index=False))
print()
print("Export completed ->", OUTPUT_FILE)

print("Step 3 completed: kribll_top_feed.csv generated")