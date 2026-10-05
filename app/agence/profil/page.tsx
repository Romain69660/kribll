'use client'

import { useEffect, useRef, useState } from 'react'
import { PROFILE_FIELDS, loadProfile, saveProfile, type Profile } from '../../../lib/agence/core'
import { useAgence } from '../Shell'

const WIDE = ['address', 'notes', 'registration', 'architect_register']

export default function ProfilePage() {
  const { t, user } = useAgence()
  const [p, setP] = useState<Profile | null>(null)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { loadProfile().then(setP).catch(e => { setError(e.message); setP({}) }) }, [])

  function set(k: string, v: string) {
    const next = { ...(p || {}), [k]: v }
    setP(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      saveProfile(next, user).then(() => { setFlash(true); setTimeout(() => setFlash(false), 1500) }).catch(e => setError(e.message))
    }, 700)
  }

  if (!p) return <p className="ag-wait">{t('loading')}</p>
  return (
    <div className="ag-page ag-profile">
      <div className="ag-head"><h1>{t('h_profile')}</h1><p className="ag-muted">{t('profile_intro')}</p></div>
      {error && <p className="ag-err">{error}</p>}
      {flash && <div className="ag-flash" role="status">{t('saved')}</div>}
      {PROFILE_FIELDS.map(([group, fields]) => (
        <section key={group}>
          <h2>{t('pg_' + group)}</h2>
          <div className="grid">
            {fields.map(f => (
              <label key={f} className={`fld ${WIDE.includes(f) ? 'wide' : ''}`}>{t('pf_' + f)}
                {f === 'notes'
                  ? <textarea rows={4} value={p[f] || ''} onChange={e => set(f, e.target.value)} />
                  : <input value={p[f] || ''} onChange={e => set(f, e.target.value)} />}
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
