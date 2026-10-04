import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const maxDuration = 120

const DEMO = process.env.NEXT_PUBLIC_GBADW_DEMO === '1'

function extractJson(text: string): unknown {
  const a = text.indexOf('{'), b = text.lastIndexOf('}')
  if (a < 0 || b < a) return null
  try { return JSON.parse(text.slice(a, b + 1)) } catch { return null }
}

export async function POST(req: NextRequest) {
  if (!DEMO) {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer /, '')
    if (!token) return NextResponse.json({ error: 'Non connecté' }, { status: 401 })
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
    const { data: user } = await sb.auth.getUser(token)
    if (!user?.user) return NextResponse.json({ error: 'Session expirée, reconnectez-vous' }, { status: 401 })
    const { data: member } = await sb.rpc('is_gbadw_member')
    if (member !== true) return NextResponse.json({ error: "Ce compte n'a pas accès à l'espace agence" }, { status: 403 })
  }
  const key = process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY n'est pas configurée sur le serveur (Vercel, Settings, Environment Variables)" }, { status: 500 })

  const { tender, disciplines, place } = await req.json()
  if (!Array.isArray(disciplines) || !disciplines.length) return NextResponse.json({ error: 'Aucune compétence choisie' }, { status: 400 })

  const prompt = `Tu aides une agence d'architecture à constituer une équipe pour une consultation publique en France.

Projet : ${tender?.title || ''}
Maître d'ouvrage : ${tender?.buyer || ''}
Lieu : ${place || tender?.location || tender?.departement || 'France'}
Typologie : ${tender?.typology || ''}
Montant des travaux : ${tender?.budget ? tender.budget + ' EUR' : 'inconnu'}

Compétences recherchées : ${disciplines.join(' ; ')}

Cherche sur le web des entreprises réelles (bureaux d'études, économistes, architectes, entreprises) qui couvrent ces compétences, en priorité implantées dans le département ou la région du projet, avec de préférence des références sur ce type de bâtiment. Trouve 2 à 4 entreprises par compétence, 12 au maximum au total. Une entreprise qui couvre plusieurs compétences est un bon résultat.

Règles strictes :
- uniquement des coordonnées professionnelles publiées par l'entreprise elle-même ou dans un annuaire professionnel (standard, mail de contact). Jamais de coordonnées personnelles.
- n'invente rien : si un téléphone ou un mail n'est pas trouvé, mets une chaîne vide.
- source_url est la page où tu as trouvé les coordonnées.

Réponds uniquement par un objet JSON, sans texte autour :
{"firms":[{"company":"","discipline":"","city":"","phone":"","email":"","website":"","source_url":"","why":"une phrase : pourquoi cette entreprise pour ce projet"}]}`

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.GBADW_SEARCH_MODEL || 'gpt-4.1',
      tools: [{ type: 'web_search_preview', user_location: { type: 'approximate', country: 'FR' } }],
      input: prompt,
    }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = json?.error?.message || `OpenAI ${res.status}`
    return NextResponse.json({ error: /quota|credit|billing/i.test(msg) ? 'Crédit OpenAI épuisé : rechargez le compte.' : msg }, { status: 502 })
  }
  const text: string = (json?.output || [])
    .flatMap((o: { type: string; content?: { type: string; text?: string }[] }) => o.type === 'message' ? (o.content || []) : [])
    .map((c: { text?: string }) => c.text || '').join('\n')
  const parsed = extractJson(text) as { firms?: Record<string, unknown>[] } | null
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '') || null
  const firms = (parsed?.firms || []).filter(f => s(f.company)).slice(0, 12).map(f => ({
    company: s(f.company)!, discipline: s(f.discipline), city: s(f.city), phone: s(f.phone), email: s(f.email),
    website: s(f.website), source_url: s(f.source_url), why: s(f.why),
  }))
  if (!parsed) return NextResponse.json({ error: 'La recherche a répondu dans un format illisible. Relancez.' }, { status: 502 })
  return NextResponse.json({ firms })
}
