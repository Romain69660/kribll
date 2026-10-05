'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DEMO, sb } from '../../lib/agence/core'
import { tr, type Lang } from '../../lib/agence/i18n'

type Ctx = { lang: Lang; t: (k: string, v?: Record<string, string | number>) => string; user: string | null }
const C = createContext<Ctx>({ lang: 'fr', t: k => k, user: null })
export const useAgence = () => useContext(C)

export default function Shell({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>('fr')
  const [user, setUser] = useState<string | null | undefined>(DEMO ? 'demo' : undefined)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const path = usePathname()

  useEffect(() => {
    const saved = localStorage.getItem('gbadw-lang') as Lang | null
    if (saved === 'fr' || saved === 'en' || saved === 'es') setLang(saved)
    if (DEMO) return
    sb().auth.getSession().then(({ data }) => setUser(data.session?.user.email ?? null))
    const { data } = sb().auth.onAuthStateChange((_e, s) => setUser(s?.user.email ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const t = useCallback((k: string, v?: Record<string, string | number>) => tr(lang, k, v), [lang])
  const pick = (l: Lang) => { setLang(l); localStorage.setItem('gbadw-lang', l) }

  async function signIn(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('')
    const { error } = await sb().auth.signInWithPassword({ email, password: pw })
    if (error) setErr(error.message)
    setBusy(false)
  }

  const langs = (
    <div className="ag-lang" role="group" aria-label="Language">
      {(['fr', 'en', 'es'] as Lang[]).map(l => (
        <button key={l} onClick={() => pick(l)} aria-pressed={lang === l}>{l.toUpperCase()}</button>
      ))}
    </div>
  )

  if (user === undefined) return <div className="ag"><p className="ag-wait">{t('loading')}</p></div>

  if (user === null) return (
    <div className="ag ag-login">
      <form onSubmit={signIn}>
        <div className="ag-brand">GilBartolome Architects.</div>
        <h1>{t('login_title')}</h1>
        <p>{t('login_sub')}</p>
        <label>{t('email')}<input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" /></label>
        <label>{t('password')}<input type="password" required value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" /></label>
        {err && <p className="ag-err">{err}</p>}
        <button className="ag-btn ag-primary" disabled={busy}>{t('sign_in')}</button>
        {langs}
      </form>
    </div>
  )

  const nav: [string, string][] = [['/agence', 'nav_list'], ['/agence/suivi', 'nav_board'], ['/agence/resume', 'nav_resume']]
  return (
    <C.Provider value={{ lang, t, user }}>
      <div className="ag">
        <header className="ag-top">
          <Link href="/agence" className="ag-brand">GilBartolome Architects.</Link>
          <nav>
            {nav.map(([href, k]) => (
              <Link key={href} href={href} aria-current={(href === '/agence' ? path === href || /^\/agence\/(?!suivi|resume)/.test(path) : path.startsWith(href)) ? 'page' : undefined}>{t(k)}</Link>
            ))}
          </nav>
          <div className="ag-top-r">
            {langs}
            {!DEMO && <button className="ag-link" onClick={() => sb().auth.signOut()}>{t('sign_out')}</button>}
          </div>
        </header>
        <main>{children}</main>
      </div>
    </C.Provider>
  )
}
