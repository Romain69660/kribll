import { supabase } from "../lib/supabase"

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

function formatDate(dateString?: string) {
  if (!dateString) return null
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toLocaleDateString("fr-FR")
}

function splitWhyItMatters(text?: string) {
  if (!text) return []

  const cleaned = text.replace(/\s+/g, " ").trim()

  const numbered = cleaned
    .split(/\s(?=\d+\))/)
    .map((item) => item.replace(/^\d+\)\s*/, "").trim())
    .filter(Boolean)

  if (numbered.length > 1) return numbered.slice(0, 4)

  const bySentence = cleaned
    .split(/(?<=\.)\s+/)
    .map((item) => item.trim())
    .filter(Boolean)

  return bySentence.slice(0, 4)
}

function getSummary(tender: Tender) {
  const text = tender.summary?.trim()
  if (!text) return "Résumé non disponible."
  if (text.length <= 260) return text
  return text.slice(0, 257).trim() + "..."
}

function getShortLocation(location?: string) {
  if (!location) return "Non renseignée"
  const parts = location.split(",").map((p) => p.trim())
  return parts.slice(0, 2).join(", ")
}

function getShortScale(scale?: string) {
  if (!scale) return "Non renseignée"
  const text = scale.trim()
  if (text.length <= 90) return text
  return text.slice(0, 87).trim() + "..."
}

function getShortDiscipline(discipline?: string) {
  if (!discipline) return "Non renseignée"
  const text = discipline.trim()
  if (text.length <= 85) return text
  return text.slice(0, 82).trim() + "..."
}

function getShortProcedure(procedure?: string) {
  if (!procedure) return "Non renseignée"
  const text = procedure.trim()
  if (text.length <= 90) return text
  return text.slice(0, 87).trim() + "..."
}

function getShortProjectType(projectType?: string) {
  if (!projectType) return "Non renseigné"
  const text = projectType.trim()
  if (text.length <= 90) return text
  return text.slice(0, 87).trim() + "..."
}

function getCompactProgram(program?: string) {
  if (!program) return null
  const text = program.trim()
  if (text.length <= 220) return text
  return text.slice(0, 217).trim() + "..."
}

function getScoreBadge(score: number) {
  if (score >= 100) return "bg-black text-white"
  if (score >= 85) return "bg-gray-900 text-white"
  if (score >= 70) return "bg-gray-200 text-gray-900"
  return "bg-gray-100 text-gray-700"
}

function getOpportunityLabel(score: number) {
  if (score >= 100) return "Excellente opportunité"
  if (score >= 85) return "Très pertinent"
  if (score >= 70) return "À regarder"
  return "Pertinence modérée"
}

function getOpportunityPill(score: number) {
  if (score >= 100) return "bg-black text-white"
  if (score >= 85) return "bg-green-100 text-green-700"
  if (score >= 70) return "bg-orange-100 text-orange-700"
  return "bg-gray-100 text-gray-700"
}

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
  const bestScore = tenders[0]?.final_score ?? "-"
  const featured = tenders[0]
  const hasError = Boolean(tendersRes.error || countRes.error)

  return (
    <main className="min-h-screen bg-[#f5f5f2] text-gray-900">
      <header className="border-b border-black/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <div className="text-2xl font-semibold tracking-tight">kribbl</div>

          <nav className="hidden items-center gap-8 text-sm text-gray-500 md:flex">
            <a href="#discover" className="hover:text-gray-900">
              Découvrir
            </a>
            <a href="#how" className="hover:text-gray-900">
              Fonctionnement
            </a>
            <a href="#pricing" className="hover:text-gray-900">
              Tarifs
            </a>
          </nav>

          <a
            href="#discover"
            className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white"
          >
            Commencer
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-12">
        <section
          id="discover"
          className="grid items-start gap-10 md:grid-cols-[1.25fr_0.9fr]"
        >
          <div>
            <div className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600">
              ✨ Propulsé par Leman AI
            </div>

            <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
              Les appels d'offres qui comptent vraiment.
            </h1>

            <p className="mt-6 max-w-2xl text-xl leading-10 text-gray-500">
              Kribbl filtre des milliers d’appels d’offres et ne vous montre que
              ceux qui correspondent à votre agence. Architecture, urbanisme,
              paysage.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#opportunities"
                className="rounded-full border border-black/10 bg-white px-7 py-4 text-base font-medium shadow-sm"
              >
                Accès anticipé →
              </a>
              <a
                href="#how"
                className="text-base font-medium text-gray-500 hover:text-gray-900"
              >
                En savoir plus →
              </a>
            </div>
          </div>

          <div className="rounded-[2rem] border border-black/5 bg-white p-7 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div className="text-sm font-medium text-orange-500">
                🏆 Opportunité du jour
              </div>
              {typeof featured?.final_score === "number" && (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-green-500 text-lg font-semibold text-gray-900">
                  {featured.final_score}
                </div>
              )}
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {featured?.source && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
                  {featured.source}
                </span>
              )}
              {featured?.category && (
                <span className="rounded-full bg-pink-50 px-3 py-1 text-sm font-medium text-pink-500">
                  {featured.category}
                </span>
              )}
            </div>

            <h2 className="max-w-xl text-3xl font-medium leading-tight">
              {featured?.title || "Aucune opportunité mise en avant"}
            </h2>

            <p className="mt-4 text-lg text-gray-500">
              {featured?.location || featured?.country || "Localisation inconnue"}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {featured?.verdict && (
                <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                  {featured.verdict}
                </span>
              )}
              {typeof featured?.relevance_score === "number" && (
                <span className="text-base text-gray-500">
                  Score Leman : {featured.relevance_score}
                </span>
              )}
            </div>

            <div className="mt-5 rounded-full bg-gray-100 px-4 py-3 text-sm text-gray-600">
              {featured?.why_it_matters || "Match pertinent selon vos références et votre profil."}
            </div>
          </div>
        </section>

        <section className="mt-10 border-y border-black/5 py-6">
          <div className="grid gap-4 text-center md:grid-cols-4 md:text-left">
            <div>
              <div className="text-4xl font-semibold">{totalTenders}+</div>
              <div className="mt-2 text-gray-500">AOP analysés / jour</div>
            </div>
            <div>
              <div className="text-4xl font-semibold">94%</div>
              <div className="mt-2 text-gray-500">précision du scoring</div>
            </div>
            <div>
              <div className="text-4xl font-semibold">10s</div>
              <div className="mt-2 text-gray-500">pour comprendre un appel</div>
            </div>
            <div>
              <div className="text-4xl font-semibold">{bestScore}</div>
              <div className="mt-2 text-gray-500">meilleur score observé</div>
            </div>
          </div>
        </section>

        {hasError && (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
            Erreur Supabase : {JSON.stringify(tendersRes.error || countRes.error)}
          </div>
        )}

        {!hasError && tenders.length === 0 && (
          <div className="mt-8 rounded-2xl bg-white p-6 text-gray-600 shadow-sm">
            Aucun appel d’offres trouvé.
          </div>
        )}

        {!hasError && tenders.length > 0 && (
          <section id="opportunities" className="mt-20">
            <div className="mb-10 text-center">
              <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm text-gray-500 shadow-sm">
                Aperçu live
              </div>
              <h2 className="mt-5 text-5xl font-semibold tracking-tight">
                Vos opportunités du jour
              </h2>
              <p className="mt-4 text-2xl text-gray-500">
                Triées et scorées en temps réel par Leman.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {tenders.map((tender, index) => {
                const summary = getSummary(tender)

                return (
                  <article
                    key={tender.id ?? index}
                    className="rounded-[2rem] border border-black/5 bg-white p-6 shadow-sm transition hover:shadow-md"
                  >
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div className="flex flex-wrap gap-2">
                        {tender.source && (
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
                            {tender.source}
                          </span>
                        )}
                        {tender.category && (
                          <span className="rounded-full border border-black/10 px-3 py-1 text-sm text-gray-500">
                            {tender.category}
                          </span>
                        )}
                      </div>

                      {typeof tender.final_score === "number" && (
                        <div
                          className={`inline-flex min-w-14 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ${getScoreBadge(
                            tender.final_score
                          )}`}
                        >
                          {tender.final_score}
                        </div>
                      )}
                    </div>

                    <h3 className="text-3xl font-medium leading-tight">
                      {tender.title}
                    </h3>

                    <p className="mt-3 text-lg text-gray-500">{summary}</p>

                    <div className="mt-5">
                      {tender.verdict && (
                        <span
                          className={`rounded-full px-4 py-2 text-sm font-semibold ${getOpportunityPill(
                            tender.final_score
                          )}`}
                        >
                          {tender.verdict}
                        </span>
                      )}
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                      <span className="rounded-full border border-black/10 px-3 py-2 text-sm text-gray-500">
                        📍 {getShortLocation(tender.location)}
                      </span>

                      {tender.publication_date && (
                        <span className="rounded-full border border-black/10 px-3 py-2 text-sm text-gray-500">
                          📅 {formatDate(tender.publication_date)}
                        </span>
                      )}

                      <span className="rounded-full border border-black/10 px-3 py-2 text-sm text-gray-500">
                        🧠 {getShortDiscipline(tender.main_discipline)}
                      </span>
                    </div>

                    <div className="mt-6">
                      <a
                        href={tender.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-sm font-medium text-gray-900 hover:opacity-70"
                      >
                        Voir l’avis →
                      </a>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className="mt-10 text-center">
              <a
                href="#"
                className="inline-flex rounded-full border border-black/10 bg-white px-8 py-4 text-base font-medium shadow-sm"
              >
                Voir toutes les opportunités →
              </a>
            </div>
          </section>
        )}

        <section className="mt-24">
          <div className="mb-10 text-center">
            <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm text-gray-500 shadow-sm">
              Fonctionnalités
            </div>
            <h2 className="mt-5 text-5xl font-semibold tracking-tight">
              Tout ce qu'il faut pour décider vite.
            </h2>
            <p className="mt-4 text-2xl text-gray-500">
              De la collecte à la décision, Kribbl automatise votre veille.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
              <div className="text-2xl">⏃</div>
              <h3 className="mt-8 text-3xl font-medium">Filtrage intelligent</h3>
              <p className="mt-4 text-xl leading-9 text-gray-500">
                Analyse chaque publication et ne garde que celles qui correspondent à votre profil.
              </p>
            </div>

            <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
              <div className="text-2xl">📊</div>
              <h3 className="mt-8 text-3xl font-medium">Scoring automatique</h3>
              <p className="mt-4 text-xl leading-9 text-gray-500">
                Score basé sur vos références, compétences et localisation.
              </p>
            </div>

            <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
              <div className="text-2xl">✦</div>
              <h3 className="mt-8 text-3xl font-medium">Résumé en 10s</h3>
              <p className="mt-4 text-xl leading-9 text-gray-500">
                Leman résume les AAPC et donne un verdict clair : GO, MAYBE ou NO.
              </p>
            </div>
          </div>
        </section>

        <section id="how" className="mt-24 rounded-[2.5rem] bg-[#f2f2ef] px-6 py-14 md:px-10">
          <div className="text-center">
            <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm text-gray-500 shadow-sm">
              Processus
            </div>
            <h2 className="mt-5 text-5xl font-semibold tracking-tight">
              Comment ça marche
            </h2>
            <p className="mt-4 text-2xl text-gray-500">
              3 étapes pour ne plus jamais rater une opportunité.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
              <div className="text-6xl font-semibold text-gray-100">01</div>
              <h3 className="mt-8 text-3xl font-medium">Kribbl collecte</h3>
              <p className="mt-4 text-xl leading-9 text-gray-500">
                Des milliers d'appels d'offres récupérés chaque jour depuis BOAMP et TED.
              </p>
            </div>

            <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
              <div className="text-6xl font-semibold text-gray-100">02</div>
              <h3 className="mt-8 text-3xl font-medium">Leman analyse</h3>
              <p className="mt-4 text-xl leading-9 text-gray-500">
                Notre IA filtre, résume et score chaque opportunité selon votre profil.
              </p>
            </div>

            <div className="rounded-[2rem] border border-black/5 bg-white p-8 shadow-sm">
              <div className="text-6xl font-semibold text-gray-100">03</div>
              <h3 className="mt-8 text-3xl font-medium">Vous décidez</h3>
              <p className="mt-4 text-xl leading-9 text-gray-500">
                GO, MAYBE ou NO : identifiez en quelques minutes ce qui vaut le coup.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-4">
            <div className="rounded-[2rem] border border-black/5 bg-white p-6 text-center shadow-sm">
              <div className="text-5xl font-semibold">5h</div>
              <div className="mt-2 text-lg text-gray-500">gagnées / semaine</div>
            </div>
            <div className="rounded-[2rem] border border-black/5 bg-white p-6 text-center shadow-sm">
              <div className="text-5xl font-semibold">84%</div>
              <div className="mt-2 text-lg text-gray-500">de bruit en moins</div>
            </div>
            <div className="rounded-[2rem] border border-black/5 bg-white p-6 text-center shadow-sm">
              <div className="text-5xl font-semibold">10s</div>
              <div className="mt-2 text-lg text-gray-500">pour tout comprendre</div>
            </div>
            <div className="rounded-[2rem] border border-black/5 bg-white p-6 text-center shadow-sm">
              <div className="text-5xl font-semibold">3×</div>
              <div className="mt-2 text-lg text-gray-500">plus de réponses</div>
            </div>
          </div>
        </section>

        <section className="mt-24 rounded-[2.5rem] bg-[#0f1728] px-6 py-16 text-center text-white shadow-sm md:px-10">
          <h2 className="text-5xl font-semibold tracking-tight">
            Prêt à transformer votre veille ?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-2xl leading-10 text-white/70">
            Rejoignez les agences qui ne ratent plus une opportunité.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#"
              className="rounded-full border border-white/15 bg-white/10 px-8 py-4 text-lg font-medium text-white"
            >
              Demander une démo
            </a>
            <a href="#" className="text-lg font-medium text-white/80">
              Commencer gratuitement →
            </a>
          </div>
        </section>
      </div>

      <footer className="border-t border-black/5">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            <div>
              <div className="text-3xl font-semibold">kribbl</div>
              <p className="mt-3 text-xl text-gray-500">
                Veille intelligente pour agences d’architecture.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-16 gap-y-4 text-lg text-gray-500">
              <a href="#">Fonctionnalités</a>
              <a href="#">Confidentialité</a>
              <a href="#">Tarifs</a>
              <a href="#">CGU</a>
              <a href="#">Blog</a>
              <a href="#">Support</a>
            </div>
          </div>

          <div className="mt-10 border-t border-black/5 pt-8 text-lg text-gray-400">
            © 2026 Kribbl
          </div>
        </div>
      </footer>
    </main>
  )
}