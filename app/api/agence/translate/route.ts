import { NextRequest, NextResponse } from 'next/server'
import { codeOk } from '../../../../lib/agence/code'

// Traduit les notes internes (suivi, contacts) dans la langue choisie sur le site.
// Le texte d'origine n'est jamais modifié en base : seule l'affichage est traduit.

export const maxDuration = 60

const DEMO = process.env.NEXT_PUBLIC_GBADW_DEMO === '1'
const NAMES: Record<string, string> = { fr: 'French', en: 'English', es: 'Spanish (Spain)' }

export async function POST(req: NextRequest) {
  if (!DEMO && !codeOk(req.headers.get('x-agence-code'))) return NextResponse.json({ error: 'Code de l\'agence incorrect, reconnectez-vous' }, { status: 401 })
  const key = process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY n'est pas configurée sur le serveur" }, { status: 500 })

  const { texts, lang } = await req.json().catch(() => ({}))
  if (!Array.isArray(texts) || !NAMES[lang]) return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
  const items = texts.slice(0, 60).map((s: unknown) => (typeof s === 'string' ? s : '').slice(0, 4000))
  if (!items.some(Boolean)) return NextResponse.json({ texts: items })

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.GBADW_TRANSLATE_MODEL || 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You translate short internal notes of an architecture firm into ${NAMES[lang]}. `
            + 'Keep the meaning, tone and line breaks. Keep company names, people names, place names, file names, email addresses, URLs, amounts, dates and acronyms (BET, MOE, OPC, DC1, DC2, VRD, QEB, SSI, PEM, AWS...) unchanged. '
            + `If a text is already in ${NAMES[lang]}, return it unchanged. Never add comments. `
            + 'Answer with a JSON object {"t": [...]} holding exactly one translated string per input, in the same order.',
        },
        { role: 'user', content: JSON.stringify({ texts: items }) },
      ],
    }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) return NextResponse.json({ error: json?.error?.message || `OpenAI ${res.status}` }, { status: 502 })
  let out: unknown = null
  try { out = JSON.parse(json?.choices?.[0]?.message?.content || '{}').t } catch { out = null }
  if (!Array.isArray(out) || out.length !== items.length) return NextResponse.json({ texts: items })
  return NextResponse.json({ texts: out.map((s, i) => (typeof s === 'string' && s.trim() ? s : items[i])) })
}
