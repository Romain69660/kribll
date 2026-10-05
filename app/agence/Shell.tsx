'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DEMO } from '../../lib/agence/core'
import { tr, type Lang } from '../../lib/agence/i18n'

const PEOPLE = ['Pablo', 'Jaime', 'Romain']

type Ctx = { lang: Lang; t: (k: string, v?: Record<string, string | number>) => string; user: string | null }
const C = createContext<Ctx>({ lang: 'fr', t: k => k, user: null })
export const useAgence = () => useContext(C)

export default function Shell({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('fr')
  const [user, setUser] = useState<string | null | undefined>(DEMO ? 'Romain' : undefined)
  const [who, setWho] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const path = usePathname()

  useEffect(() => {
    const saved = localStorage.getItem('gbadw-lang') as Lang | null
    if (saved === 'fr' || saved === 'en' || saved === 'es') setLang(saved) // eslint-disable-line react-hooks/set-state-in-effect
    if (DEMO) return
    const name = localStorage.getItem('gbadw-user')
    setUser(name && localStorage.getItem('gbadw-code') ? name : null)
  }, [])

  const t = useCallback((k: string, v?: Record<string, string | number>) => tr(lang, k, v), [lang])
  const pick = (l: Lang) => { setLang(l); localStorage.setItem('gbadw-lang', l) }

  async function signIn(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(false)
    const res = await fetch('/api/agence/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) }).catch(() => null)
    if (res?.ok) { localStorage.setItem('gbadw-user', who); localStorage.setItem('gbadw-code', code); setUser(who) }
    else setErr(true)
    setBusy(false)
  }
  function signOut() { localStorage.removeItem('gbadw-user'); localStorage.removeItem('gbadw-code'); setUser(null); setWho(''); setCode('') }

  const langs = (
    <div className="ag-lang" role="group" aria-label="Language">
      {(['fr', 'en', 'es'] as Lang[]).map(l => (
        <button type="button" key={l} onClick={() => pick(l)} aria-pressed={lang === l}>{l.toUpperCase()}</button>
      ))}
    </div>
  )

  if (user === undefined) return <div className="ag"><p className="ag-wait">{t('loading')}</p></div>

  if (user === null) return (
    <div className="ag ag-login">
      <form onSubmit={signIn}>
        <div className="ag-brand">GilBartolome Architects.</div>
        <h1>{t('login_who')}</h1>
        <div className="ag-people">
          {PEOPLE.map(p => <button type="button" key={p} aria-pressed={who === p} onClick={() => setWho(p)}>{p}</button>)}
        </div>
        {who && <>
          <label>{t('login_code')}<input type="password" required autoFocus value={code} onChange={e => setCode(e.target.value)} /></label>
          {err && <p className="ag-err">{t('login_bad')}</p>}
          <button className="ag-btn ag-primary" disabled={busy}>{t('sign_in')}</button>
        </>}
        {langs}
      </form>
    </div>
  )

  const nav: [string, string, string][] = [
    ['/agence', 'nav_list', 'M3 4h14M3 10h14M3 16h14'],
    ['/agence/suivi', 'nav_board', 'M4 10l4 4 8-9'],
    ['/agence/resume', 'nav_resume', 'M5 2.5h7l3 3v12H5zM8 9h4M8 12.5h4'],
  ]
  const isOn = (href: string) => href === '/agence' ? path === href || /^\/agence\/(?!suivi|resume)/.test(path) : path.startsWith(href)
  return (
    <C.Provider value={{ lang, t, user }}>
      <div className="ag ag-app">
        <aside className="ag-nav">
          <Link href="/agence" className="ag-brand">GilBartolome Architects.</Link>
          <p>{t('nav_menu')}</p>
          <nav>
            {nav.map(([href, k, d]) => (
              <Link key={href} href={href} aria-current={isOn(href) ? 'page' : undefined}>
                <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><path d={d} /></svg>{t(k)}
              </Link>
            ))}
          </nav>
          <p>{t('nav_general')}</p>
          {langs}
          <div className="foot">
            <span className="ag-user">{user}</span>
            {!DEMO && <button className="ag-link" onClick={signOut}>{t('sign_out')}</button>}
          </div>
        </aside>
        <main>{children}</main>
      </div>
    </C.Provider>
  )
}
