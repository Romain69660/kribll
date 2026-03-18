'use client'

import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

const hl = "'Outfit', 'Inter', sans-serif"

export default function LoginPage() {
  const router = useRouter()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [mode,     setMode]     = useState<'login' | 'signup'>('login')
  const [success,  setSuccess]  = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push('/')
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: 'https://kribbl.app/profil' },
      })
      if (error) { setError(error.message); setLoading(false); return }
      setSuccess('Un email de confirmation a été envoyé à votre adresse. Cliquez sur le lien pour activer votre compte.')
      setMode('login')
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid hsl(220,8%,88%)', fontSize: '0.88rem',
    color: 'hsl(220,20%,12%)', background: 'white', outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'white', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Header minimal */}
      <header style={{ padding: '20px 2rem' }}>
        <Link href="/" style={{ fontFamily: hl, fontWeight: 700, fontSize: '0.98rem', color: 'hsl(220,20%,12%)', textDecoration: 'none', letterSpacing: '-0.02em' }}>
          kribbl
        </Link>
      </header>

      {/* Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          <h1 style={{ fontFamily: hl, fontWeight: 700, fontSize: '1.6rem', letterSpacing: '-0.025em', color: 'hsl(220,20%,12%)', margin: '0 0 6px' }}>
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'hsl(220,8%,52%)', margin: '0 0 28px' }}>
            {mode === 'login' ? 'Accédez à votre espace Kribbl.' : 'Commencez votre veille personnalisée.'}
          </p>

          {success && (
            <div style={{ background: 'hsl(145,60%,94%)', color: 'hsl(145,70%,30%)', borderRadius: 10, padding: '12px 16px', fontSize: '0.85rem', marginBottom: 20 }}>
              {success}
            </div>
          )}

          {error && (
            <div style={{ background: 'hsl(0,80%,95%)', color: 'hsl(0,70%,40%)', borderRadius: 10, padding: '12px 16px', fontSize: '0.85rem', marginBottom: 20 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'hsl(220,20%,32%)', display: 'block', marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="agence@exemple.fr"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'hsl(220,20%,32%)', display: 'block', marginBottom: 6 }}>
                Mot de passe
              </label>
              <input
                type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                marginTop: 6, padding: '11px 0', borderRadius: 10, border: 'none',
                background: 'hsl(220,20%,12%)', color: 'white',
                fontSize: '0.88rem', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>

          <p style={{ fontSize: '0.82rem', color: 'hsl(220,8%,52%)', marginTop: 24, textAlign: 'center' }}>
            {mode === 'login' ? "Pas encore de compte ?" : "Déjà un compte ?"}{' '}
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); setSuccess(null) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220,20%,12%)', fontWeight: 500, fontSize: '0.82rem', textDecoration: 'underline' }}
            >
              {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
