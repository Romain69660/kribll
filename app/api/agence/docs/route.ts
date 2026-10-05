import { NextRequest, NextResponse } from 'next/server'
import { codeOk } from '../../../../lib/agence/code'

export const maxDuration = 300

const MAX_TOTAL = 24 * 1024 * 1024

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_GBADW_DEMO !== '1' && !codeOk(req.headers.get('x-agence-code')))
    return NextResponse.json({ error: "Code de l'agence incorrect, reconnectez-vous" }, { status: 401 })
  const key = process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY n'est pas configurée sur le serveur (Vercel, Settings, Environment Variables)" }, { status: 500 })

  const { title, buyer, files } = await req.json() as { title?: string; buyer?: string; files: { name: string; url: string }[] }
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  const content: Record<string, unknown>[] = []
  const read: string[] = []
  let total = 0
  for (const f of (files || []).slice(0, 6)) {
    if (!base || !f.url.startsWith(base + '/storage/')) continue       // on ne lit que les fichiers déposés sur la plateforme
    const r = await fetch(f.url)
    if (!r.ok) continue
    const b = Buffer.from(await r.arrayBuffer())
    if (total + b.length > MAX_TOTAL) continue
    total += b.length
    content.push({ type: 'input_file', filename: f.name, file_data: `data:application/pdf;base64,${b.toString('base64')}` })
    read.push(f.name)
  }
  if (!content.length) return NextResponse.json({ error: 'Aucun PDF lisible (trop lourd ou introuvable). Déposez le règlement de la consultation en PDF.' }, { status: 400 })

  content.push({ type: 'input_text', text: `Tu lis les pièces d'une consultation publique française de maîtrise d'œuvre pour une agence d'architecture étrangère.
Consultation : ${title || ''} (${buyer || ''}).

Extrais uniquement ce qui est écrit dans les documents. Si une information n'y figure pas, mets null ou une liste vide : n'invente rien et ne déduis pas de montant.
Chaque texte est donné en trois langues : {"fr": "...", "en": "...", "es": "..."}. Phrases courtes et précises, avec le numéro d'article quand il est indiqué.

Réponds uniquement par cet objet JSON :
{
 "works_eur": nombre ou null (montant des travaux HT en euros),
 "prize_eur": nombre ou null (prime par équipe HT en euros),
 "teams": nombre ou null (équipes admises à concourir),
 "deadline": "AAAA-MM-JJ" ou null (date limite de remise des candidatures ou des offres),
 "deadline_time": "HH:MM" ou null,
 "procedure": {fr,en,es} ou null (type de procédure et phases),
 "lead_rule": {fr,en,es} ou null (qui peut ou doit être mandataire, forme du groupement, limites de participation),
 "summary": {fr,en,es} (3 phrases : ce qu'est le projet, sa taille, ce qui est demandé),
 "competences": [{fr,en,es}] (compétences exigées dans l'équipe),
 "references": [{fr,en,es}] (références et capacités exigées, chiffre d'affaires minimal compris),
 "admissibility": [{fr,en,es}] (conditions qui rendent la candidature irrecevable si elles manquent),
 "to_submit": [{fr,en,es}] (pièces à remettre, avec format et nombre de pages),
 "criteria": [{fr,en,es}] (critères de sélection ou de jugement, avec pondération),
 "key_dates": [{fr,en,es}] (autres dates : visite, jury, remise des projets, travaux),
 "watch": [{fr,en,es}] (points d'attention pour une agence étrangère : langue, traduction assermentée, inscription à l'ordre, assurance)
}` })

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.GBADW_DOC_MODEL || 'gpt-4.1', input: [{ role: 'user', content }] }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = json?.error?.message || `OpenAI ${res.status}`
    return NextResponse.json({ error: /quota|credit|billing/i.test(msg) ? 'Crédit OpenAI épuisé : rechargez le compte.' : msg }, { status: 502 })
  }
  const text: string = (json?.output || [])
    .flatMap((o: { type: string; content?: { text?: string }[] }) => o.type === 'message' ? (o.content || []) : [])
    .map((c: { text?: string }) => c.text || '').join('\n')
  const a = text.indexOf('{'), b = text.lastIndexOf('}')
  let dossier: Record<string, unknown> | null = null
  try { dossier = JSON.parse(text.slice(a, b + 1)) } catch { /* ci-dessous */ }
  if (!dossier) return NextResponse.json({ error: "L'analyse a répondu dans un format illisible. Relancez." }, { status: 502 })
  return NextResponse.json({ dossier: { ...dossier, files_read: read, analysed_at: new Date().toISOString() } })
}
