import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ───────────────────────────── Types ─────────────────────────────

export type Tender = {
  publication_number: string
  source: string | null
  title: string | null
  title_en?: string | null
  title_es?: string | null
  buyer_name: string | null
  location: string | null
  departement: string | null
  url: string | null
  dce_url: string | null
  platform: string | null
  publication_date: string | null
  deadline: string | null
  deadline_type: string | null
  typology: string | null
  fit: 'CORE' | 'PARTNER' | 'NO' | null
  contract_type: 'ARCHITECT_LED' | 'STUDY' | 'DESIGN_BUILD' | 'OTHER' | null
  team_lead: string | null
  verdict: 'GO' | 'MAYBE' | 'NO' | 'ERROR' | null
  score: number | null
  relevance_score: number | null
  procedure_type: string | null
  mission: string | null
  estimated_budget: string | null
  budget_eur: number | null
  prize_eur: number | null
  teams_shortlisted: number | null
  project_type: string | null
  program: string | null
  required_references: string[] | null
  eligibility: string | null
  blocking_points: string[] | null
  summary_fr: string | null
  summary_en: string | null
  summary_es: string | null
  cpv_code: string | null
  is_live: boolean | null
  first_seen: string | null
  last_seen: string | null
}

export type Status = 'none' | 'shortlist' | 'go' | 'contacted' | 'team' | 'preparing' | 'ready' | 'submitted' | 'selected' | 'won' | 'lost' | 'dropped'

export type Tracking = {
  publication_number: string
  status: Status
  starred: boolean
  owner: string | null
  notes: string | null
  checklist: Record<string, boolean>
  suggestions?: Firm[] | null
  dossier?: Dossier | null
  updated_by?: string | null
  updated_at?: string | null
}

export type L3 = { fr?: string; en?: string; es?: string }
export type Dossier = {
  works_eur?: number | null; prize_eur?: number | null; teams?: number | null
  deadline?: string | null; deadline_time?: string | null
  procedure?: L3 | null; lead_rule?: L3 | null; summary?: L3 | null
  competences?: L3[]; references?: L3[]; admissibility?: L3[]; to_submit?: L3[]; criteria?: L3[]; key_dates?: L3[]; watch?: L3[]
  files_read?: string[]; analysed_at?: string
}
export type Doc = { id: string; publication_number: string; name: string; path: string; size: number; created_by?: string | null; created_at?: string }

export type ContactStatus = 'todo' | 'contacted' | 'interested' | 'confirmed' | 'declined'

export type Contact = {
  id: string
  publication_number: string
  company: string
  discipline: string | null
  city: string | null
  phone: string | null
  email: string | null
  website: string | null
  source_url: string | null
  why: string | null
  note: string | null
  status: ContactStatus
  created_at?: string
}

export type Firm = Omit<Contact, 'id' | 'publication_number' | 'status' | 'note' | 'created_at'>

// ───────────────────────────── Constants ─────────────────────────────

export const CORE_TYPOLOGIES = ['TRANSPORT', 'MAINTENANCE', 'HEALTH']
export const TYPOLOGIES = [
  'TRANSPORT', 'MAINTENANCE', 'HEALTH', 'EDUCATION', 'HOUSING', 'SPORT', 'CULTURE',
  'PUBLIC_OFFICES', 'HERITAGE', 'COMMERCE_TOURISM', 'URBAN_LANDSCAPE', 'OTHER',
]
export const STATUS_GROUPS: { key: string; tone: string; items: Status[] }[] = [
  { key: 'todo', tone: 'yellow', items: ['shortlist'] },
  { key: 'doing', tone: 'blue', items: ['go', 'contacted', 'team', 'preparing', 'ready'] },
  { key: 'done', tone: 'green', items: ['submitted', 'selected', 'won'] },
  { key: 'closed', tone: 'red', items: ['lost', 'dropped'] },
]
export const STATUSES: Status[] = ['none', ...STATUS_GROUPS.flatMap(g => g.items)]
export const BOARD_STATUSES: Status[] = ['shortlist', 'go', 'contacted', 'team', 'preparing', 'ready', 'submitted', 'selected', 'won']
export const ACTIVE_STATUSES: Status[] = ['go', 'contacted', 'team', 'preparing', 'ready']
export function toneOf(s: Status): string { return STATUS_GROUPS.find(g => g.items.includes(s))?.tone || 'grey' }
export function isSaved(t?: Tracking): boolean { return !!t && (t.starred || (t.status !== 'none' && t.status !== 'dropped')) }
export function isHomeLink(u: string | null): boolean {
  if (!u) return true
  const rest = u.replace(/^https?:\/\/[^/]+/, '')
  return !(rest.includes('?') || rest.replace(/^\/|\/$/g, '').length > 12)
}
export const CONTACT_STATUSES: ContactStatus[] = ['todo', 'contacted', 'interested', 'confirmed', 'declined']
export const CHECKLIST = ['dc1', 'dc2', 'refs', 'insurance', 'order', 'capacity', 'partners', 'mandate', 'upload']
export const DISCIPLINES = [
  'structure', 'fluides', 'electricite', 'vrd', 'economie', 'acoustique', 'environnement',
  'paysage', 'opc', 'ssi', 'process', 'patrimoine', 'architecte_local', 'entreprise_generale',
]

// ───────────────────────────── Formatting ─────────────────────────────

export function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null
  const d = new Date(deadline + 'T00:00:00')
  const t = new Date(); t.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - t.getTime()) / 86400000)
}

export function money(v: number | null | undefined): string {
  if (v == null || !isFinite(v) || v <= 0) return ''
  if (v >= 1e6) return (v / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: v >= 1e7 ? 0 : 1 }) + ' M€'
  if (v >= 1e3) return Math.round(v / 1e3).toLocaleString('fr-FR') + ' k€'
  return v + ' €'
}

export function shortDate(iso: string | null, lang: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'fr-FR', { day: 'numeric', month: 'short' })
}

export function longDate(iso: string | null, lang: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function isNew(t: Tender): boolean {
  if (!t.first_seen) return false
  const d = daysLeft(t.first_seen)
  return d != null && d >= -1
}

export function groupOf(t: Tender): 'core' | 'partner' | 'db' | 'no' {
  if (t.fit === 'NO' || t.verdict === 'NO') return 'no'
  if (t.contract_type === 'DESIGN_BUILD') return 'db'
  return t.fit === 'CORE' ? 'core' : 'partner'
}

export function titleOf(t: Tender, lang: string): string {
  const fr = (t.title || '').replace(/^France\s*[–-]\s*[^–-]{3,90}[–-]\s*/, '')
  return (lang === 'en' ? t.title_en : lang === 'es' ? t.title_es : null) || fr
}

export function summaryOf(t: Tender, lang: string): string {
  return (lang === 'en' ? t.summary_en : lang === 'es' ? t.summary_es : t.summary_fr) || t.summary_fr || t.summary_en || ''
}

export function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean)
  if (typeof v === 'string' && v.trim()) { try { const j = JSON.parse(v); if (Array.isArray(j)) return j.map(String) } catch { return [v] } }
  return []
}

// ───────────────────────────── Data ─────────────────────────────

export const DEMO = process.env.NEXT_PUBLIC_GBADW_DEMO === '1'

let _sb: SupabaseClient | null = null
export function sb(): SupabaseClient {
  if (!_sb) {
    _sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'anon',
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
  }
  return _sb
}

const ls = {
  get<T>(k: string, d: T): T { try { return JSON.parse(localStorage.getItem(k) || '') as T } catch { return d } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } },
}

export async function loadTenders(): Promise<Tender[]> {
  if (DEMO) return (await fetch('/gbadw_demo.json')).json()
  const { data, error } = await sb().from('gbadw_tenders').select('*').eq('is_live', true).limit(2000)
  if (error) throw new Error(error.message)
  return (data || []) as Tender[]
}

export async function loadTender(id: string): Promise<Tender | null> {
  if (DEMO) return (await loadTenders()).find(t => t.publication_number === id) || null
  const { data, error } = await sb().from('gbadw_tenders').select('*').eq('publication_number', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data as Tender | null
}

export async function loadTenderSet(ids: string[]): Promise<Tender[]> {
  if (!ids.length) return []
  if (DEMO) return (await loadTenders()).filter(t => ids.includes(t.publication_number))
  const { data } = await sb().from('gbadw_tenders').select('*').in('publication_number', ids)
  return (data || []) as Tender[]
}

export async function loadTracking(): Promise<Record<string, Tracking>> {
  let rows: Tracking[]
  if (DEMO) rows = Object.values(ls.get<Record<string, Tracking>>('gbadw-tracking', {}))
  else {
    const { data, error } = await sb().from('gbadw_tracking').select('*')
    if (error) throw new Error(error.message)
    rows = (data || []) as Tracking[]
  }
  return Object.fromEntries(rows.map(r => [r.publication_number, { ...r, checklist: r.checklist || {} }]))
}

export function emptyTracking(id: string): Tracking {
  return { publication_number: id, status: 'none', starred: false, owner: null, notes: null, checklist: {} }
}

export async function saveTracking(t: Tracking, by?: string | null): Promise<void> {
  if (DEMO) {
    const all = ls.get<Record<string, Tracking>>('gbadw-tracking', {})
    all[t.publication_number] = t; ls.set('gbadw-tracking', all); return
  }
  const { error } = await sb().from('gbadw_tracking').upsert({
    publication_number: t.publication_number, status: t.status, starred: t.starred, owner: t.owner,
    notes: t.notes, checklist: t.checklist, suggestions: t.suggestions ?? null, dossier: t.dossier ?? null, updated_by: by || null, updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}

export async function loadContacts(id?: string): Promise<Contact[]> {
  if (DEMO) { const all = ls.get<Contact[]>('gbadw-contacts', []); return id ? all.filter(c => c.publication_number === id) : all }
  let q = sb().from('gbadw_contacts').select('*').order('created_at')
  if (id) q = q.eq('publication_number', id)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data || []) as Contact[]
}

export async function addContact(c: Omit<Contact, 'id'>, by?: string | null): Promise<Contact> {
  if (DEMO) {
    const row = { ...c, id: Math.random().toString(36).slice(2) }
    ls.set('gbadw-contacts', [...ls.get<Contact[]>('gbadw-contacts', []), row]); return row
  }
  const { data, error } = await sb().from('gbadw_contacts').insert({ ...c, created_by: by || null }).select().single()
  if (error) throw new Error(error.message)
  return data as Contact
}

export async function updateContact(id: string, patch: Partial<Contact>): Promise<void> {
  if (DEMO) { ls.set('gbadw-contacts', ls.get<Contact[]>('gbadw-contacts', []).map(c => c.id === id ? { ...c, ...patch } : c)); return }
  const { error } = await sb().from('gbadw_contacts').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function removeContact(id: string): Promise<void> {
  if (DEMO) { ls.set('gbadw-contacts', ls.get<Contact[]>('gbadw-contacts', []).filter(c => c.id !== id)); return }
  const { error } = await sb().from('gbadw_contacts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function searchFirms(tender: Tender, disciplines: string[], place: string, lang: string): Promise<{ firms: Firm[]; note?: string }> {
  const code = localStorage.getItem('gbadw-code') || ''
  const res = await fetch('/api/agence/bet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agence-code': code },
    body: JSON.stringify({
      disciplines, place, lang,
      tender: {
        title: tender.title, buyer: tender.buyer_name, location: tender.location, departement: tender.departement,
        typology: tender.typology, budget: tender.budget_eur, program: tender.program,
      },
    }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`)
  return json
}

// ───────────────────────────── Documents ─────────────────────────────

const BUCKET = 'gbadw-docs'
export const MAX_FILE = 50 * 1024 * 1024
export const l3 = (v: L3 | null | undefined, lang: string): string => (v ? (v as Record<string, string>)[lang] || v.fr || v.en || '' : '')
export const worksOf = (t: Tender, k?: Tracking) => k?.dossier?.works_eur || t.budget_eur
export const prizeOf = (t: Tender, k?: Tracking) => k?.dossier?.prize_eur || t.prize_eur
export const teamsOf = (t: Tender, k?: Tracking) => k?.dossier?.teams || t.teams_shortlisted

export function docUrl(d: Doc): string {
  if (DEMO) return '#'
  // Les pièces livrées avec le site (dossier public/dossiers) ont un chemin qui commence par « / ».
  if (d.path.startsWith('/')) return (typeof window !== 'undefined' ? window.location.origin : '') + encodeURI(d.path)
  return sb().storage.from(BUCKET).getPublicUrl(d.path).data.publicUrl
}

export async function loadDocs(id: string): Promise<Doc[]> {
  if (DEMO) return ls.get<Doc[]>('gbadw-docs', []).filter(d => d.publication_number === id)
  const { data, error } = await sb().from('gbadw_docs').select('*').eq('publication_number', id).order('name')
  if (error) throw new Error(error.message)
  return (data || []) as Doc[]
}

export async function addDoc(id: string, name: string, blob: Blob, by?: string | null): Promise<Doc> {
  const safe = name.normalize('NFD').replace(/[^\w.\- ]+/g, '').replace(/\s+/g, '_').slice(-110) || 'document'
  const path = `${id.replace(/[^\w-]/g, '_')}/${Date.now().toString(36)}_${safe}`
  if (DEMO) {
    const row = { id: Math.random().toString(36).slice(2), publication_number: id, name, path, size: blob.size, created_by: by }
    ls.set('gbadw-docs', [...ls.get<Doc[]>('gbadw-docs', []), row]); return row
  }
  const type = /\.pdf$/i.test(name) ? 'application/pdf' : blob.type || 'application/octet-stream'
  const up = await sb().storage.from(BUCKET).upload(path, blob, { contentType: type, upsert: false })
  if (up.error) throw new Error(`${name} : ${up.error.message}`)
  const { data, error } = await sb().from('gbadw_docs').insert({ publication_number: id, name, path, size: blob.size, created_by: by || null }).select().single()
  if (error) throw new Error(error.message)
  return data as Doc
}

export async function removeDoc(d: Doc): Promise<void> {
  if (DEMO) { ls.set('gbadw-docs', ls.get<Doc[]>('gbadw-docs', []).filter(x => x.id !== d.id)); return }
  if (!d.path.startsWith('/')) await sb().storage.from(BUCKET).remove([d.path])
  const { error } = await sb().from('gbadw_docs').delete().eq('id', d.id)
  if (error) throw new Error(error.message)
}

/** Les pièces à faire lire en priorité : règlement, programme, avis. Les plans et pièces de marché passent après. */
export function docsToRead(docs: Doc[]): Doc[] {
  const score = (n: string) => {
    const s = n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (/reglement|(^|[^a-z])r[._ -]?c([^a-z]|$)|rdc/.test(s)) return 100
    if (/programme|note.*synth|synthese/.test(s)) return 80
    if (/avis|aapc|annonce/.test(s)) return 60
    if (/ccap|cctp|acte|dpgf|plan|annexe|dc[124]|dume|cadre/.test(s)) return 5
    return 20
  }
  return docs.filter(d => /\.pdf$/i.test(d.name) && d.size < 20 * 1024 * 1024)
    .sort((a, b) => score(b.name) - score(a.name) || a.size - b.size).slice(0, 4)
}

export async function analyseDocs(t: Tender, docs: Doc[]): Promise<Dossier> {
  const res = await fetch('/api/agence/docs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agence-code': localStorage.getItem('gbadw-code') || '' },
    body: JSON.stringify({ title: t.title, buyer: t.buyer_name, files: docs.map(d => ({ name: d.name, url: docUrl(d) })) }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`)
  return json.dossier as Dossier
}

// ───────────────────────────── Profil de l'agence et remplissage ─────────────────────────────

export type Profile = Record<string, string>
export const PROFILE_FIELDS: [string, string[]][] = [
  ['identity', ['legal_name', 'trade_name', 'legal_form', 'capital', 'address', 'postal_code', 'city', 'country', 'tax_id', 'vat_id', 'registration', 'founded']],
  ['signatory', ['rep_name', 'rep_title', 'rep_email', 'rep_phone']],
  ['contact', ['contact_name', 'contact_email', 'contact_phone', 'website']],
  ['capacity', ['turnover_y1', 'turnover_y2', 'turnover_y3', 'staff_y1', 'staff_y2', 'staff_y3', 'architects_count']],
  ['insurance', ['insurer', 'policy_number', 'insured_amount', 'insurance_valid_until']],
  ['other', ['architect_register', 'bank_iban', 'notes']],
]

export async function loadProfile(): Promise<Profile> {
  if (DEMO) return ls.get<Profile>('gbadw-profile', {})
  const { data, error } = await sb().from('gbadw_profile').select('data').eq('id', 'agency').maybeSingle()
  if (error) throw new Error(error.message)
  return (data?.data || {}) as Profile
}

export async function saveProfile(p: Profile, by?: string | null): Promise<void> {
  if (DEMO) { ls.set('gbadw-profile', p); return }
  const { error } = await sb().from('gbadw_profile').upsert({ id: 'agency', data: p, updated_by: by || null, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

export async function fillDoc(t: Tender, d: Doc, k: Tracking | undefined, contacts: Contact[], user: string | null): Promise<{ doc: Doc; blob: Blob; filled: number; missing: string[] }> {
  const profile = await loadProfile()
  const dz = k?.dossier
  const data = {
    agence: profile,
    consultation: {
      objet: t.title, acheteur: t.buyer_name, lieu: t.location, reference: t.publication_number,
      date_limite: dz?.deadline || t.deadline, heure_limite: dz?.deadline_time || null,
      procedure: t.procedure_type, montant_travaux_eur: dz?.works_eur || t.budget_eur,
    },
    groupement: {
      mandataire: profile.legal_name || 'GIL BARTOLOME ADW',
      cotraitants: contacts.filter(c => c.status === 'confirmed' || c.status === 'interested').map(c => ({ societe: c.company, competence: c.discipline, ville: c.city, telephone: c.phone, email: c.email })),
    },
    date_du_jour: new Date().toLocaleDateString('fr-FR'),
    rempli_par: user,
  }
  const res = await fetch('/api/agence/fill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agence-code': localStorage.getItem('gbadw-code') || '' },
    body: JSON.stringify({ url: docUrl(d), name: d.name, data }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `Erreur ${res.status}`)
  const bytes = Uint8Array.from(atob(json.file), c => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
  const doc = await addDoc(t.publication_number, json.name, blob, user)
  return { doc, blob, filled: json.filled, missing: json.missing || [] }
}

// ───────────────────────────── Exports ─────────────────────────────

export function downloadBlob(name: string, blob: Blob) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob); a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export function downloadFile(name: string, content: string, type: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type }))
  a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return '﻿' + rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n')
}

export function icsFor(t: Tender): string {
  const d = (t.deadline || '').replace(/-/g, '')
  const esc = (s: string) => s.replace(/[,;\\]/g, m => '\\' + m).replace(/\n/g, '\\n')
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kribbl//GBADW//FR', 'BEGIN:VEVENT',
    `UID:${t.publication_number}@kribbl`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${esc('Deadline: ' + (t.title || ''))}`,
    `DESCRIPTION:${esc((t.buyer_name || '') + '\n' + (t.url || ''))}`,
    'BEGIN:VALARM', 'TRIGGER:-P3D', 'ACTION:DISPLAY', 'DESCRIPTION:Deadline', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
}
