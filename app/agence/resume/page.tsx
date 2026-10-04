'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  TYPOLOGIES, groupOf, loadTenders, loadTracking, money, shortDate, summaryOf, type Tender, type Tracking,
} from '../../../lib/agence/core'
import { useAgence } from '../Shell'

export default function ResumePage() {
  const { t, lang } = useAgence()
  const [tenders, setTenders] = useState<Tender[] | null>(null)
  const [tracking, setTracking] = useState<Record<string, Tracking>>({})
  const [month, setMonth] = useState(() => new Date().toLocaleDateString('sv-SE').slice(0, 7))
  const [scope, setScope] = useState('all')
  const [error, setError] = useState('')

  useEffect(() => {
    loadTenders().then(setTenders).catch(e => { setError(e.message); setTenders([]) })
    loadTracking().then(setTracking).catch(() => {})
  }, [])

  const today = new Date().toLocaleDateString('sv-SE')
  const rows = useMemo(() => (tenders || []).filter(x => {
    if (!x.deadline || x.deadline.slice(0, 7) !== month || x.deadline < today) return false
    const g = groupOf(x)
    if (g === 'no' || g === 'db') return false
    if (scope === 'core') return g === 'core'
    if (scope === 'track') { const s = tracking[x.publication_number]?.status; return !!s && s !== 'none' && s !== 'dropped' && s !== 'lost' }
    return true
  }).sort((a, b) => (a.deadline || '').localeCompare(b.deadline || '')), [tenders, tracking, month, scope, today])

  const monthName = new Date(month + '-01T00:00:00').toLocaleDateString(lang === 'en' ? 'en-GB' : lang === 'es' ? 'es-ES' : 'fr-FR', { month: 'long', year: 'numeric' })
  const total = rows.reduce((s, x) => s + (x.budget_eur || 0), 0)
  const months = useMemo(() => [...new Set((tenders || []).map(x => (x.deadline || '').slice(0, 7)).filter(m => m >= today.slice(0, 7)))].sort(), [tenders, today])

  if (!tenders) return <p className="ag-wait">{t('loading')}</p>

  return (
    <div className="ag-page ag-resume">
      <div className="ag-bar noprint">
        <select value={month} onChange={e => setMonth(e.target.value)}>{months.map(m => <option key={m} value={m}>{m}</option>)}</select>
        <label>{t('resume_scope')}
          <select value={scope} onChange={e => setScope(e.target.value)}>
            <option value="all">{t('rs_all')}</option><option value="core">{t('rs_core')}</option><option value="track">{t('rs_track')}</option>
          </select>
        </label>
        <button className="ag-btn ag-primary" onClick={() => window.print()}>{t('print')}</button>
      </div>
      {error && <p className="ag-err">{error}</p>}
      <div className="ag-head">
        <h1>{t('h_resume')} {monthName}</h1>
        <p className="ag-muted">GIL BARTOLOMÉ ADW. {t('resume_total', { n: rows.length, v: money(total) || '0 €' })}</p>
      </div>
      {rows.length === 0 && <p className="ag-empty">{t('empty')}</p>}
      {TYPOLOGIES.map(ty => {
        const list = rows.filter(x => (x.typology || 'OTHER') === ty)
        if (!list.length) return null
        return (
          <section key={ty}>
            <h2>{t('ty_' + ty)} <span className="ag-muted">{list.length}</span></h2>
            <table className="ag-table flat">
              <thead><tr><th>{t('c_deadline')}</th><th>{t('c_project')}</th><th>{t('c_place')}</th><th className="num">{t('c_works')}</th><th>{t('c_contract')}</th><th>{t('c_rating')}</th></tr></thead>
              <tbody>{list.map(x => (
                <tr key={x.publication_number}>
                  <td className="c-dl"><b>{shortDate(x.deadline, lang)}</b></td>
                  <td className="c-pj"><a href={x.url || '#'} target="_blank" rel="noreferrer">{x.title}</a><span className="sub">{x.buyer_name}</span><p>{summaryOf(x, lang)}</p></td>
                  <td className="c-pl">{x.location || x.departement}</td>
                  <td className="num">{money(x.budget_eur)}</td>
                  <td>{x.procedure_type}</td>
                  <td>{t('v_' + (x.verdict || 'ERROR'))}</td>
                </tr>
              ))}</tbody>
            </table>
          </section>
        )
      })}
    </div>
  )
}
