"use client"

import { useState } from "react"
import { MapPin, Calendar, Building2, Users, TrendingUp } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export type Tender = {
  id: number
  title: string
  buyer_name: string
  final_score: number
  url: string
  source?: string
  country?: string
  publication_date?: string
  category?: string
  summary?: string
  verdict?: string
  relevance_score?: number
  location?: string
  procedure_type?: string
  main_discipline?: string
  estimated_scale?: string
  why_it_matters?: string
  project_type?: string
  program?: string
  required_references_count?: number | null
  minimum_revenue_required?: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  ARCHITECTURE_BUILDING: "Architecture",
  ARCHITECTURE_GENERAL:  "Architecture",
  URBANISM_LANDSCAPE:    "Urbanisme / Paysage",
  COMPETITIONS:          "Concours",
  AMO_PROGRAMMING:       "AMO",
  ENGINEERING:           "Ingénierie",
  SURVEY_TOPO:           "Topographie",
}

const COUNTRY_CODE: Record<string, string> = {
  "belgium":     "be", "be": "be",
  "switzerland": "ch", "ch": "ch",
  "germany":     "de", "de": "de",
  "italy":       "it", "it": "it",
  "spain":       "es", "es": "es",
  "netherlands": "nl", "nl": "nl",
  "ireland":     "ie", "ie": "ie",
  "portugal":    "pt", "pt": "pt",
  "luxembourg":  "lu", "lu": "lu",
  "austria":     "at", "at": "at",
  "sweden":      "se", "se": "se",
  "denmark":     "dk", "dk": "dk",
  "norway":      "no", "no": "no",
  "finland":     "fi", "fi": "fi",
  "poland":      "pl", "pl": "pl",
  "greece":      "gr", "gr": "gr",
}

function countryCode(country?: string): string | null {
  if (!country) return null
  return COUNTRY_CODE[country.toLowerCase()] ?? null
}

function FlagImg({ country }: { country?: string }) {
  const code = countryCode(country)
  if (!code) return null
  return (
    <img
      src={`https://flagcdn.com/24x18/${code}.png`}
      alt={country}
      style={{ width: 20, height: 14, borderRadius: 2, objectFit: "cover", display: "inline-block" }}
    />
  )
}

function categoryLabel(cat?: string) {
  if (!cat) return null
  return CATEGORY_LABELS[cat] ?? cat
}

function formatDate(d?: string) {
  if (!d) return null
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
}

function formatRevenue(v?: number | null) {
  if (!v) return null
  if (v >= 1_000_000) return `CA minimum : ${(v / 1_000_000).toFixed(1).replace(".0", "")}M€`
  if (v >= 1_000) return `CA minimum : ${Math.round(v / 1_000)}k€`
  return `CA minimum : ${v}€`
}

function verdictPill(v?: string) {
  const up = v?.toUpperCase()
  if (up === "GO")    return { background: "hsl(145,60%,94%)", color: "hsl(145,70%,38%)", label: "GO" }
  if (up === "MAYBE") return { background: "hsl(48,90%,93%)",  color: "hsl(40,80%,42%)",  label: "À étudier" }
  if (up === "NO")    return { background: "hsl(0,80%,95%)",   color: "hsl(0,70%,45%)",   label: "Non pertinent" }
  return { background: "hsl(220,8%,95%)", color: "hsl(220,8%,52%)", label: up ?? "—" }
}

// ─── ScoreGauge ───────────────────────────────────────────────────────────────

function ScoreGauge({ score, size = 40 }: { score: number; size?: number }) {
  const s   = Math.min(Math.round(score), 100)
  const r   = (size - 6) / 2
  const c   = 2 * Math.PI * r
  const off = c - (s / 100) * c
  const col = s >= 80 ? "hsl(145,70%,42%)" : s >= 50 ? "hsl(25,95%,52%)" : "hsl(220,8%,70%)"
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(220,8%,91%)" strokeWidth={2} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={2.5}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <span style={{ position: "absolute", fontSize: "0.62rem", fontWeight: 600, color: "hsl(220,20%,12%)", fontVariantNumeric: "tabular-nums" }}>
        {s}
      </span>
    </div>
  )
}

// ─── MetaPill ─────────────────────────────────────────────────────────────────

function MetaPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: "0.62rem", fontWeight: 400, padding: "4px 10px", borderRadius: 999,
      background: "transparent", color: "hsl(220,8%,52%)", border: "1px solid hsl(220,8%,91%)",
      whiteSpace: "nowrap",
    }}>
      {icon}
      {label}
    </span>
  )
}

// ─── OpportunityCard ──────────────────────────────────────────────────────────

function OpportunityCard({ tender, showFlag }: { tender: Tender; showFlag?: boolean }) {
  const vp       = verdictPill(tender.verdict)
  const catLabel = categoryLabel(tender.category)
  const revenue  = formatRevenue(tender.minimum_revenue_required)

  return (
    <article style={{
      background: "white",
      border: "1px solid hsl(220,8%,91%)",
      borderRadius: 20,
      padding: "1.35rem 1.35rem 1.2rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.65rem",
      boxShadow: "0 1px 3px hsl(220,20%,12%,0.04)",
      transition: "box-shadow .3s ease, transform .3s ease",
    }}>

      {/* Source + category + score */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {tender.source && (
            <span style={{
              fontSize: "0.62rem", fontWeight: 500, padding: "3px 10px", borderRadius: 999,
              background: "hsl(220,85%,96%)", color: "hsl(220,90%,56%)",
            }}>{tender.source}</span>
          )}
          {catLabel && (
            <span style={{
              fontSize: "0.62rem", fontWeight: 400, padding: "3px 10px", borderRadius: 999,
              background: "transparent", color: "hsl(220,8%,52%)",
              border: "1px solid hsl(220,8%,91%)",
            }}>{catLabel}</span>
          )}
          {showFlag && <FlagImg country={tender.country} />}
        </div>
        {typeof tender.final_score === "number" && <ScoreGauge score={tender.final_score} size={40} />}
      </div>

      {/* Verdict pill */}
      {tender.verdict && (
        <div>
          <span style={{
            fontSize: "0.68rem", fontWeight: 600, padding: "4px 12px", borderRadius: 999,
            background: vp.background, color: vp.color,
          }}>{vp.label}</span>
        </div>
      )}

      {/* Title */}
      <h3 style={{
        fontSize: "0.95rem", fontWeight: 500, lineHeight: 1.35,
        color: "hsl(220,20%,12%)", margin: 0,
      }}>{tender.title}</h3>

      {/* Summary */}
      {tender.summary && (
        <p style={{ fontSize: "0.78rem", color: "hsl(220,8%,52%)", lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
          {tender.summary.trim()}
        </p>
      )}

      {/* Why it matters */}
      {tender.why_it_matters && (
        <p style={{ fontSize: "0.78rem", color: "hsl(220,8%,45%)", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
          {tender.why_it_matters}
        </p>
      )}

      {/* Meta pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
        {(tender.location || tender.country) && (
          <MetaPill
            icon={<MapPin style={{ width: 10, height: 10 }} />}
            label={tender.location || tender.country!}
          />
        )}
        {tender.publication_date && (
          <MetaPill
            icon={<Calendar style={{ width: 10, height: 10 }} />}
            label={formatDate(tender.publication_date)!}
          />
        )}
        {tender.main_discipline && (
          <MetaPill
            icon={<Building2 style={{ width: 10, height: 10 }} />}
            label={categoryLabel(tender.main_discipline) ?? tender.main_discipline}
          />
        )}
        {tender.required_references_count != null && tender.required_references_count > 0 && (
          <MetaPill
            icon={<Users style={{ width: 10, height: 10 }} />}
            label={`Références requises : ${tender.required_references_count}`}
          />
        )}
        {revenue && (
          <MetaPill
            icon={<TrendingUp style={{ width: 10, height: 10 }} />}
            label={revenue}
          />
        )}
      </div>

      {/* Lien source */}
      {tender.url && (
        <a
          href={tender.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: "0.72rem", color: "hsl(220,8%,52%)", textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4,
            borderTop: "1px solid hsl(220,8%,93%)", paddingTop: 10,
          }}
        >
          Voir l&apos;annonce →
        </a>
      )}
    </article>
  )
}

// ─── TendersGrid ──────────────────────────────────────────────────────────────

type Tab = "france" | "europe"

function isFrance(t: Tender) {
  const country  = (t.country  || "").toLowerCase()
  const location = (t.location || "").toLowerCase()
  return (
    country.includes("france") ||
    country === "fr" ||
    location.includes("france") ||
    t.source === "BOAMP"
  )
}

export default function TendersGrid({ tenders }: { tenders: Tender[] }) {
  const [tab, setTab] = useState<Tab>("france")

  const france  = tenders.filter(isFrance)
  const europe  = tenders.filter(t => !isFrance(t))
  const visible = tab === "france" ? france : europe

  return (
    <div>
      {/* Tabs */}
      <div style={{
        background: "hsl(220,8%,97%)",
        borderRadius: 16,
        padding: "6px",
        display: "flex",
        justifyContent: "center",
        gap: 4,
        marginBottom: 28,
      }}>
        {(["france", "europe"] as Tab[]).map(t => {
          const active = tab === t
          const count  = t === "france" ? france.length : europe.length
          const label  = t === "france" ? "France" : "Europe"
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                width: 160,
                fontSize: "0.82rem",
                fontWeight: active ? 500 : 400,
                padding: "9px 16px",
                borderRadius: 10,
                cursor: "pointer",
                transition: "all .2s ease",
                background: active ? "white" : "transparent",
                color:      active ? "hsl(220,20%,12%)" : "hsl(220,8%,52%)",
                border:     active ? "1px solid hsl(220,8%,88%)" : "1px solid transparent",
                boxShadow:  active ? "0 1px 4px hsl(220,20%,12%,0.08)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <span>{label}</span>
              {count > 0 && (
                <span style={{
                  fontSize: "0.68rem",
                  color: active ? "hsl(220,8%,52%)" : "hsl(220,8%,68%)",
                  fontWeight: 400,
                }}>({count})</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {visible.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
          {visible.map((t, i) => (
            <OpportunityCard key={t.id ?? i} tender={t} showFlag={tab === "europe"} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: "center", padding: "48px 0", color: "hsl(220,8%,52%)", fontSize: "0.88rem" }}>
          Aucune opportunité {tab === "france" ? "française" : "européenne"} pour le moment.
        </div>
      )}
    </div>
  )
}
