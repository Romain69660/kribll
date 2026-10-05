'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ACTIVE_STATUSES, TYPOLOGIES, isSaved, daysLeft, downloadFile, emptyTracking, groupOf, isNew, loadTenders, loadTracking,
  money, saveTracking, shortDate, summaryOf, toCsv, type Status, type Tender, type Tracking,
} from '../../lib/agence/core'
import { useAgence } from './Shell'
import { Contract, Days, Save, StatusSelect, Verdict } from './ui'

type Group = 'all' | 'saved' | 'core' | 'partner' | 'db' | 'no'
const HORIZON = 56

export default function ListPage() {
  const { t, lang, user } = useAgence()
  const router = useRouter()
  const [tenders, setTenders] = useState<Tender[] | null>(null)
  const [tracking, setTracking] = useState<Record<string, Tracking>>({})
  const [error, setError] = useState('')

  const [group, setGroup] = useState<Group>('all')
  const [q, setQ] = useState('')
  const [typ, setTyp] = useState('')
  const [win, setWin] = useState('')
  const [minB, setMinB] = useState('')
  const [dept, setDept] = useState('')
  const [verdict, setVerdict] = useState('')
  const [onlyNew, setOnlyNew] = useState(false)
  const [onlyComp, setOnlyComp] = useState(false)
  const [sort, setSort] = useState('deadline')

  useEffect(() => {
    Promise.all([loadTenders(), loadTracking().catch(() => ({}))])
      .then(([a, b]) => { setTenders(a); setTracking(b) })
      .catch(e => setError(e.message))
  }, [])

  const live = useMemo(() => (tenders || []).filter(x => { const d = daysLeft(x.deadline); return d == null || d >= 0 }), [tenders])

  const base = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const now = new Date()
    return live.filter(x => {
      const d = daysLeft(x.deadline)
      if (needle && ![x.title, x.buyer_name, x.location, x.departement, x.program, x.publication_number].join(' ').toLowerCase().includes(needle)) return false
      if (typ && x.typology !== typ) return false
      if (dept && !(x.departement || '').split(' | ').includes(dept)) return false
      if (verdict && x.verdict !== verdict) return false
      if (minB && !((x.budget_eur || 0) >= Number(minB))) return false
      if (win === 'month') { if (!x.deadline || new Date(x.deadline).getMonth() !== now.getMonth() || new Date(x.deadline).getFullYear() !== now.getFullYear()) return false }
      else if (win && !(d != null && d <= Number(win))) return false
      if (onlyNew && !isNew(x)) return false
      if (onlyComp && !/concours/i.test(x.procedure_type || '')) return false
      return true
    })
  }, [live, q, typ, dept, verdict, minB, win, onlyNew, onlyComp])

  const counts = useMemo(() => {
    const c = { all: 0, saved: 0, core: 0, partner: 0, db: 0, no: 0 }
    base.forEach(x => { const g = groupOf(x); c[g]++; if (g !== 'no') c.all++; if (isSaved(tracking[x.publication_number])) c.saved++ })
    return c
  }, [base, tracking])

  const rows = useMemo(() => {
    const r = base.filter(x => group === 'saved' ? isSaved(tracking[x.publication_number]) : group === 'all' ? groupOf(x) !== 'no' : groupOf(x) === group)
    const far = '9999-12-31'
    return r.sort((a, b) =>
      sort === 'budget' ? (b.budget_eur || 0) - (a.budget_eur || 0)
      : sort === 'score' ? (b.score || b.relevance_score || 0) - (a.score || a.relevance_score || 0)
      : sort === 'recent' ? (b.first_seen || '').localeCompare(a.first_seen || '')
      : (a.deadline || far).localeCompare(b.deadline || far))
  }, [base, group, sort, tracking])

  const kpi = useMemo(() => {
    const ok = live.filter(x => groupOf(x) !== 'no')
    const core = ok.filter(x => groupOf(x) === 'core')
    return {
      core: core.length, go: core.filter(x => x.verdict === 'GO').length,
      week: ok.filter(x => { const d = daysLeft(x.deadline); return d != null && d <= 7 }).length,
      fresh: ok.filter(isNew).length,
      active: Object.values(tracking).filter(x => ACTIVE_STATUSES.includes(x.status)).length,
    }
  }, [live, tracking])

  const depts = useMemo(() => [...new Set(live.flatMap(x => (x.departement || '').split(' | ')).filter(Boolean))].sort(), [live])
  const typs = useMemo(() => TYPOLOGIES.filter(k => live.some(x => x.typology === k)), [live])
  const updated = useMemo(() => live.reduce((m, x) => (x.last_seen || '') > m ? x.last_seen || '' : m, ''), [live])
  const total = rows.reduce((s, x) => s + (x.budget_eur || 0), 0)
  const filtered = q || typ || win || minB || dept || verdict || onlyNew || onlyComp

  function patch(id: string, p: Partial<Tracking>) {
    const next = { ...(tracking[id] || emptyTracking(id)), ...p, updated_by: user }
    setTracking(s => ({ ...s, [id]: next }))
    saveTracking(next, user).catch(e => setError(e.message))
  }
  function reset() { setQ(''); setTyp(''); setWin(''); setMinB(''); setDept(''); setVerdict(''); setOnlyNew(false); setOnlyComp(false) }
  function exportCsv() {
    const head = ['deadline', 'days', 'group', 'typology', 'title', 'client', 'location', 'dept', 'works_eur', 'prize_eur', 'teams', 'procedure', 'contract', 'rating', 'status', 'summary', 'url']
    const body = rows.map(x => [x.deadline, daysLeft(x.deadline), groupOf(x), t('ty_' + (x.typology || 'OTHER')), x.title, x.buyer_name, x.location, x.departement,
      x.budget_eur, x.prize_eur, x.teams_shortlisted, x.procedure_type, t('ct_' + (x.contract_type || 'OTHER')), x.verdict,
      t('st_' + (tracking[x.publication_number]?.status || 'none')), summaryOf(x, lang), x.url])
    downloadFile(`gbadw_${new Date().toISOString().slice(0, 10)}.csv`, toCsv([head, ...body]), 'text/csv;charset=utf-8')
  }

  if (error && !tenders) return <div className="ag-page"><p className="ag-err">{error}</p><p className="ag-muted">{t('no_access')}</p></div>
  if (!tenders) return <p className="ag-wait">{t('loading')}</p>

  return (
    <div className="ag-page">
      <div className="ag-head">
        <h1>{t('h_list')}</h1>
        {updated && <p className="ag-muted">{t('updated')} {shortDate(updated, lang)}</p>}
      </div>
      {error && <p className="ag-err">{error}</p>}

      <dl className="ag-kpis">
        <div><dt>{t('k_core')}</dt><dd>{kpi.core}</dd><small>{t('k_core_s', { n: kpi.go })}</small></div>
        <div><dt>{t('k_week')}</dt><dd className={kpi.week ? 'hot' : ''}>{kpi.week}</dd></div>
        <div><dt>{t('k_new')}</dt><dd>{kpi.fresh}</dd><small>{t('k_new_s')}</small></div>
        <div><dt>{t('k_active')}</dt><dd>{kpi.active}</dd></div>
        <div><dt>{t('k_value')}</dt><dd>{money(total) || '0'}</dd></div>
      </dl>

      <Ruler rows={rows} label={t('ruler')} today={t('today')} lang={lang} />

      <div className="ag-tabs" role="tablist">
        {(['all', 'saved', 'core', 'partner', 'db', 'no'] as Group[]).map(g => (
          <button key={g} role="tab" aria-selected={group === g} className={`g-${g}`} onClick={() => setGroup(g)}>
            {t('g_' + g)} <span>{counts[g]}</span>
          </button>
        ))}
      </div>

      <div className="ag-filters">
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} />
        <select value={typ} onChange={e => setTyp(e.target.value)} aria-label={t('f_typology')}>
          <option value="">{t('f_all_typ')}</option>
          {typs.map(k => <option key={k} value={k}>{t('ty_' + k)}</option>)}
        </select>
        <select value={win} onChange={e => setWin(e.target.value)} aria-label={t('f_deadline')}>
          <option value="">{t('f_deadline')} : {t('f_any').toLowerCase()}</option>
          <option value="7">{t('f_7')}</option><option value="14">{t('f_14')}</option><option value="30">{t('f_30')}</option><option value="month">{t('f_month')}</option>
        </select>
        <select value={minB} onChange={e => setMinB(e.target.value)} aria-label={t('f_budget')}>
          <option value="">{t('f_budget')}</option>
          {[1, 3, 5, 10, 20].map(m => <option key={m} value={m * 1e6}>≥ {m} M€</option>)}
        </select>
        <select value={dept} onChange={e => setDept(e.target.value)} aria-label={t('f_dept')}>
          <option value="">{t('f_all_dept')}</option>
          {depts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={verdict} onChange={e => setVerdict(e.target.value)} aria-label={t('f_verdict')}>
          <option value="">{t('f_verdict')}</option>
          <option value="GO">{t('v_GO')}</option><option value="MAYBE">{t('v_MAYBE')}</option>
        </select>
        <label className="ag-check"><input type="checkbox" checked={onlyComp} onChange={e => setOnlyComp(e.target.checked)} />{t('f_comp')}</label>
        <label className="ag-check"><input type="checkbox" checked={onlyNew} onChange={e => setOnlyNew(e.target.checked)} />{t('f_new')}</label>
        {filtered && <button className="ag-link" onClick={reset}>{t('f_reset')}</button>}
      </div>

      <div className="ag-bar">
        <strong>{t('n_results', { n: rows.length })}</strong>
        <label>{t('sort')}
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="deadline">{t('s_deadline')}</option><option value="budget">{t('s_budget')}</option>
            <option value="score">{t('s_score')}</option><option value="recent">{t('s_recent')}</option>
          </select>
        </label>
        <button className="ag-btn" onClick={exportCsv}>{t('export_csv')}</button>
      </div>

      {rows.length === 0 ? <p className="ag-empty">{!live.length ? t('empty_data') : group === 'saved' ? t('saved_empty') : t('empty')}</p> : (
        <table className="ag-table">
          <thead><tr>
            <th>{t('c_deadline')}</th><th>{t('c_project')}</th><th>{t('c_place')}</th>
            <th className="num">{t('c_works')}</th><th className="num">{t('c_prize')}</th>
            <th>{t('c_contract')}</th><th>{t('c_rating')}</th><th>{t('c_status')}</th><th aria-label={t('save')}></th>
          </tr></thead>
          <tbody>
            {rows.map(x => {
              const tk = tracking[x.publication_number]
              const g = groupOf(x)
              return (
                <tr key={x.publication_number} className={`g-${g}`} onClick={() => router.push(`/agence/${encodeURIComponent(x.publication_number)}`)}>
                  <td className="c-dl"><b>{shortDate(x.deadline, lang)}</b><Days deadline={x.deadline} /></td>
                  <td className="c-pj">
                    <Link href={`/agence/${encodeURIComponent(x.publication_number)}`} onClick={e => e.stopPropagation()}>{x.title}</Link>
                    <span className="sub">
                      <i className={`ty g-${g}`}>{t('ty_' + (x.typology || 'OTHER'))}</i>
                      {x.buyer_name}{isNew(x) && <em>{t('new')}</em>}{group === 'saved' && tk?.updated_by && <span className="by">{t('saved_by', { n: tk.updated_by })}</span>}
                    </span>
                  </td>
                  <td className="c-pl">{x.location || (x.departement || '').split(' | ').slice(0, 3).join(', ')}</td>
                  <td className="num">{money(x.budget_eur)}</td>
                  <td className="num">{money(x.prize_eur)}{x.teams_shortlisted ? <span className="sub">{t('teams', { n: x.teams_shortlisted })}</span> : null}</td>
                  <td><Contract t={x} /></td>
                  <td><Verdict t={x} /></td>
                  <td><StatusSelect value={tk?.status || 'none'} onChange={(s: Status) => patch(x.publication_number, { status: s })} /></td>
                  <td><Save on={!!tk?.starred} onClick={() => patch(x.publication_number, { starred: !tk?.starred })} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Ruler({ rows, label, today, lang }: { rows: Tender[]; label: string; today: string; lang: string }) {
  const cols = useMemo(() => {
    const by: Tender[][] = Array.from({ length: HORIZON + 1 }, () => [])
    rows.forEach(x => { const d = daysLeft(x.deadline); if (d != null && d >= 0 && d <= HORIZON) by[d].push(x) })
    return by
  }, [rows])
  const max = Math.max(1, ...cols.map(c => c.length))
  const start = new Date(); start.setHours(0, 0, 0, 0)
  return (
    <figure className="ag-ruler" aria-label={label}>
      <figcaption>{label}</figcaption>
      <div className="ag-ruler-plot" style={{ '--max': Math.min(max, 10) } as React.CSSProperties}>
        {cols.map((c, i) => {
          const day = new Date(start.getTime() + i * 86400000)
          const monday = day.getDay() === 1
          const iso = day.toLocaleDateString('sv-SE')
          return (
            <div key={i} className={`col ${monday ? 'wk' : ''} ${i === 0 ? 'now' : ''} ${day.getDay() === 0 || day.getDay() === 6 ? 'we' : ''}`}>
              <div className="stack">
                {c.slice(0, 10).map(x => (
                  <Link key={x.publication_number} href={`/agence/${encodeURIComponent(x.publication_number)}`} className={`g-${groupOf(x)}`}
                    title={`${shortDate(x.deadline, lang)} · ${x.title} · ${x.buyer_name || ''} ${money(x.budget_eur)}`} />
                ))}
                {c.length > 10 && <span className="more">+{c.length - 10}</span>}
              </div>
              {((monday && i > 3) || i === 0) && <span className="tick">{i === 0 ? today : shortDate(iso, lang)}</span>}
            </div>
          )
        })}
      </div>
    </figure>
  )
}
