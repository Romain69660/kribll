import { supabase } from "../lib/supabase"
import {
  ArrowRight, Sparkles, Trophy, MapPin, Calendar, Building2,
  Filter, BarChart3, Search, Target, Clock, Eye, Zap,
  User, Heart, Bell, ArrowUpRight,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Tender = {
  id: number
  title: string
  buyer_name: string
  final_score: number
  url: string
  source?: string
  country?: string
  publication_date?: string
  deadline?: string
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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d?: string) {
  if (!d) return null
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
}

function getSummary(t: Tender) {
  const s = t.summary?.trim()
  if (!s) return "Résumé non disponible."
  return s.length <= 120 ? s : s.slice(0, 117) + "..."
}

function verdictPill(v?: string) {
  const up = v?.toUpperCase()
  if (up === "GO")    return { cls: "bg-[hsl(145_60%_94%)] text-[hsl(145_70%_38%)]", label: "GO" }
  if (up === "MAYBE") return { cls: "bg-[hsl(48_90%_93%)]  text-[hsl(40_80%_42%)]",  label: "MAYBE" }
  return { cls: "bg-[hsl(220_8%_95%)] text-[hsl(220_8%_52%)]", label: up ?? "—" }
}

// ─── ScoreGauge ───────────────────────────────────────────────────────────────

function ScoreGauge({ score, size = 40 }: { score: number; size?: number }) {
  const r   = (size - 6) / 2
  const c   = 2 * Math.PI * r
  const off = c - (score / 100) * c
  const col = score >= 80 ? "hsl(145,70%,42%)" : score >= 50 ? "hsl(25,95%,52%)" : "hsl(220,8%,70%)"
  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(220,8%,91%)" strokeWidth={2} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={2.5}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <span className="absolute text-[0.62rem] font-semibold tabular-nums" style={{ color: "hsl(220,20%,12%)" }}>
        {score}
      </span>
    </div>
  )
}

// ─── LemanBadge ───────────────────────────────────────────────────────────────

function LemanBadge({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5"
      style={{ background: "hsl(220,8%,95%)" }}>
      <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0"
        style={{ background: "hsl(220,20%,12%)" }}>
        <span className="text-white text-[0.52rem] font-bold leading-none">L</span>
      </span>
      <span className="text-[0.72rem] leading-snug" style={{ color: "hsl(220,20%,12%)", fontWeight: 400 }}>
        {text}
      </span>
    </div>
  )
}

// ─── OpportunityCard ──────────────────────────────────────────────────────────

function OpportunityCard({ tender }: { tender: Tender }) {
  const summary = getSummary(tender)
  const vp      = verdictPill(tender.verdict)

  return (
    <article style={{
      background: "white",
      border: "1px solid hsl(220,8%,91%)",
      borderRadius: 20,
      padding: "1.25rem 1.25rem 1.1rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.55rem",
      boxShadow: "0 1px 3px hsl(220 20% 12%/0.04)",
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
          {tender.category && (
            <span style={{
              fontSize: "0.62rem", fontWeight: 400, padding: "3px 10px", borderRadius: 999,
              background: "transparent", color: "hsl(220,8%,52%)",
              border: "1px solid hsl(220,8%,91%)",
            }}>{tender.category}</span>
          )}
        </div>
        {typeof tender.final_score === "number" && <ScoreGauge score={tender.final_score} size={40} />}
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: "0.95rem", fontWeight: 500, lineHeight: 1.35,
        color: "hsl(220,20%,12%)", margin: 0,
      }}>{tender.title}</h3>

      {/* Summary */}
      <p style={{ fontSize: "0.78rem", color: "hsl(220,8%,52%)", lineHeight: 1.55, margin: 0, fontWeight: 400 }}>
        {summary}
      </p>

      {/* Verdict pill */}
      {tender.verdict && (
        <div>
          <span style={{
            fontSize: "0.68rem", fontWeight: 500, padding: "4px 12px", borderRadius: 999,
            ...Object.fromEntries(
              vp.cls.split(" ").map(c => {
                if (c.startsWith("bg-[")) return ["background", c.slice(4, -1)]
                if (c.startsWith("text-[")) return ["color", c.slice(6, -1)]
                return [c, true]
              })
            ),
          }}>{vp.label}</span>
        </div>
      )}

      {/* Meta pills */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
        {(tender.location || tender.country) && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: "0.62rem", fontWeight: 400, padding: "4px 10px", borderRadius: 999,
            background: "transparent", color: "hsl(220,8%,52%)", border: "1px solid hsl(220,8%,91%)",
          }}>
            <MapPin style={{ width: 10, height: 10 }} />
            {tender.location || tender.country}
          </span>
        )}
        {tender.publication_date && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: "0.62rem", fontWeight: 400, padding: "4px 10px", borderRadius: 999,
            background: "transparent", color: "hsl(220,8%,52%)", border: "1px solid hsl(220,8%,91%)",
          }}>
            <Calendar style={{ width: 10, height: 10 }} />
            {formatDate(tender.publication_date)}
          </span>
        )}
        {tender.main_discipline && (
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: "0.62rem", fontWeight: 400, padding: "4px 10px", borderRadius: 999,
            background: "transparent", color: "hsl(220,8%,52%)", border: "1px solid hsl(220,8%,91%)",
          }}>
            <Building2 style={{ width: 10, height: 10 }} />
            {tender.main_discipline}
          </span>
        )}
      </div>
    </article>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Home() {
  const [tendersRes, countRes] = await Promise.all([
    supabase.from("tenders").select("*").order("final_score", { ascending: false }).limit(6),
    supabase.from("tenders").select("*", { count: "exact", head: true }),
  ])
  const tenders      = (tendersRes.data as Tender[]) || []
  const totalTenders = countRes.count ?? tenders.length
  const featured     = tenders[0]

  const hl = "'Outfit', 'Inter', sans-serif"  // heading font shorthand

  return (
    <div style={{ minHeight: "100vh", background: "white", fontFamily: "'Inter', sans-serif" }}>

      {/* ══════════════════════════════════════════════════════════════════════
          HEADER — glassmorphism pill fixé en haut
      ══════════════════════════════════════════════════════════════════════ */}
      <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, paddingTop: 16 }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 2rem" }}>
          <div style={{
            display: "flex", alignItems: "center", height: 44, padding: "0 20px",
            background: "rgba(255,255,255,0.82)", backdropFilter: "blur(20px)",
            border: "1px solid hsl(220,8%,91%)", borderRadius: 999,
            boxShadow: "0 1px 3px hsl(220 20% 12%/0.04)",
          }}>
            {/* Logo */}
            <span style={{ fontFamily: hl, fontWeight: 700, fontSize: "0.98rem", color: "hsl(220,20%,12%)", marginRight: 36, letterSpacing: "-0.02em" }}>
              kribbl
            </span>
            {/* Nav */}
            <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
              {["Découvrir", "Fonctionnement", "Tarifs"].map(l => (
                <a key={l} href="#" style={{ fontSize: "0.82rem", color: "hsl(220,8%,52%)", textDecoration: "none", fontWeight: 400, transition: "color .2s" }}>
                  {l}
                </a>
              ))}
            </nav>
            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
              {[Heart, Bell, User].map((Icon, i) => (
                <button key={i} style={{ padding: 6, borderRadius: 999, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  <Icon style={{ width: 15, height: 15, color: "hsl(220,8%,62%)" }} strokeWidth={1.5} />
                </button>
              ))}
              <button style={{
                marginLeft: 8, fontSize: "0.78rem", fontWeight: 500,
                color: "hsl(220,20%,12%)", background: "hsl(220,8%,95%)",
                border: "none", padding: "6px 16px", borderRadius: 999, cursor: "pointer",
              }}>Commencer</button>
            </div>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ paddingTop: 100, paddingBottom: 0, overflow: "hidden" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 2rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 48, alignItems: "center", marginBottom: 40 }}>

            {/* Left — copy */}
            <div>
              {/* Leman badge */}
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: "0.75rem", fontWeight: 500, padding: "6px 14px", borderRadius: 999,
                background: "hsl(220,85%,96%)", color: "hsl(220,90%,56%)", marginBottom: 24,
              }}>
                <Sparkles style={{ width: 12, height: 12 }} strokeWidth={1.5} />
                Propulsé par Leman AI
              </span>

              {/* H1 */}
              <h1 style={{
                fontFamily: hl, fontWeight: 700, fontSize: "clamp(2rem, 4vw, 3.4rem)",
                lineHeight: 1.05, letterSpacing: "-0.03em", color: "hsl(220,20%,12%)",
                margin: "0 0 20px",
              }}>
                Les appels d'offres<br />qui comptent vraiment.
              </h1>

              {/* Subtitle */}
              <p style={{
                fontSize: "1rem", color: "hsl(220,8%,52%)", fontWeight: 400,
                lineHeight: 1.7, maxWidth: "42ch", margin: "0 0 28px",
              }}>
                Kribbl filtre des milliers d'AAPC et ne vous montre que ceux qui correspondent à votre agence. Architecture, urbanisme, paysage.
              </p>

              {/* CTAs */}
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <button style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  fontSize: "0.85rem", fontWeight: 400, padding: "10px 22px", borderRadius: 999,
                  background: "white", border: "1px solid hsl(220,8%,88%)", cursor: "pointer",
                  boxShadow: "0 1px 3px hsl(220 20%12%/0.05)",
                }}>
                  Accès anticipé <ArrowRight style={{ width: 14, height: 14 }} strokeWidth={1.5} />
                </button>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.88rem", color: "hsl(220,8%,52%)", cursor: "pointer", fontWeight: 400 }}>
                  En savoir plus <ArrowRight style={{ width: 14, height: 14 }} strokeWidth={1.5} />
                </span>
              </div>
            </div>

            {/* Right — featured card */}
            <div style={{
              background: "white", border: "1px solid hsl(220,8%,91%)", borderRadius: 20,
              padding: "22px 24px", boxShadow: "0 10px 36px hsl(220 20%12%/0.08), 0 3px 10px hsl(220 20%12%/0.03)",
            }}>
              {/* Label opportunité */}
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 16 }}>
                <Trophy style={{ width: 14, height: 14, color: "hsl(25,95%,52%)" }} strokeWidth={1.5} />
                <span style={{ fontSize: "0.72rem", fontWeight: 500, color: "hsl(25,95%,52%)" }}>
                  Opportunité du jour
                </span>
              </div>

              {featured ? (
                <>
                  {/* Source + score */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {featured.source && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 500, padding: "4px 12px", borderRadius: 999, background: "hsl(220,85%,96%)", color: "hsl(220,90%,56%)" }}>
                          {featured.source}
                        </span>
                      )}
                      {featured.category && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 500, padding: "4px 12px", borderRadius: 999, background: "hsl(330,80%,96%)", color: "hsl(330,85%,58%)" }}>
                          {featured.category}
                        </span>
                      )}
                    </div>
                    <ScoreGauge score={featured.final_score} size={40} />
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 500, lineHeight: 1.4, color: "hsl(220,20%,12%)", margin: "0 0 6px" }}>
                    {featured.title}
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "hsl(220,8%,52%)", fontWeight: 400, margin: "0 0 14px" }}>
                    {featured.location || featured.country || "Localisation inconnue"}
                  </p>

                  {/* Verdict + score Leman */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                    {featured.verdict && (() => {
                      const vp = verdictPill(featured.verdict)
                      return (
                        <span style={{
                          fontSize: "0.68rem", fontWeight: 500, padding: "4px 12px", borderRadius: 999,
                          background: vp.cls.includes("145") ? "hsl(145,60%,94%)" : vp.cls.includes("48") ? "hsl(48,90%,93%)" : "hsl(220,8%,95%)",
                          color: vp.cls.includes("145") ? "hsl(145,70%,38%)" : vp.cls.includes("48") ? "hsl(40,80%,42%)" : "hsl(220,8%,52%)",
                        }}>{vp.label}</span>
                      )
                    })()}
                    {typeof featured.relevance_score === "number" && (
                      <span style={{ fontSize: "0.72rem", color: "hsl(220,8%,52%)", fontWeight: 400 }}>
                        Score Leman : {featured.relevance_score}
                      </span>
                    )}
                  </div>

                  <LemanBadge text={featured.why_it_matters || "Match pertinent selon votre profil et vos références."} />
                </>
              ) : (
                <p style={{ fontSize: "0.82rem", color: "hsl(220,8%,52%)" }}>Aucune opportunité disponible.</p>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, borderTop: "1px solid hsl(220,8%,91%)", borderBottom: "1px solid hsl(220,8%,91%)", padding: "16px 0" }}>
            {[
              { value: `${totalTenders}+`, label: "AAPC analysés / jour" },
              { value: "94%",              label: "précision du scoring" },
              { value: "10s",              label: "pour comprendre un appel" },
              { value: "3×",               label: "plus de réponses ciblées" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: hl, fontWeight: 700, fontSize: "1.1rem", letterSpacing: "-0.025em", color: "hsl(220,20%,12%)" }}>
                  {s.value}
                </span>
                <span style={{ fontSize: "0.78rem", color: "hsl(220,8%,52%)", fontWeight: 400 }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          DASHBOARD PREVIEW — données Supabase live
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ paddingTop: 56, paddingBottom: 24 }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 2rem" }}>

          {/* Header section */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <span style={{
              display: "inline-block", fontSize: "0.72rem", fontWeight: 400,
              padding: "5px 14px", borderRadius: 999, background: "hsl(220,8%,95%)",
              color: "hsl(220,8%,52%)", marginBottom: 12,
            }}>Aperçu live</span>
            <h2 style={{ fontFamily: hl, fontWeight: 700, fontSize: "clamp(1.4rem, 3vw, 2rem)", letterSpacing: "-0.025em", color: "hsl(220,20%,12%)", margin: "0 0 10px" }}>
              Vos opportunités du jour
            </h2>
            <p style={{ fontSize: "0.95rem", color: "hsl(220,8%,52%)", fontWeight: 400, maxWidth: "42ch", margin: "0 auto", lineHeight: 1.65 }}>
              Triées et scorées en temps réel par Leman.
            </p>
          </div>

          {/* Grid */}
          {tenders.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {tenders.map((t, i) => <OpportunityCard key={t.id ?? i} tender={t} />)}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "48px 0", color: "hsl(220,8%,52%)", fontSize: "0.88rem" }}>
              Aucune opportunité disponible pour le moment.
            </div>
          )}

          {/* CTA */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
            <button style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: "0.88rem", fontWeight: 400, padding: "10px 22px", borderRadius: 999,
              background: "white", border: "1px solid hsl(220,8%,88%)", cursor: "pointer",
              boxShadow: "0 1px 3px hsl(220 20%12%/0.05)",
            }}>
              Voir toutes les opportunités <ArrowRight style={{ width: 14, height: 14 }} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FEATURES — 3 cartes
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "56px 0 56px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 2rem" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <span style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 400, padding: "5px 14px", borderRadius: 999, background: "hsl(220,8%,95%)", color: "hsl(220,8%,52%)", marginBottom: 12 }}>
              Fonctionnalités
            </span>
            <h2 style={{ fontFamily: hl, fontWeight: 700, fontSize: "clamp(1.4rem, 3vw, 2rem)", letterSpacing: "-0.025em", color: "hsl(220,20%,12%)", margin: "0 0 10px" }}>
              Tout ce qu'il faut pour décider vite.
            </h2>
            <p style={{ fontSize: "0.95rem", color: "hsl(220,8%,52%)", fontWeight: 400, maxWidth: "44ch", margin: "0 auto", lineHeight: 1.65 }}>
              De la collecte à la décision, Kribbl automatise votre veille.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { Icon: Filter,   title: "Filtrage intelligent",   desc: "Analyse chaque publication et ne garde que celles qui correspondent à votre profil." },
              { Icon: BarChart3, title: "Scoring automatique",   desc: "Score basé sur vos références, compétences et localisation." },
              { Icon: Sparkles, title: "Résumé en 10s",          desc: "Leman résume les AAPC et donne un verdict : GO, MAYBE ou NO." },
            ].map(({ Icon, title, desc }, i) => (
              <div key={i} style={{
                background: "white", border: "1px solid hsl(220,8%,91%)", borderRadius: 20,
                padding: "24px", minHeight: 200, display: "flex", flexDirection: "column",
                justifyContent: "space-between", boxShadow: "0 1px 3px hsl(220 20%12%/0.04)",
                transition: "box-shadow .3s, transform .3s", cursor: "pointer",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
                  <Icon style={{ width: 20, height: 20, color: "hsl(220,8%,62%)" }} strokeWidth={1.5} />
                  <ArrowUpRight style={{ width: 16, height: 16, color: "hsl(220,8%,80%)" }} strokeWidth={1.5} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 500, color: "hsl(220,20%,12%)", margin: "0 0 8px" }}>{title}</h3>
                  <p style={{ fontSize: "0.88rem", color: "hsl(220,8%,52%)", lineHeight: 1.65, fontWeight: 400, margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          HOW IT WORKS — fond gris froid
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "8px 0" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 2rem" }}>
          <div style={{ background: "hsl(220,6%,97.5%)", borderRadius: 28, padding: "48px 40px" }}>

            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <span style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 400, padding: "5px 14px", borderRadius: 999, background: "white", color: "hsl(220,8%,52%)", marginBottom: 12, boxShadow: "0 1px 3px hsl(220 20%12%/0.05)" }}>
                Processus
              </span>
              <h2 style={{ fontFamily: hl, fontWeight: 700, fontSize: "clamp(1.4rem, 3vw, 2rem)", letterSpacing: "-0.025em", color: "hsl(220,20%,12%)", margin: "0 0 10px" }}>
                Comment ça marche
              </h2>
              <p style={{ fontSize: "0.95rem", color: "hsl(220,8%,52%)", fontWeight: 400, maxWidth: "40ch", margin: "0 auto", lineHeight: 1.65 }}>
                3 étapes pour ne plus jamais rater une opportunité.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { Icon: Search,   n: "01", title: "Kribbl collecte", desc: "Des milliers d'appels d'offres récupérés chaque jour depuis BOAMP et TED." },
                { Icon: Sparkles, n: "02", title: "Leman analyse",   desc: "Notre IA filtre, résume et score chaque opportunité selon votre profil." },
                { Icon: Target,   n: "03", title: "Vous décidez",     desc: "GO, MAYBE ou NO — identifiez en quelques minutes ce qui vaut le coup." },
              ].map(({ Icon, n, title, desc }, i) => (
                <div key={i} style={{
                  background: "white", border: "1px solid hsl(220,8%,91%)", borderRadius: 20,
                  padding: "24px", minHeight: 185, display: "flex", flexDirection: "column",
                  boxShadow: "0 1px 3px hsl(220 20%12%/0.04)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                    <span style={{ fontFamily: hl, fontWeight: 700, fontSize: "2rem", color: "hsl(220,8%,88%)", lineHeight: 1 }}>{n}</span>
                    <Icon style={{ width: 20, height: 20, color: "hsl(220,8%,62%)" }} strokeWidth={1.5} />
                  </div>
                  <div style={{ marginTop: "auto" }}>
                    <h3 style={{ fontSize: "1rem", fontWeight: 500, color: "hsl(220,20%,12%)", margin: "0 0 6px" }}>{title}</h3>
                    <p style={{ fontSize: "0.88rem", color: "hsl(220,8%,52%)", lineHeight: 1.65, fontWeight: 400, margin: 0 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          BENEFITS — 4 chiffres
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "48px 0" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 2rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {[
              { Icon: Clock,  value: "5h",  label: "gagnées / semaine" },
              { Icon: Filter, value: "84%", label: "de bruit en moins" },
              { Icon: Eye,    value: "10s", label: "pour tout comprendre" },
              { Icon: Zap,    value: "3×",  label: "plus de réponses" },
            ].map(({ Icon, value, label }, i) => (
              <div key={i} style={{
                background: "white", border: "1px solid hsl(220,8%,91%)", borderRadius: 20,
                padding: "24px 20px", textAlign: "center",
                boxShadow: "0 1px 3px hsl(220 20%12%/0.04)",
              }}>
                <Icon style={{ width: 20, height: 20, color: "hsl(220,8%,62%)", margin: "0 auto 14px" }} strokeWidth={1.5} />
                <div style={{ fontFamily: hl, fontWeight: 700, fontSize: "1.6rem", letterSpacing: "-0.025em", color: "hsl(220,20%,12%)", lineHeight: 1 }}>
                  {value}
                </div>
                <p style={{ fontSize: "0.82rem", color: "hsl(220,8%,52%)", fontWeight: 400, margin: "6px 0 0" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          CTA — section dark
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: "0 0 48px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 2rem" }}>
          <div style={{
            borderRadius: 28, padding: "56px 48px", textAlign: "center",
            background: "linear-gradient(160deg, hsl(220,18%,10%), hsl(220,22%,14%))",
          }}>
            <h2 style={{ fontFamily: hl, fontWeight: 700, fontSize: "clamp(1.4rem, 3vw, 2.2rem)", letterSpacing: "-0.025em", color: "white", margin: "0 0 12px", lineHeight: 1.15 }}>
              Prêt à transformer votre veille ?
            </h2>
            <p style={{ fontSize: "1rem", color: "rgba(255,255,255,0.5)", fontWeight: 400, maxWidth: "36ch", margin: "0 auto 28px", lineHeight: 1.65 }}>
              Rejoignez les agences qui ne ratent plus une opportunité.
            </p>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
              <button style={{
                fontSize: "0.88rem", fontWeight: 500, padding: "11px 24px", borderRadius: 999, cursor: "pointer",
                background: "rgba(255,255,255,0.1)", color: "white",
                border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)",
              }}>Demander une démo</button>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "0.88rem", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontWeight: 400 }}>
                Commencer gratuitement <ArrowRight style={{ width: 16, height: 16 }} strokeWidth={1.5} />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer style={{ paddingBottom: 32 }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "0 2rem" }}>
          <div style={{ borderTop: "1px solid hsl(220,8%,91%)", paddingTop: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontFamily: hl, fontWeight: 700, fontSize: "1rem", color: "hsl(220,20%,12%)", letterSpacing: "-0.02em" }}>kribbl</div>
                <p style={{ fontSize: "0.85rem", color: "hsl(220,8%,62%)", fontWeight: 400, margin: "4px 0 0" }}>Smooth sailing.</p>
              </div>
              <div style={{ display: "flex", gap: 56 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["Fonctionnalités", "Tarifs", "Blog"].map(l => (
                    <a key={l} href="#" style={{ fontSize: "0.82rem", color: "hsl(220,8%,52%)", textDecoration: "none", fontWeight: 400 }}>{l}</a>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {["Confidentialité", "CGU", "Support"].map(l => (
                    <a key={l} href="#" style={{ fontSize: "0.82rem", color: "hsl(220,8%,52%)", textDecoration: "none", fontWeight: 400 }}>{l}</a>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid hsl(220,8%,91%)" }}>
              <span style={{ fontSize: "0.78rem", color: "hsl(220,8%,62%)", fontWeight: 400 }}>© 2026 Kribbl</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}