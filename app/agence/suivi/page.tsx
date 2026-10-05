'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CHECKLIST, STATUS_GROUPS, loadContacts, loadTenderSet, loadTracking, money, saveTracking, shortDate, titleOf,
  type Contact, type Status, type Tender, type Tracking,
} from '../../../lib/agence/core'
import { useAgence } from '../Shell'
import { Days, StatusSelect } from '../ui'

export default function BoardPage() {
  const { t, lang, user } = useAgence()
  const router = useRouter()
  const [tracking, setTracking] = useState<Record<string, Tracking> | null>(null)
  const [tenders, setTenders] = useState<Record<string, Tender>>({})
  const [contacts, setContacts] = useState<Contact[]>([])
  const [filter, setFilter] = useState('open')
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

  const all = useMemo(() => Object.values(tracking || {})
    .filter(x => tenders[x.publication_number] && (x.status !== 'none' || x.starred))
    .sort((a, b) => (tenders[a.publication_number].deadline || '9').localeCompare(tenders[b.publication_number].deadline || '9')),
  [tracking, tenders])
  const groupOfStatus = (s: Status) => s === 'none' ? 'todo' : STATUS_GROUPS.find(g => g.items.includes(s))?.key || 'todo'
  const rows = all.filter(x => filter === 'all' ? true : filter === 'open' ? groupOfStatus(x.status) !== 'closed' : groupOfStatus(x.status) === filter)
  const count = (k: string) => all.filter(x => k === 'all' ? true : k === 'open' ? groupOfStatus(x.status) !== 'closed' : groupOfStatus(x.status) === k).length

  function move(id: string, status: Status) {
    if (!tracking) return
    const next = { ...tracking[id], status, updated_by: user }
    setTracking({ ...tracking, [id]: next })
    saveTracking(next, user).catch(e => setError(e.message))
  }

  if (!tracking) return <p className="ag-wait">{t('loading')}</p>

  return (
    <div className="ag-page">
      <div className="ag-head"><h1>{t('h_board')}</h1></div>
      {error && <p className="ag-err">{error}</p>}
      <div className="ag-tabs" role="tablist">
        {['open', 'todo', 'doing', 'done', 'closed', 'all'].map(k => (
          <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}>
            {k === 'open' ? t('f_open') : k === 'all' ? t('g_all') : t('sg_' + k)} <span>{count(k)}</span>
          </button>
        ))}
      </div>
      {rows.length === 0 ? <p className="ag-empty">{t('saved_empty')}</p> : (
        <table className="ag-table ag-track">
          <thead><tr>
            <th>{t('c_project')}</th><th>{t('c_deadline')}</th><th className="num">{t('c_works')}</th>
            <th>{t('my_list')}</th><th>{t('s_check')}</th><th>{t('owner')}</th><th>{t('c_status')}</th>
          </tr></thead>
          <tbody>
            {rows.map(k => {
              const x = tenders[k.publication_number]
              const cs = contacts.filter(c => c.publication_number === k.publication_number)
              const ok = cs.filter(c => c.status === 'confirmed').length
              const done = CHECKLIST.filter(c => k.checklist?.[c]).length
              const href = `/agence/${encodeURIComponent(x.publication_number)}`
              return (
                <tr key={k.publication_number} onClick={() => router.push(href)}>
                  <td className="c-pj"><Link href={href} onClick={e => e.stopPropagation()}>{titleOf(x, lang)}</Link><span className="sub">{x.buyer_name}{x.location ? `, ${x.location}` : ''}</span></td>
                  <td className="c-dl"><b>{shortDate(x.deadline, lang)}</b><Days deadline={x.deadline} /></td>
                  <td className="num">{money(x.budget_eur)}</td>
                  <td className="c-n">{cs.length ? t('firms_short', { c: ok, n: cs.length }) : <span className="ag-muted">0</span>}</td>
                  <td className="c-n">{done}/{CHECKLIST.length}</td>
                  <td className="c-n">{k.owner || k.updated_by || ''}</td>
                  <td><StatusSelect value={k.status} onChange={s => move(k.publication_number, s)} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
