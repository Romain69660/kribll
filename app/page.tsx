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
  return leman.summary || "Résumé non disponible."
}

function formatDate(dateString?: string) {
  if (!dateString) return null
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toLocaleDateString("fr-FR")
}

function getScoreBadge(score: number) {
  if (score >= 100) return "bg-black text-white"
  if (score >= 85) return "bg-gray-900 text-white"
  if (score >= 70) return "bg-gray-200 text-gray-900"
  return "bg-gray-100 text-gray-700"
}

export default async function Home() {
  const { data, error } = await supabase
    .from("tenders")
    .select("*")
    .order("final_score", { ascending: false })
    .limit(20)

  const tenders = (data as Tender[]) || []

  return (
    <main className="min-h-screen bg-[#f6f6f3]">
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

          <div className="grid gap-6 md:grid-cols-[1.4fr_0.8fr]">
            <div className="rounded-[2rem] bg-[#d8f7b8] px-8 py-8 shadow-sm md:px-10 md:py-10">
              <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-black md:text-6xl">
                Trouvez les appels d’offres les plus pertinents pour votre agence
              </h1>

              <p className="mt-4 max-w-2xl text-base text-gray-700 md:text-lg">
                Kribll vous aide à repérer, comprendre et filtrer rapidement les
                opportunités vraiment intéressantes.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    Résultats affichés
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900">
                    {tenders.length}
                  </div>
                </div>

                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-gray-500">
                    Tri
                  </div>
                  <div className="mt-1 text-2xl font-semibold text-gray-900">
                    Score IA
                  </div>
                </div>

                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
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
                    Pour savoir si l’opportunité est récente.
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
                    Pour comprendre rapidement si ça vaut votre temps.
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

              return (
                <article
                  key={tender.id}
                  className="rounded-[2rem] bg-white p-6 shadow-sm transition hover:shadow-md md:p-8"
                >
                  <div className="mb-6 flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-5xl">
                      <div className="mb-4 flex flex-wrap items-center gap-2">
                        {index < 3 && (
                          <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                            Opportunité prioritaire
                          </span>
                        )}

                        {tender.publication_date && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            📅 Publié le {formatDate(tender.publication_date)}
                          </span>
                        )}

                        {tender.country && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            🌍 {tender.country}
                          </span>
                        )}

                        {tender.source && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            🧾 {tender.source}
                          </span>
                        )}

                        {tender.deadline && (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                            ⏳ Échéance {formatDate(tender.deadline)}
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

                  <div className="mb-6 grid gap-3 md:grid-cols-3">
                    <div className="rounded-3xl bg-[#f4f5f6] px-5 py-5">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        📍 Localisation
                      </div>
                      <div className="mt-2 text-base font-medium leading-6 text-gray-900">
                        {leman.location || "Non renseignée"}
                      </div>
                    </div>

                    <div className="rounded-3xl bg-[#f4f5f6] px-5 py-5">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        🏗 Échelle du projet
                      </div>
                      <div className="mt-2 text-base font-medium leading-6 text-gray-900">
                        {leman.estimated_scale || "Non renseignée"}
                      </div>
                    </div>

                    <div className="rounded-3xl bg-[#f4f5f6] px-5 py-5">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        🧠 Discipline
                      </div>
                      <div className="mt-2 text-base font-medium leading-6 text-gray-900">
                        {leman.main_discipline || "Non renseignée"}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 grid gap-3 md:grid-cols-2">
                    {leman.project_type && (
                      <div className="rounded-3xl bg-[#eef4ff] px-5 py-5">
                        <div className="text-xs uppercase tracking-wide text-blue-500">
                          Type de mission
                        </div>
                        <div className="mt-2 text-base font-medium leading-6 text-gray-900">
                          {leman.project_type}
                        </div>
                      </div>
                    )}

                    {leman.procedure_type && (
                      <div className="rounded-3xl bg-[#f8f8f8] px-5 py-5">
                        <div className="text-xs uppercase tracking-wide text-gray-500">
                          Procédure
                        </div>
                        <div className="mt-2 text-base font-medium leading-6 text-gray-900">
                          {leman.procedure_type}
                        </div>
                      </div>
                    )}
                  </div>

                  {leman.program && (
                    <div className="mb-4 rounded-3xl bg-[#f8f8f8] px-5 py-5">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Programme
                      </div>
                      <div className="mt-2 text-base leading-7 text-gray-800">
                        {leman.program}
                      </div>
                    </div>
                  )}

                  <div className="mb-4 rounded-3xl bg-white border border-gray-200 px-5 py-5">
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

                  {leman.why_it_matters && (
                    <div className="mb-6 rounded-3xl bg-[#f4f5f6] px-5 py-5">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        💡 Pourquoi c’est intéressant
                      </div>
                      <div className="mt-2 text-base leading-7 text-gray-800">
                        {leman.why_it_matters}
                      </div>
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