'use client'

import { daysLeft, STATUSES, type Status, type Tender } from '../../lib/agence/core'
import { useAgence } from './Shell'

export function Days({ deadline }: { deadline: string | null }) {
  const { t } = useAgence()
  const d = daysLeft(deadline)
  if (d == null) return null
  const cls = d < 0 ? 'past' : d <= 7 ? 'hot' : d <= 14 ? 'warm' : ''
  return <span className={`ag-days ${cls}`}>{d < 0 ? t('d_past') : d === 0 ? t('d_today') : t('days', { n: d })}</span>
}

export function Verdict({ t: tender }: { t: Tender }) {
  const { t } = useAgence()
  const v = tender.verdict || 'ERROR'
  return <span className={`ag-tag v-${v}`}>{t('v_' + v)}</span>
}

export function Contract({ t: tender }: { t: Tender }) {
  const { t } = useAgence()
  if (tender.contract_type === 'DESIGN_BUILD') return <span className="ag-tag db">{t('ct_DESIGN_BUILD')}</span>
  return <span className="ag-proc">{tender.procedure_type || t('ct_' + (tender.contract_type || 'OTHER'))}</span>
}

export function StatusSelect({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  const { t } = useAgence()
  return (
    <select className={`ag-status s-${value}`} value={value} aria-label={t('c_status')}
      onClick={e => e.stopPropagation()} onChange={e => onChange(e.target.value as Status)}>
      {STATUSES.map(s => <option key={s} value={s}>{t('st_' + s)}</option>)}
    </select>
  )
}

export function Star({ on, onClick }: { on: boolean; onClick: () => void }) {
  const { t } = useAgence()
  return (
    <button className={`ag-star ${on ? 'on' : ''}`} aria-pressed={on} title={on ? t('unstar') : t('star')}
      onClick={e => { e.stopPropagation(); e.preventDefault(); onClick() }}>
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M10 1.8l2.5 5.3 5.7.7-4.2 4 1.1 5.7L10 14.7l-5.1 2.8L6 11.8l-4.2-4 5.7-.7z" /></svg>
    </button>
  )
}
