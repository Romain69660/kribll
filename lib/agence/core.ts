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
  updated_by?: string | null
  updated_at?: string | null
}

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
    notes: t.notes, checklist: t.checklist, suggestions: t.suggestions ?? null, updated_by: by || null, updated_at: new Date().toISOString(),
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

// ───────────────────────────── Exports ─────────────────────────────

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
