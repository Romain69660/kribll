'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Calendar, Building2, Users, TrendingUp, Heart, Share2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

// ─── Type ─────────────────────────────────────────────────────────────────────

export type Tender = {
  id: number
  title: string
  buyer_name: string
  final_score: number
  url: string
  source?: string
  country?: string
  publication_date?: string
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
  required_references_count?: number | null
  minimum_revenue_required?: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  ARCHITECTURE_BUILDING: 'Architecture',
  ARCHITECTURE_GENERAL:  'Architecture',
  URBANISM_LANDSCAPE:    'Urbanisme / Paysage',
  COMPETITIONS:          'Concours',
  AMO_PROGRAMMING:       'AMO',
  ENGINEERING:           'Ingénierie',
  SURVEY_TOPO:           'Topographie',
}

const COUNTRY_CODE: Record<string, string> = {
  'belgium':     'be', 'be': 'be',
  'switzerland': 'ch', 'ch': 'ch',
  'germany':     'de', 'de': 'de',
  'italy':       'it', 'it': 'it',
  'spain':       'es', 'es': 'es',
  'netherlands': 'nl', 'nl': 'nl',
  'ireland':     'ie', 'ie': 'ie',
  'portugal':    'pt', 'pt': 'pt',
  'luxembourg':  'lu', 'lu': 'lu',
  'austria':     'at', 'at': 'at',
  'sweden':      'se', 'se': 'se',
  'denmark':     'dk', 'dk': 'dk',
  'norway':      'no', 'no': 'no',
  'finland':     'fi', 'fi': 'fi',
  'poland':      'pl', 'pl': 'pl',
  'greece':      'gr', 'gr': 'gr',
}

export function categoryLabel(cat?: string) {
  if (!cat) return null
  return CATEGORY_LABELS[cat] ?? cat
}

function formatDate(d?: string) {
  if (!d) return null
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}

function formatRevenue(v?: number | null) {
  if (!v) return null
  if (v >= 1_000_000) return `CA minimum : ${(v / 1_000_000).toFixed(1).replace('.0', '')}M€`
  if (v >= 1_000) return `CA minimum : ${Math.round(v / 1_000)}k€`
  return `CA minimum : ${v}€`
}

export function verdictPill(v?: string) {
  const up = v?.toUpperCase()
  if (up === 'GO')    return { background: 'hsl(145,60%,94%)', color: 'hsl(145,70%,38%)', label: 'GO' }
  if (up === 'MAYBE') return { background: 'hsl(48,90%,93%)',  color: 'hsl(40,80%,42%)',  label: 'À étudier' }
  if (up === 'NO')    return { background: 'hsl(0,80%,95%)',   color: 'hsl(0,70%,45%)',   label: 'Non pertinent' }
  return { background: 'hsl(220,8%,95%)', color: 'hsl(220,8%,52%)', label: up ?? '—' }
}

// ─── ScoreGauge ───────────────────────────────────────────────────────────────

export function ScoreGauge({ score, size = 40 }: { score: number; size?: number }) {
  const s   = Math.min(Math.round(score), 100)
  const r   = (size - 6) / 2
  const c   = 2 * Math.PI * r
  const off = c - (s / 100) * c
  const col = s >= 80 ? 'hsl(145,70%,42%)' : s >= 50 ? 'hsl(25,95%,52%)' : 'hsl(220,8%,70%)'
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(220,8%,91%)" strokeWidth={2} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={2.5}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <span style={{ position: 'absolute', fontSize: '0.62rem', fontWeight: 600, color: 'hsl(220,20%,12%)', fontVariantNumeric: 'tabular-nums' }}>
        {s}
      </span>
    </div>
  )
}

// ─── MetaPill ─────────────────────────────────────────────────────────────────

function MetaPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: '0.62rem', fontWeight: 400, padding: '4px 10px', borderRadius: 999,
      background: 'transparent', color: 'hsl(220,8%,52%)', border: '1px solid hsl(220,8%,91%)',
      whiteSpace: 'nowrap',
    }}>
      {icon}{label}
    </span>
  )
}

// ─── FlagImg ──────────────────────────────────────────────────────────────────

function FlagImg({ country }: { country?: string }) {
  const code = country ? (COUNTRY_CODE[country.toLowerCase()] ?? null) : null
  if (!code) return null
  return (
    <img
      src={`https://flagcdn.com/24x18/${code}.png`}
      alt={country}
      style={{ width: 20, height: 14, borderRadius: 2, objectFit: 'cover', display: 'inline-block' }}
    />
  )
}

// ─── OpportunityCard ──────────────────────────────────────────────────────────

export default function OpportunityCard({ tender, showFlag }: { tender: Tender; showFlag?: boolean }) {
  const router = useRouter()
  const [userId,     setUserId]     = useState<string | null>(null)
  const [isFavorite, setIsFavorite] = useState(false)
  const [copied,     setCopied]     = useState(false)

  // Récupère la session et le statut favori au montage
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const uid = data.session.user.id
      setUserId(uid)

      const { data: fav } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', uid)
        .eq('tender_id', tender.id)
        .maybeSingle()
      setIsFavorite(!!fav)
    })
  }, [tender.id])

  async function handleFavorite(e: React.MouseEvent) {
    e.stopPropagation()

    console.log('user:', userId)
    console.log('tender_id:', tender.id)

    if (!userId) {
      router.push('/login')
      return
    }

    if (isFavorite) {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('tender_id', tender.id)
      console.log('supabase error:', error)
      if (!error) setIsFavorite(false)
    } else {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, tender_id: tender.id })
      console.log('supabase error:', error)
      if (!error) setIsFavorite(true)
    }
  }

  async function handleShare(e: React.MouseEvent) {
    e.stopPropagation()
    const pageUrl  = `https://kribbl.app/annonce/${tender.id}`
    const loc      = tender.location || tender.country || ''
    const sumShort = tender.summary ? tender.summary.slice(0, 200) + (tender.summary.length > 200 ? '…' : '') : ''
    const text     = `${tender.title}\n${loc}\nScore Leman : ${tender.final_score}/100\n\n${sumShort}`
    if (navigator.share) {
      await navigator.share({ title: tender.title, text, url: pageUrl })
    } else {
      await navigator.clipboard.writeText(pageUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const vp       = verdictPill(tender.verdict)
  const catLabel = categoryLabel(tender.category)
  const revenue  = formatRevenue(tender.minimum_revenue_required)

  return (
    <article
      onClick={() => router.push(`/annonce/${tender.id}`)}
      style={{
        background: 'white',
        border: '1px solid hsl(220,8%,91%)',
        borderRadius: 20,
        padding: '1.35rem 1.35rem 1.2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        boxShadow: '0 1px 3px hsl(220,20%,12%,0.04)',
        transition: 'box-shadow .3s ease, transform .3s ease',
        cursor: 'pointer',
        position: 'relative',
      }}>

      {/* Source + category + heart + score */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {tender.source && (
            <span style={{
              fontSize: '0.62rem', fontWeight: 500, padding: '3px 10px', borderRadius: 999,
              background: 'hsl(220,85%,96%)', color: 'hsl(220,90%,56%)',
            }}>{tender.source}</span>
          )}
          {catLabel && (
            <span style={{
              fontSize: '0.62rem', fontWeight: 400, padding: '3px 10px', borderRadius: 999,
              background: 'transparent', color: 'hsl(220,8%,52%)',
              border: '1px solid hsl(220,8%,91%)',
            }}>{catLabel}</span>
          )}
          {showFlag && <FlagImg country={tender.country} />}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={handleFavorite}
            title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 999,
              border: '1px solid hsl(220,8%,91%)', background: 'white',
              cursor: 'pointer', color: isFavorite ? 'hsl(0,70%,55%)' : 'hsl(220,8%,72%)',
              transition: 'color .2s, border-color .2s',
            }}
          >
            <Heart style={{ width: 13, height: 13 }} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={1.8} />
          </button>
          {typeof tender.final_score === 'number' && <ScoreGauge score={tender.final_score} size={40} />}
        </div>
      </div>

      {/* Verdict */}
      {tender.verdict && (
        <div>
          <span style={{
            fontSize: '0.68rem', fontWeight: 600, padding: '4px 12px', borderRadius: 999,
            background: vp.background, color: vp.color,
          }}>{vp.label}</span>
        </div>
      )}

      {/* Title */}
      <h3 style={{ fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.35, color: 'hsl(220,20%,12%)', margin: 0 }}>
        {tender.title}
      </h3>

      {/* Summary */}
      {tender.summary && (
        <p style={{ fontSize: '0.78rem', color: 'hsl(220,8%,52%)', lineHeight: 1.6, margin: 0, fontWeight: 400 }}>
          {tender.summary.trim()}
        </p>
      )}

      {/* Why it matters */}
      {tender.why_it_matters && (
        <p style={{ fontSize: '0.78rem', color: 'hsl(220,8%,45%)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
          {tender.why_it_matters}
        </p>
      )}

      {/* Meta pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
        {(tender.location || tender.country) && (
          <MetaPill icon={<MapPin style={{ width: 10, height: 10 }} />} label={tender.location || tender.country!} />
        )}
        {tender.publication_date && (
          <MetaPill icon={<Calendar style={{ width: 10, height: 10 }} />} label={formatDate(tender.publication_date)!} />
        )}
        {tender.main_discipline && (
          <MetaPill icon={<Building2 style={{ width: 10, height: 10 }} />} label={categoryLabel(tender.main_discipline) ?? tender.main_discipline} />
        )}
        {tender.required_references_count != null && tender.required_references_count > 0 && (
          <MetaPill icon={<Users style={{ width: 10, height: 10 }} />} label={`Références requises : ${tender.required_references_count}`} />
        )}
        {revenue && (
          <MetaPill icon={<TrendingUp style={{ width: 10, height: 10 }} />} label={revenue} />
        )}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 4, paddingTop: 10, borderTop: '1px solid hsl(220,8%,91%)',
      }}>
        <a
          href={`/annonce/${tender.id}`}
          onClick={e => e.stopPropagation()}
          style={{ fontSize: '0.78rem', color: 'hsl(220,8%,52%)', textDecoration: 'none' }}
        >
          Voir le détail →
        </a>
        <button
          onClick={handleShare}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: '0.72rem', color: 'hsl(220,8%,52%)', cursor: 'pointer',
            background: 'white', border: '1px solid hsl(220,8%,91%)',
            borderRadius: 999, padding: '4px 12px',
          }}
        >
          <Share2 style={{ width: 11, height: 11 }} strokeWidth={1.5} />
          {copied ? 'Lien copié ✓' : 'Partager'}
        </button>
      </div>
    </article>
  )
}
