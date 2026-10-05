import { NextRequest, NextResponse } from 'next/server'
import { codeOk } from '../../../../lib/agence/code'
import { fillParagraphs, paragraphs, unzipBuffer, zipBuffer } from '../../../../lib/agence/docx'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_GBADW_DEMO !== '1' && !codeOk(req.headers.get('x-agence-code')))
    return NextResponse.json({ error: "Code de l'agence incorrect, reconnectez-vous" }, { status: 401 })
  const key = process.env.OPENAI_API_KEY
  if (!key) return NextResponse.json({ error: "OPENAI_API_KEY n'est pas configurée sur le serveur (Vercel, Settings, Environment Variables)" }, { status: 500 })

  const { url, name, data } = await req.json() as { url: string; name: string; data: Record<string, unknown> }
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '')
  if (!(base && url.startsWith(base + '/storage/')) && !url.startsWith(req.nextUrl.origin + '/dossiers/')) return NextResponse.json({ error: 'Fichier introuvable sur la plateforme' }, { status: 400 })
  if (!/\.docx$/i.test(name)) return NextResponse.json({ error: 'Seuls les fichiers Word .docx peuvent être remplis. Pour un .doc : ouvrez-le dans Word, « Enregistrer sous », format .docx, puis redéposez-le.' }, { status: 400 })

  const r = await fetch(url)
  if (!r.ok) return NextResponse.json({ error: 'Fichier introuvable sur la plateforme' }, { status: 400 })
  let entries
  try { entries = unzipBuffer(Buffer.from(await r.arrayBuffer())) } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }) }
  const doc = entries.find(e => e.name === 'word/document.xml')
  if (!doc) return NextResponse.json({ error: 'Ce fichier n’est pas un document Word valide' }, { status: 400 })
  const xml = doc.data.toString('utf8')
  const paras = paragraphs(xml)
  if (paras.length > 1500) return NextResponse.json({ error: 'Document trop long pour être rempli automatiquement' }, { status: 400 })

  const listing = paras.map(p => `${p.i}${p.cell ? 'c' : ''}|${p.text.replace(/\n/g, ' ⏎ ')}`).join('\n')
  const prompt = `Tu remplis un formulaire administratif français de marché public pour une agence d'architecture candidate.

DONNÉES CONNUES (JSON) :
${JSON.stringify(data, null, 1)}

DOCUMENT : un paragraphe par ligne, sous la forme numéro|texte. Un « c » après le numéro signifie que le paragraphe est dans une cellule de tableau. Une ligne vide après le | est un champ ou une cellule vide.
${listing}

TA TÂCHE : remplir uniquement les endroits laissés vides, avec les données connues.
- Un endroit à remplir est : une cellule vide placée après ou sous un libellé, une ligne de points ou de tirets bas, un texte entre crochets à remplacer, une case à cocher « ☐ » dont le choix découle des données.
- Pour chaque endroit rempli, donne le nouveau texte complet du paragraphe : garde le libellé d'origine et remplace seulement les points, les tirets bas ou le crochet par la valeur. Pour une case cochée, remplace « ☐ » par « ☒ ».
- Ne modifie aucun autre paragraphe : ni titres, ni consignes, ni mentions légales.
- N'invente rien. Si la donnée n'est pas dans les données connues, ne remplis pas et ajoute le libellé concerné dans "missing".
- Ne remplis jamais les signatures, ni les parties réservées à l'acheteur ou aux autres membres du groupement quand leurs données ne sont pas fournies.
- Écris en français.

Réponds uniquement par ce JSON : {"fills":[{"i":numéro,"text":"nouveau texte du paragraphe"}],"missing":["libellé du champ resté vide"]}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: process.env.GBADW_DOC_MODEL || 'gpt-4.1', temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: prompt }] }),
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = json?.error?.message || `OpenAI ${res.status}`
    return NextResponse.json({ error: /quota|credit|billing/i.test(msg) ? 'Crédit OpenAI épuisé : rechargez le compte.' : msg }, { status: 502 })
  }
  let out: { fills?: { i: number; text: string }[]; missing?: string[] }
  try { out = JSON.parse(json.choices[0].message.content) } catch { return NextResponse.json({ error: 'Réponse illisible. Relancez.' }, { status: 502 }) }

  const fills: Record<number, string> = {}
  for (const f of out.fills || []) {
    const p = paras[Number(f.i)]
    if (p && typeof f.text === 'string' && f.text.trim() && f.text !== p.text) fills[p.i] = f.text
  }
  doc.data = Buffer.from(fillParagraphs(xml, fills), 'utf8')
  const file = zipBuffer(entries)
  return NextResponse.json({
    name: name.replace(/\.docx$/i, '') + '_rempli.docx',
    file: file.toString('base64'),
    filled: Object.keys(fills).length,
    missing: (out.missing || []).filter(x => typeof x === 'string').slice(0, 40),
  })
}
