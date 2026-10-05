'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  BOARD_STATUSES, CHECKLIST, toneOf, loadContacts, loadTenderSet, loadTracking, money, saveTracking, shortDate,
  type Contact, type Status, type Tender, type Tracking,
} from '../../../lib/agence/core'
import { useAgence } from '../Shell'
import { Days, StatusSelect } from '../ui'

export default function BoardPage() {
  const { t, lang, user } = useAgence()
  const [tracking, setTracking] = useState<Record<string, Tracking> | null>(null)
  const [tenders, setTenders] = useState<Record<string, Tender>>({})
  const [contacts, setContacts] = useState<Contact[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    loadTracking().then(async tk => {
      const ids = Object.values(tk).filter(x => x.status !== 'none' || x.starred).map(x => x.publication_number)
      const rows = await loadTenderSet(ids)
      setTenders(Object.fromEntries(rows.map(r => [r.publication_number, r])))
      setTracking(tk)
    }).catch(e => { setError(e.message); setTracking({}) })
    loadContacts().then(setContacts).catch(() => {})
  }, [])

  const by = useMemo(() => {
    const m: Record<string, Tracking[]> = {}
    Object.values(tracking || {}).forEach(x => { if (tenders[x.publication_number]) (m[x.status === 'none' ? 'shortlist' : x.status] ||= []).push(x) })
    Object.values(m).forEach(l => l.sort((a, b) => (tenders[a.publication_number].deadline || '9').localeCompare(tenders[b.publication_number].deadline || '9')))
    return m
  }, [tracking, tenders])

  function move(id: string, status: Status) {
    if (!tracking) return
    const next = { ...tracking[id], status }
    setTracking({ ...tracking, [id]: next })
    saveTracking(next, user).catch(e => setError(e.message))
  }

  if (!tracking) return <p className="ag-wait">{t('loading')}</p>

  const card = (k: Tracking) => {
    const x = tenders[k.publication_number]
    const cs = contacts.filter(c => c.publication_number === k.publication_number)
    const done = CHECKLIST.filter(c => k.checklist?.[c]).length
    return (
      <li key={k.publication_number}>
        <p className="top"><b>{shortDate(x.deadline, lang)}</b><Days deadline={x.deadline} /></p>
        <Link href={`/agence/${encodeURIComponent(x.publication_number)}`}>{x.title}</Link>
        <p className="ag-muted">{[x.buyer_name, money(x.budget_eur)].filter(Boolean).join(', ')}</p>
        <p className="ag-muted small">
          {t('firms_n', { n: cs.length, c: cs.filter(c => c.status === 'confirmed').length })}<br />
          {t('docs_n', { n: done, t: CHECKLIST.length })}{k.owner ? `, ${k.owner}` : ''}
        </p>
        <StatusSelect value={k.status} onChange={s => move(k.publication_number, s)} />
      </li>
    )
  }
  const closed = [...(by.lost || []), ...(by.dropped || [])]

  return (
    <div className="ag-page">
      <div className="ag-head"><h1>{t('h_board')}</h1><p className="ag-muted">{t('board_hint')}</p></div>
      {error && <p className="ag-err">{error}</p>}
      <div className="ag-board">
        {BOARD_STATUSES.map(s => (
          <section key={s} className={`tone-${toneOf(s)}`}>
            <h2><span className={`ag-pill tone-${toneOf(s)}`}><i />{t('st_' + s)}</span> <span>{(by[s] || []).length}</span></h2>
            {(by[s] || []).length ? <ul>{by[s].map(card)}</ul> : <p className="ag-muted small">{t('board_empty')}</p>}
          </section>
        ))}
      </div>
      {closed.length > 0 && <details className="ag-closed"><summary>{t('closed')} ({closed.length})</summary><ul className="ag-board-closed">{closed.map(card)}</ul></details>}
    </div>
  )
}
