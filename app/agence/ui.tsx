'use client'

import { useEffect, useRef, useState } from 'react'
import { daysLeft, STATUS_GROUPS, toneOf, type Status, type Tender } from '../../lib/agence/core'
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

/* Statut façon Notion : une pastille, un clic ouvre la liste par groupe. */
export function StatusSelect({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  const { t } = useAgence()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', out); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc) }
  }, [open])
  const pick = (s: Status) => { onChange(s); setOpen(false) }
  return (
    <div className="ag-st" ref={ref} onClick={e => e.stopPropagation()}>
      <button className={`ag-pill tone-${toneOf(value)} ${value === 'none' ? 'empty' : ''}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <i />{t('st_' + value)}
      </button>
      {open && (
        <div className="ag-st-menu" role="listbox">
          {STATUS_GROUPS.map(g => (
            <div key={g.key}>
              <p>{t('sg_' + g.key)}</p>
              {g.items.map(s => (
                <button key={s} role="option" aria-selected={s === value} onClick={() => pick(s)}>
                  <span className={`ag-pill tone-${g.tone}`}><i />{t('st_' + s)}</span>
                </button>
              ))}
            </div>
          ))}
          {value !== 'none' && <button className="clear" onClick={() => pick('none')}>{t('st_clear')}</button>}
        </div>
      )}
    </div>
  )
}

export function Save({ on, onClick, label }: { on: boolean; onClick: () => void; label?: boolean }) {
  const { t } = useAgence()
  return (
    <button className={`ag-save ${on ? 'on' : ''} ${label ? 'lbl' : ''}`} aria-pressed={on} title={on ? t('saved_on') : t('save')}
      onClick={e => { e.stopPropagation(); e.preventDefault(); onClick() }}>
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M5 2.5h10v15l-5-3.6-5 3.6z" /></svg>
      {label && <span>{on ? t('saved_on') : t('save')}</span>}
    </button>
  )
}
