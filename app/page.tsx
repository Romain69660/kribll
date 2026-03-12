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
  return leman.summary || tender.ai_summary || "No summary available"
}

function getScoreBadge(score: number) {
  if (score >= 100) return "bg-black text-white"
  if (score >= 85) return "bg-gray-800 text-white"
  if (score >= 70) return "bg-gray-200 text-gray-900"
  return "bg-gray-100 text-gray-700"
}

function formatDate(dateString?: string) {
  if (!dateString) return null
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return dateString
  return date.toLocaleDateString()
}

export default async function Home() {
  const { data, error } = await supabase
    .from("tenders")
    .select("*")
    .order("final_score", { ascending: false })
    .limit(20)

  const tenders = (data as Tender[]) || []

  return (
    <main className="min-h-screen bg-neutral-100">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <header className="mb-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-black px-3 py-2 text-sm font-semibold text-white">
                Kribll
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-sm text-gray-600 shadow-sm">
                Architecture tenders
              </div>
            </div>

            <button className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm">
              EN
            </button>
          </div>

          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-gray-950 md:text-5xl">
            Find the most relevant public tenders for your agency
          </h1>

          <p className="mt-3 max-w-2xl text-base text-gray-600 md:text-lg">
            Ranked opportunities, clearer summaries, faster screening.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Results shown
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {tenders.length}
              </div>
            </div>

            <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Sorted by
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                AI relevance
              </div>
            </div>

            <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Focus
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                Public procurement
              </div>
            </div>

            <div className="rounded-2xl bg-white px-4 py-4 shadow-sm">
              <div className="text-xs uppercase tracking-wide text-gray-500">
                Top score
              </div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {tenders[0]?.final_score ?? "-"}
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 shadow-sm">
            Supabase error: {JSON.stringify(error)}
          </div>
        )}

        {!error && tenders.length === 0 && (
          <div className="rounded-2xl bg-white p-6 text-gray-600 shadow-sm">
            No tenders found.
          </div>
        )}

        {!error && tenders.length > 0 && (
          <section className="space-y-5">
            {tenders.map((tender, index) => {
              const leman = getLemanData(tender)
              const summary = getSummary(tender)

              return (
                <article
                  key={tender.id}
                  className="rounded-3xl border border-black/5 bg-white p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-4xl">
                      <div className="mb-3 flex flex-wrap items-center gap-2">
                        {index < 3 && (
                          <span className="rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
                            Top opportunity
                          </span>
                        )}

                        {tender.source && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            {tender.source}
                          </span>
                        )}

                        {tender.publication_date && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            Published {formatDate(tender.publication_date)}
                          </span>
                        )}

                        {tender.deadline && (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                            Deadline {formatDate(tender.deadline)}
                          </span>
                        )}

                        {tender.country && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            {tender.country}
                          </span>
                        )}
                      </div>

                      <h2 className="text-2xl font-semibold leading-snug text-gray-950">
                        {tender.title}
                      </h2>

                      <p className="mt-3 text-sm text-gray-500">
                        Client: {tender.buyer_name || "Unknown"}
                      </p>
                    </div>

                    <div className="shrink-0">
                      <div
                        className={`inline-flex min-w-20 items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ${getScoreBadge(
                          tender.final_score
                        )}`}
                      >
                        {tender.final_score}
                      </div>
                    </div>
                  </div>

                  <div className="mb-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Location
                      </div>
                      <div className="mt-1 text-sm font-medium text-gray-900">
                        {leman.location || "N/A"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Project scale
                      </div>
                      <div className="mt-1 text-sm font-medium text-gray-900">
                        {leman.estimated_scale || "N/A"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-gray-50 px-4 py-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">
                        Discipline
                      </div>
                      <div className="mt-1 text-sm font-medium text-gray-900">
                        {leman.main_discipline || "N/A"}
                      </div>
                    </div>
                  </div>

                  {leman.project_type && (
                    <div className="mb-4 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-gray-800">
                      <span className="font-semibold text-gray-900">
                        Project type:
                      </span>{" "}
                      {leman.project_type}
                    </div>
                  )}

                  {leman.program && (
                    <div className="mb-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">
                        Program:
                      </span>{" "}
                      {leman.program}
                    </div>
                  )}

                  {leman.procedure_type && (
                    <div className="mb-4 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">
                        Procedure:
                      </span>{" "}
                      {leman.procedure_type}
                    </div>
                  )}

                  <p className="mb-5 max-w-5xl text-[15px] leading-7 text-gray-700">
                    {summary}
                  </p>

                  {leman.relevance && (
                    <div className="mb-4 rounded-2xl bg-green-50 px-4 py-3 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">
                        Relevance:
                      </span>{" "}
                      {leman.relevance}
                    </div>
                  )}

                  {leman.why_it_matters && (
                    <div className="mb-5 rounded-2xl bg-black/5 px-4 py-3 text-sm text-gray-700">
                      <span className="font-semibold text-gray-900">
                        Why it matters:
                      </span>{" "}
                      {leman.why_it_matters}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={tender.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-xl bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-85"
                    >
                      View notice
                    </a>

                    {tender.category && (
                      <span className="text-sm text-gray-500">
                        Category: {tender.category}
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