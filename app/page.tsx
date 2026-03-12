import { supabase } from "../lib/supabase"

type Tender = {
  id: number
  title: string
  buyer_name: string
  ai_summary: string
  final_score: number
  url: string
  source?: string
  country?: string
  publication_date?: string
  deadline?: string
  category?: string
}

type LemanData = {
  project_type?: string
  program?: string
  location?: string
  procedure_type?: string
  main_discipline?: string
  estimated_scale?: string
  relevance?: string
  summary?: string
  why_it_matters?: string
}

function parseJson(value?: string): LemanData {
  if (!value) return {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function getLemanData(tender: Tender): LemanData {
  return parseJson(tender.ai_summary)
}

function getSummary(tender: Tender) {
  const leman = getLemanData(tender)
  if (!leman.summary) return "Résumé non disponible."

  const text = leman.summary.trim()
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

function splitWhyItMatters(text?: string) {
  if (!text) return []

  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/^\s+|\s+$/g, "")

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

function formatDate(dateString?: string) {
  if (!dateString) return null
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toLocaleDateString("fr-FR")
}

export default async function Home() {
  const { data, error } = await supabase
    .from("tenders")
    .select("*")
    .order("final_score", { ascending: false })
    .limit(20)

  const tenders = (data as Tender[]) || []

  return (
    <main className="min-h-screen bg-[#f5f5f2]">
      <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
        <header className="mb-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white">
                Kribll
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-sm text-gray-600 shadow-sm">
                Marchés publics architecture
              </div>
            </div>

            <button className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
              FR
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-[1.45fr_0.8fr]">
            <div className="rounded-[2rem] bg-[#d9f3bf] px-8 py-8 shadow-sm md:px-10 md:py-10">
              <h1 className="max-w-4xl text-4xl font-bold leading-[0.95] tracking-tight text-black md:text-6xl">
                Trouvez les appels d’offres les plus pertinents pour votre agence
              </h1>

              <p className="mt-5 max-w-2xl text-base text-gray-700 md:text-lg">
                Kribll vous aide à repérer, comprendre et filtrer rapidement les
                opportunités vraiment intéressantes.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    Résultats affichés
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900">
                    {tenders.length}
                  </div>
                </div>

                <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    Tri
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900">
                    Score IA
                  </div>
                </div>

                <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    Meilleur score
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900">
                    {tenders[0]?.final_score ?? "-"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-sm">
              <div className="mb-4 inline-flex rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                Vue rapide
              </div>

              <h2 className="text-2xl font-semibold text-gray-950">
                Ce que Kribll vous montre
              </h2>

              <div className="mt-6 space-y-3">
                <div className="rounded-2xl bg-gray-50 px-4 py-4">
                  <div className="text-sm font-semibold text-gray-900">
                    📅 Date de publication
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    Pour repérer immédiatement les annonces récentes.
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 px-4 py-4">
                  <div className="text-sm font-semibold text-gray-900">
                    📍 Localisation
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    Pour filtrer les projets adaptés à votre zone.
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 px-4 py-4">
                  <div className="text-sm font-semibold text-gray-900">
                    ⭐ Pertinence
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    Pour savoir rapidement si ça mérite votre attention.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
            Erreur Supabase : {JSON.stringify(error)}
          </div>
        )}

        {!error && tenders.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-gray-600 shadow-sm">
            Aucun appel d’offres trouvé.
          </div>
        )}

        {!error && tenders.length > 0 && (
          <section className="space-y-6">
            {tenders.map((tender, index) => {
              const leman = getLemanData(tender)
              const summary = getSummary(tender)
              const whyPoints = splitWhyItMatters(leman.why_it_matters)

              return (
                <article
                  key={tender.id}
                  className="rounded-[2rem] bg-white p-6 shadow-sm transition hover:shadow-md md:p-8"
                >
                  <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-5xl">
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        {index < 3 && (
                          <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                            Opportunité prioritaire
                          </span>
                        )}

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${getOpportunityPill(
                            tender.final_score
                          )}`}
                        >
                          ⭐ {getOpportunityLabel(tender.final_score)}
                        </span>

                        {tender.publication_date && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            📅 {formatDate(tender.publication_date)}
                          </span>
                        )}

                        {tender.country && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            🌍 {tender.country}
                          </span>
                        )}

                        {tender.deadline && (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                            ⏳ {formatDate(tender.deadline)}
                          </span>
                        )}
                      </div>

                      <h2 className="max-w-5xl text-3xl font-semibold leading-tight text-gray-950">
                        {tender.title}
                      </h2>

                      <p className="mt-4 text-sm text-gray-500">
                        Maître d’ouvrage : {tender.buyer_name || "Inconnu"}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <div
                        className={`inline-flex min-w-24 items-center justify-center rounded-full px-4 py-2.5 text-base font-semibold ${getScoreBadge(
                          tender.final_score
                        )}`}
                      >
                        {tender.final_score}
                      </div>
                    </div>
                  </div>

                  <div className="mb-5 grid gap-3 md:grid-cols-4">
                    <div className="rounded-3xl bg-[#f4f5f6] px-5 py-4">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        📍 Localisation
                      </div>
                      <div className="mt-2 text-sm font-medium leading-6 text-gray-900">
                        {getShortLocation(leman.location)}
                      </div>
                    </div>

                    <div className="rounded-3xl bg-[#f4f5f6] px-5 py-4">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        🏗 Échelle
                      </div>
                      <div className="mt-2 text-sm font-medium leading-6 text-gray-900">
                        {getShortScale(leman.estimated_scale)}
                      </div>
                    </div>

                    <div className="rounded-3xl bg-[#f4f5f6] px-5 py-4">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        🧠 Discipline
                      </div>
                      <div className="mt-2 text-sm font-medium leading-6 text-gray-900">
                        {getShortDiscipline(leman.main_discipline)}
                      </div>
                    </div>

                    <div className="rounded-3xl bg-[#eef4ff] px-5 py-4">
                      <div className="text-xs uppercase tracking-wide text-blue-500">
                        🎯 Mission
                      </div>
                      <div className="mt-2 text-sm font-medium leading-6 text-gray-900">
                        {getShortProjectType(leman.project_type)}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 grid gap-3 md:grid-cols-2">
                    {leman.procedure_type && (
                      <div className="rounded-3xl bg-[#f8f8f8] px-5 py-4">
                        <div className="text-xs uppercase tracking-wide text-gray-500">
                          🧾 Procédure
                        </div>
                        <div className="mt-2 text-sm leading-6 text-gray-800">
                          {getShortProcedure(leman.procedure_type)}
                        </div>
                      </div>
                    )}

                    {leman.program && (
                      <div className="rounded-3xl bg-[#f8f8f8] px-5 py-4">
                        <div className="text-xs uppercase tracking-wide text-gray-500">
                          📦 Programme
                        </div>
                        <div className="mt-2 text-sm leading-6 text-gray-800">
                          {getCompactProgram(leman.program)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-4 rounded-3xl border border-gray-200 bg-white px-5 py-5">
                    <div className="text-xs uppercase tracking-wide text-gray-500">
                      Résumé du projet
                    </div>
                    <div className="mt-2 text-base leading-7 text-gray-800">
                      {summary}
                    </div>
                  </div>

                  {leman.relevance && (
                    <div className="mb-4 rounded-3xl bg-[#eef9ef] px-5 py-5">
                      <div className="text-xs uppercase tracking-wide text-green-600">
                        ⭐ Pertinence pour votre agence
                      </div>
                      <div className="mt-2 text-base leading-7 text-gray-800">
                        {leman.relevance}
                      </div>
                    </div>
                  )}

                  {whyPoints.length > 0 && (
                    <div className="mb-6 rounded-3xl bg-[#f4f5f6] px-5 py-5">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        💡 Pourquoi c’est intéressant
                      </div>
                      <ul className="mt-3 space-y-2 text-base leading-7 text-gray-800">
                        {whyPoints.map((point, idx) => (
                          <li key={idx} className="flex gap-3">
                            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-black" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-4">
                    <a
                      href={tender.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-2xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:opacity-85"
                    >
                      Voir l’avis
                    </a>

                    {tender.category && (
                      <span className="text-sm text-gray-500">
                        Catégorie : {tender.category}
                      </span>
                    )}
                  </div>
                </article>
              )
            })}
          </section>
        )}
      </div>
    </main>
  )
}