import { supabase } from "../lib/supabase"
import {
  ArrowRight,
  Sparkles,
  Trophy,
  MapPin,
  Calendar,
  Building2,
  Filter,
  BarChart3,
  Search,
  Target,
  Clock,
  Eye,
  Zap,
  User,
  Heart,
  Bell,
  ArrowUpRight,
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

function formatDate(dateString?: string) {
  if (!dateString) return null
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toLocaleDateString("fr-FR")
}

function getSummary(tender: Tender) {
  const text = tender.summary?.trim()
  if (!text) return "Résumé non disponible."
  if (text.length <= 200) return text
  return text.slice(0, 197).trim() + "..."
}

function getVerdictClass(verdict?: string) {
  if (verdict === "GO") return "pill-green"
  if (verdict === "MAYBE") return "pill-gold"
  return "pill-outline"
}

// ─── Sub-components (server-safe, no framer-motion) ───────────────────────────

function ScoreGauge({ score, size = 38 }: { score: number; size?: number }) {
  const r = (size - 5) / 2
  const c = 2 * Math.PI * r
  const off = c - (score / 100) * c
  const col =
    score >= 80
      ? "hsl(145 70% 42%)"
      : score >= 50
        ? "hsl(25 95% 52%)"
        : "hsl(220 8% 52%)"
  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="hsl(220 8% 91%)"
          strokeWidth={1.5}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={col}
          strokeWidth={2}
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[0.6rem] font-semibold tabular-nums text-foreground">
        {score}
      </span>
    </div>
  )
}

function LemanBadge({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-muted">
      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-foreground">
        <span className="text-background text-[0.5rem] font-bold leading-none">L</span>
      </span>
      <span className="text-[0.68rem] text-foreground font-light leading-snug">{text}</span>
    </div>
  )
}

function OpportunityCard({ tender, index }: { tender: Tender; index: number }) {
  const summary = getSummary(tender)
  const verdict = tender.verdict?.toUpperCase() as "GO" | "MAYBE" | "NO" | undefined
  return (
    <article className="card-bordered p-4 flex flex-col gap-2">
      {/* Top row : source + category + score */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          {tender.source && (
            <span className="pill pill-blue text-[0.55rem]">{tender.source}</span>
          )}
          {tender.category && (
            <span className="pill pill-outline text-[0.55rem]">{tender.category}</span>
          )}
        </div>
        {typeof tender.final_score === "number" && (
          <ScoreGauge score={tender.final_score} size={34} />
        )}
      </div>

      {/* Title */}
      <h3 className="font-medium text-foreground leading-snug text-[0.82rem]">
        {tender.title}
      </h3>

      {/* Summary */}
      {summary && (
        <p className="text-[0.68rem] text-muted-foreground leading-relaxed">{summary}</p>
      )}

      {/* Verdict */}
      {verdict && (
        <div>
          <span className={`pill ${getVerdictClass(verdict)} text-[0.6rem]`}>{verdict}</span>
        </div>
      )}

      {/* Meta pills */}
      <div className="flex flex-wrap gap-1 mt-auto pt-1">
        {(tender.location || tender.country) && (
          <span className="pill pill-outline text-[0.55rem] gap-1">
            <MapPin className="w-2.5 h-2.5" />
            {tender.location || tender.country}
          </span>
        )}
        {tender.publication_date && (
          <span className="pill pill-outline text-[0.55rem] gap-1">
            <Calendar className="w-2.5 h-2.5" />
            {formatDate(tender.publication_date)}
          </span>
        )}
        {tender.main_discipline && (
          <span className="pill pill-outline text-[0.55rem] gap-1">
            <Building2 className="w-2.5 h-2.5" />
            {tender.main_discipline.slice(0, 22)}
          </span>
        )}
      </div>

      {/* Link */}
      <a
        href={tender.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[0.72rem] font-medium text-foreground hover:opacity-60 transition-opacity mt-1"
      >
        Voir l'avis <ArrowRight className="w-3 h-3" strokeWidth={1.5} />
      </a>
    </article>
  )
}

// ─── Page (Server Component) ──────────────────────────────────────────────────

export default async function Home() {
  const [tendersRes, countRes] = await Promise.all([
    supabase
      .from("tenders")
      .select("*")
      .order("final_score", { ascending: false })
      .limit(6),
    supabase.from("tenders").select("*", { count: "exact", head: true }),
  ])

  const tenders = (tendersRes.data as Tender[]) || []
  const totalTenders = countRes.count ?? tenders.length
  const featured = tenders[0]

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-4">
        <div className="wrap">
          <div className="flex items-center h-11 px-5 bg-white/80 backdrop-blur-xl border border-border/60 rounded-full shadow-sm">
            <span
              className="font-heading text-[0.95rem] text-foreground mr-8"
              style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}
            >
              kribbl
            </span>
            <nav className="hidden md:flex items-center gap-6">
              {["Découvrir", "Fonctionnement", "Tarifs"].map((l) => (
                <a
                  key={l}
                  href="#"
                  className="text-[0.82rem] text-muted-foreground font-light hover:text-foreground transition-colors"
                >
                  {l}
                </a>
              ))}
            </nav>
            <div className="flex items-center gap-1 ml-auto">
              <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <Heart className="w-[0.9rem] h-[0.9rem] text-muted-foreground" strokeWidth={1.5} />
              </button>
              <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <Bell className="w-[0.9rem] h-[0.9rem] text-muted-foreground" strokeWidth={1.5} />
              </button>
              <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <User className="w-[0.9rem] h-[0.9rem] text-muted-foreground" strokeWidth={1.5} />
              </button>
              <button className="ml-2 text-[0.78rem] font-normal text-foreground bg-muted hover:bg-border transition-colors px-4 py-1.5 rounded-full">
                Commencer
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-0 overflow-hidden">
        <div className="wrap">
          <div className="grid md:grid-cols-[1fr_400px] gap-8 items-center mb-10">

            {/* Left — Copy */}
            <div>
              <span
                className="pill text-[0.72rem] gap-1.5 font-normal mb-5 inline-flex"
                style={{
                  background: "hsl(220 85% 96%)",
                  color: "hsl(220 90% 56%)",
                }}
              >
                <Sparkles className="w-3 h-3" strokeWidth={1.5} />
                Propulsé par Leman AI
              </span>

              <h1
                className="text-[2.2rem] md:text-[3.2rem] text-foreground leading-[1.05] mb-5"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                }}
              >
                <span className="block">Les appels d'offres</span>
                <span className="block">qui comptent vraiment.</span>
              </h1>

              <p className="text-[1.05rem] md:text-[1.15rem] text-muted-foreground font-light leading-[1.7] max-w-[42ch] mb-7">
                Kribbl filtre des milliers d'AAPC et ne vous montre que ceux qui
                correspondent à votre agence. Architecture, urbanisme, paysage.
              </p>

              <div className="flex items-center gap-4">
                <button className="btn-outline font-normal group">
                  Accès anticipé
                  <ArrowRight
                    className="inline w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={1.5}
                  />
                </button>
                <span className="flex items-center gap-1 text-[0.88rem] text-muted-foreground font-light cursor-pointer hover:text-foreground transition-colors">
                  En savoir plus <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </span>
              </div>
            </div>

            {/* Right — Featured card (live data) */}
            <div
              className="card-bordered p-5 md:p-6"
              style={{ boxShadow: "var(--shadow-lg)" }}
            >
              <div className="flex items-center gap-2 mb-4">
                <Trophy
                  className="w-3.5 h-3.5"
                  strokeWidth={1.5}
                  style={{ color: "hsl(25 95% 52%)" }}
                />
                <span
                  className="text-[0.72rem] font-medium"
                  style={{ color: "hsl(25 95% 52%)" }}
                >
                  Opportunité du jour
                </span>
              </div>

              {featured ? (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex gap-1.5 flex-wrap">
                      {featured.source && (
                        <span className="pill pill-blue text-[0.64rem]">
                          {featured.source}
                        </span>
                      )}
                      {featured.category && (
                        <span className="pill pill-pink text-[0.64rem]">
                          {featured.category}
                        </span>
                      )}
                    </div>
                    <ScoreGauge score={featured.final_score} size={36} />
                  </div>

                  <h3 className="font-medium text-[0.92rem] leading-snug mb-1 text-foreground">
                    {featured.title}
                  </h3>
                  <p className="text-[0.78rem] text-muted-foreground font-light mb-3">
                    {featured.location || featured.country || "Localisation inconnue"}
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    {featured.verdict && (
                      <span
                        className={`pill ${getVerdictClass(featured.verdict)} text-[0.64rem]`}
                      >
                        {featured.verdict.toUpperCase()}
                      </span>
                    )}
                    {typeof featured.relevance_score === "number" && (
                      <span className="text-[0.72rem] text-muted-foreground font-light">
                        Score Leman : {featured.relevance_score}
                      </span>
                    )}
                  </div>

                  <LemanBadge
                    text={
                      featured.why_it_matters ||
                      "Match pertinent selon votre profil et vos références."
                    }
                  />
                </>
              ) : (
                <p className="text-[0.82rem] text-muted-foreground font-light">
                  Aucune opportunité disponible pour le moment.
                </p>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex flex-wrap items-center justify-between border-t border-b border-border py-4 gap-4">
            {[
              { value: `${totalTenders}+`, label: "AAPC analysés / jour" },
              { value: "94%", label: "précision du scoring" },
              { value: "10s", label: "pour comprendre un appel" },
              { value: "3×", label: "plus de réponses ciblées" },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span
                  className="text-[1.1rem] text-foreground"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    letterSpacing: "-0.025em",
                  }}
                >
                  {s.value}
                </span>
                <span className="text-[0.78rem] text-muted-foreground font-light">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard Preview ────────────────────────────────────────────────── */}
      <section className="pt-10 pb-6">
        <div className="wrap">
          <div className="text-center mb-7">
            <span className="pill pill-muted text-[0.72rem] font-normal">Aperçu live</span>
            <h2
              className="text-[1.5rem] md:text-[2rem] mt-2.5 text-foreground"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                letterSpacing: "-0.025em",
              }}
            >
              Vos opportunités du jour
            </h2>
            <p className="text-[1rem] text-muted-foreground font-light mt-2.5 max-w-[42ch] mx-auto leading-relaxed">
              Triées et scorées en temps réel par Leman.
            </p>
          </div>

          {tenders.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tenders.map((tender, i) => (
                <OpportunityCard key={tender.id ?? i} tender={tender} index={i} />
              ))}
            </div>
          ) : (
            <div className="card-bordered p-8 text-center text-muted-foreground text-[0.88rem]">
              Aucune opportunité disponible pour le moment.
            </div>
          )}

          <div className="flex justify-center mt-6">
            <button className="btn-outline text-[0.88rem] font-normal group">
              Voir toutes les opportunités
              <ArrowRight
                className="inline w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5"
                strokeWidth={1.5}
              />
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="wrap">
          <div className="text-center mb-9">
            <span className="pill pill-muted text-[0.72rem] font-normal">Fonctionnalités</span>
            <h2
              className="text-[1.5rem] md:text-[2rem] mt-2.5 text-foreground"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                letterSpacing: "-0.025em",
              }}
            >
              Tout ce qu'il faut pour décider vite.
            </h2>
            <p className="text-[1rem] text-muted-foreground font-light mt-2.5 max-w-[44ch] mx-auto leading-relaxed">
              De la collecte à la décision, Kribbl automatise votre veille.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                Icon: Filter,
                title: "Filtrage intelligent",
                desc: "Analyse chaque publication et ne garde que celles qui correspondent à votre profil.",
              },
              {
                Icon: BarChart3,
                title: "Scoring automatique",
                desc: "Score basé sur vos références, compétences et localisation.",
              },
              {
                Icon: Sparkles,
                title: "Résumé en 10s",
                desc: "Leman résume les AAPC et donne un verdict : GO, MAYBE ou NO.",
              },
            ].map(({ Icon, title, desc }, i) => (
              <div
                key={i}
                className="card-bordered p-6 flex flex-col justify-between min-h-[180px] group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <Icon className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  <ArrowUpRight
                    className="w-4 h-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-all"
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <h3 className="font-medium text-foreground text-[1rem] mb-1.5">{title}</h3>
                  <p className="text-[0.88rem] text-muted-foreground font-light leading-[1.65]">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────────── */}
      <section className="py-4">
        <div
          className="rounded-[1.5rem] py-10 mx-4 md:mx-8"
          style={{ background: "var(--gradient-cool)" }}
        >
          <div className="wrap">
            <div className="text-center mb-9">
              <span className="pill pill-muted text-[0.72rem] font-normal">Processus</span>
              <h2
                className="text-[1.5rem] md:text-[2rem] mt-2.5 text-foreground"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontWeight: 600,
                  letterSpacing: "-0.025em",
                }}
              >
                Comment ça marche
              </h2>
              <p className="text-[1rem] text-muted-foreground font-light mt-2.5 max-w-[40ch] mx-auto leading-relaxed">
                3 étapes pour ne plus jamais rater une opportunité.
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              {[
                {
                  Icon: Search,
                  n: "01",
                  title: "Kribbl collecte",
                  desc: "Des milliers d'appels d'offres récupérés chaque jour depuis BOAMP et TED.",
                },
                {
                  Icon: Sparkles,
                  n: "02",
                  title: "Leman analyse",
                  desc: "Notre IA filtre, résume et score chaque opportunité selon votre profil.",
                },
                {
                  Icon: Target,
                  n: "03",
                  title: "Vous décidez",
                  desc: "GO, MAYBE ou NO — identifiez en quelques minutes ce qui vaut le coup.",
                },
              ].map(({ Icon, n, title, desc }, i) => (
                <div key={i} className="card-bordered p-6 flex flex-col min-h-[170px]">
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-[2rem] text-muted-foreground/10"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      {n}
                    </span>
                    <Icon className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  </div>
                  <div className="mt-auto">
                    <h3 className="font-medium text-foreground text-[1rem] mb-1">{title}</h3>
                    <p className="text-[0.88rem] text-muted-foreground font-light leading-[1.65]">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────────────── */}
      <section className="py-12">
        <div className="wrap">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { Icon: Clock, value: "5h", label: "gagnées / semaine" },
              { Icon: Filter, value: "84%", label: "de bruit en moins" },
              { Icon: Eye, value: "10s", label: "pour tout comprendre" },
              { Icon: Zap, value: "3×", label: "plus de réponses" },
            ].map(({ Icon, value, label }, i) => (
              <div key={i} className="card-bordered p-5 text-center">
                <Icon
                  className="w-5 h-5 text-muted-foreground mx-auto mb-3"
                  strokeWidth={1.5}
                />
                <span
                  className="text-[1.5rem] text-foreground tabular-nums block"
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontWeight: 600,
                    letterSpacing: "-0.025em",
                  }}
                >
                  {value}
                </span>
                <p className="text-[0.82rem] text-muted-foreground font-light mt-1">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="pb-12">
        <div className="wrap">
          <div
            className="rounded-[2rem] p-10 md:p-14 text-center"
            style={{ background: "var(--gradient-dark)", color: "white" }}
          >
            <h2
              className="text-[1.5rem] md:text-[2.2rem] leading-tight mb-3"
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontWeight: 600,
                letterSpacing: "-0.025em",
                color: "white",
              }}
            >
              Prêt à transformer votre veille ?
            </h2>
            <p className="text-[1rem] font-light max-w-[36ch] mx-auto mb-6 leading-relaxed opacity-50">
              Rejoignez les agences qui ne ratent plus une opportunité.
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <button className="btn-ghost text-[0.88rem] font-normal">
                Demander une démo
              </button>
              <span className="text-[0.88rem] font-light flex items-center gap-1 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
                Commencer gratuitement{" "}
                <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="pb-8">
        <div className="wrap">
          <div className="border-t border-border pt-8">
            <div className="flex flex-col md:flex-row items-start justify-between gap-6">
              <div>
                <span
                  className="text-[1rem] text-foreground"
                  style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600 }}
                >
                  kribbl
                </span>
                <p className="text-[0.85rem] text-muted-foreground font-light mt-1">
                  Smooth sailing.
                </p>
              </div>
              <div className="flex gap-12">
                <div className="flex flex-col gap-2.5">
                  {["Fonctionnalités", "Tarifs", "Blog"].map((l) => (
                    <a
                      key={l}
                      href="#"
                      className="text-[0.82rem] text-muted-foreground font-light hover:text-foreground transition-colors"
                    >
                      {l}
                    </a>
                  ))}
                </div>
                <div className="flex flex-col gap-2.5">
                  {["Confidentialité", "CGU", "Support"].map((l) => (
                    <a
                      key={l}
                      href="#"
                      className="text-[0.82rem] text-muted-foreground font-light hover:text-foreground transition-colors"
                    >
                      {l}
                    </a>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-border flex justify-between items-center">
              <span className="text-[0.78rem] text-muted-foreground font-light">
                © 2026 Kribbl
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}