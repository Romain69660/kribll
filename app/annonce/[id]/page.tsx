import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import ShareButton from './ShareButtons'
import HeaderAuth from '../../components/HeaderAuth'

const hl = "'Outfit', 'Inter', sans-serif"

const CATEGORY_LABELS: Record<string, string> = {
  ARCHITECTURE_BUILDING: 'Architecture',
  ARCHITECTURE_GENERAL:  'Architecture',
  URBANISM_LANDSCAPE:    'Urbanisme / Paysage',
  COMPETITIONS:          'Concours',
  AMO_PROGRAMMING:       'AMO',
  ENGINEERING:           'Ingénierie',
  SURVEY_TOPO:           'Topographie',
}

function categoryLabel(cat?: string) {
  if (!cat) return null
  return CATEGORY_LABELS[cat] ?? cat
}

function formatDate(d?: string) {
  if (!d) return null
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatRevenue(v?: number | null) {
  if (!v) return null
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.0', '')}M€`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k€`
  return `${v}€`
}

function verdictPill(v?: string) {
  const up = v?.toUpperCase()
  if (up === 'GO')    return { background: 'hsl(145,60%,94%)', color: 'hsl(145,70%,38%)', label: 'GO' }
  if (up === 'MAYBE') return { background: 'hsl(48,90%,93%)',  color: 'hsl(40,80%,42%)',  label: 'À étudier' }
  if (up === 'NO')    return { background: 'hsl(0,80%,95%)',   color: 'hsl(0,70%,45%)',   label: 'Non pertinent' }
  return { background: 'hsl(220,8%,95%)', color: 'hsl(220,8%,52%)', label: up ?? '—' }
}

function ScoreGauge({ score, size = 56 }: { score: number; size?: number }) {
  const s   = Math.min(Math.round(score), 100)
  const r   = (size - 6) / 2
  const c   = 2 * Math.PI * r
  const off = c - (s / 100) * c
  const col = s >= 80 ? 'hsl(145,70%,42%)' : s >= 50 ? 'hsl(25,95%,52%)' : 'hsl(220,8%,70%)'
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="hsl(220,8%,91%)" strokeWidth={2.5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={3}
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" />
      </svg>
      <span style={{ position: 'absolute', fontSize: '0.75rem', fontWeight: 700, color: 'hsl(220,20%,12%)' }}>
        {s}
      </span>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: '0.68rem', fontWeight: 500, color: 'hsl(220,8%,52%)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <span style={{ fontSize: '0.88rem', color: 'hsl(220,20%,12%)', fontWeight: 400 }}>
        {value}
      </span>
    </div>
  )
}

export default async function AnnoncePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data: tender, error } = await supabase
    .from('tenders')
    .select('*')
    .eq('id', id)
    .single()

  if (!tender || error) notFound()

  const vp      = verdictPill(tender.verdict)
  const revenue = formatRevenue(tender.minimum_revenue_required)

  return (
    <div style={{ minHeight: '100vh', background: 'white', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, paddingTop: 16 }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 2rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', height: 44, padding: '0 20px',
            background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(20px)',
            border: '1px solid hsl(220,8%,91%)', borderRadius: 999,
            boxShadow: '0 1px 3px hsl(220,20%,12%,0.04)',
          }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginRight: 28 }}>
              <Image src="/logokribbl.png" alt="Kribbl" width={24} height={24} />
              <span style={{ fontFamily: hl, fontWeight: 700, fontSize: '0.98rem', color: 'hsl(220,20%,12%)', letterSpacing: '-0.02em' }}>
                kribbl
              </span>
            </Link>
            <Link href="/" style={{ fontSize: '0.82rem', color: 'hsl(220,8%,52%)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              ← Retour aux opportunités
            </Link>
            <div style={{ marginLeft: 'auto' }}>
              <HeaderAuth />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ paddingTop: 100, paddingBottom: 64 }}>
        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 2rem' }}>

          {/* Top row — source, verdict, score */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {tender.source && (
                <span style={{ fontSize: '0.72rem', fontWeight: 500, padding: '4px 12px', borderRadius: 999, background: 'hsl(220,85%,96%)', color: 'hsl(220,90%,56%)' }}>
                  {tender.source}
                </span>
              )}
              {tender.category && (
                <span style={{ fontSize: '0.72rem', fontWeight: 400, padding: '4px 12px', borderRadius: 999, border: '1px solid hsl(220,8%,91%)', color: 'hsl(220,8%,52%)' }}>
                  {categoryLabel(tender.category) ?? tender.category}
                </span>
              )}
              {tender.verdict && (
                <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '4px 12px', borderRadius: 999, background: vp.background, color: vp.color }}>
                  {vp.label}
                </span>
              )}
            </div>
            {typeof tender.final_score === 'number' && <ScoreGauge score={tender.final_score} size={56} />}
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: hl, fontWeight: 700, fontSize: 'clamp(1.4rem, 3vw, 2rem)',
            lineHeight: 1.15, letterSpacing: '-0.025em', color: 'hsl(220,20%,12%)',
            margin: '0 0 16px',
          }}>
            {tender.title}
          </h1>

          {/* Meta — buyer, location, date */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 32, color: 'hsl(220,8%,52%)', fontSize: '0.85rem' }}>
            {tender.buyer_name && <span>🏛 {tender.buyer_name}</span>}
            {(tender.location || tender.country) && <span>📍 {tender.location || tender.country}</span>}
            {tender.publication_date && <span>📅 {formatDate(tender.publication_date)}</span>}
          </div>

          {/* Summary */}
          {tender.summary && (
            <section style={{ marginBottom: 28 }}>
              <h2 style={{ fontFamily: hl, fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(220,8%,52%)', margin: '0 0 12px' }}>
                Résumé
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'hsl(220,20%,18%)', lineHeight: 1.75, margin: 0 }}>
                {tender.summary}
              </p>
            </section>
          )}

          {/* Why it matters */}
          {tender.why_it_matters && (
            <section style={{ marginBottom: 28 }}>
              <div style={{
                background: 'hsl(220,85%,97%)', border: '1px solid hsl(220,85%,90%)',
                borderRadius: 16, padding: '18px 20px',
              }}>
                <p style={{ fontSize: '0.88rem', fontWeight: 500, color: 'hsl(220,20%,12%)', lineHeight: 1.65, margin: '0 0 4px' }}>
                  Pourquoi cette annonce ?
                </p>
                <p style={{ fontSize: '0.88rem', color: 'hsl(220,40%,38%)', lineHeight: 1.65, margin: 0 }}>
                  {tender.why_it_matters}
                </p>
              </div>
            </section>
          )}

          {/* Details grid */}
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: hl, fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(220,8%,52%)', margin: '0 0 16px' }}>
              Détails
            </h2>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 16, padding: '20px', background: 'hsl(220,8%,98%)', borderRadius: 16,
            }}>
              {categoryLabel(tender.category) && (
                <DetailRow label="Catégorie" value={categoryLabel(tender.category)!} />
              )}
              {tender.main_discipline && (
                <DetailRow label="Discipline" value={categoryLabel(tender.main_discipline) ?? tender.main_discipline} />
              )}
              {tender.procedure_type && (
                <DetailRow label="Procédure" value={tender.procedure_type} />
              )}
              {tender.estimated_scale && (
                <DetailRow label="Envergure" value={tender.estimated_scale} />
              )}
              {revenue && (
                <DetailRow label="CA minimum" value={revenue} />
              )}
              {tender.required_references_count != null && tender.required_references_count > 0 && (
                <DetailRow label="Références requises" value={`${tender.required_references_count} référence${tender.required_references_count > 1 ? 's' : ''}`} />
              )}
              {tender.required_references && (
                <DetailRow label="Type de références" value={tender.required_references} />
              )}
              {tender.architect_mandatory != null && (
                <DetailRow label="Architecte obligatoire" value={tender.architect_mandatory ? 'Oui' : 'Non'} />
              )}
              {tender.consortium_required != null && (
                <DetailRow label="Groupement requis" value={tender.consortium_required ? 'Oui' : 'Non'} />
              )}
              {tender.publication_number && (
                <DetailRow label="Référence" value={tender.publication_number} />
              )}
            </div>
          </section>

          {/* CTA */}
          {tender.url && (
            <section style={{ marginBottom: 40 }}>
              <a
                href={tender.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  fontSize: '0.95rem', fontWeight: 500, padding: '14px 28px',
                  borderRadius: 999, background: 'hsl(220,20%,12%)', color: 'white',
                  textDecoration: 'none', boxShadow: '0 2px 8px hsl(220,20%,12%,0.15)',
                }}
              >
                Voir l&apos;annonce officielle →
              </a>
            </section>
          )}

          {/* Share */}
          <section>
            <h2 style={{ fontFamily: hl, fontWeight: 600, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'hsl(220,8%,52%)', margin: '0 0 14px' }}>
              Partager cette opportunité
            </h2>
            <ShareButton id={tender.id} title={tender.title} summary={tender.summary} />
          </section>

        </div>
      </main>
    </div>
  )
}
