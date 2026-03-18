'use client'

import { supabase } from '../../lib/supabase'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function HeaderAuth() {
  const router = useRouter()
  const [label,   setLabel]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const { data: profile } = await supabase
          .from('agency_profiles')
          .select('name')
          .eq('user_id', data.session.user.id)
          .single()
        setLabel(profile?.name ?? data.session.user.email ?? 'Mon profil')
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setLabel(null); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div style={{ width: 120, height: 28 }} />
  )

  const btnBase: React.CSSProperties = {
    fontSize: '0.78rem', fontWeight: 500, padding: '6px 16px',
    borderRadius: 999, border: 'none', cursor: 'pointer',
  }

  if (label) {
    const nameStyle: React.CSSProperties = {
      fontSize: '0.78rem', fontWeight: 600, padding: '6px 16px',
      borderRadius: 999, border: 'none', cursor: 'default',
      background: 'transparent', color: 'hsl(220,20%,12%)',
      textDecoration: 'none', display: 'inline-block',
    }

    const linkStyle: React.CSSProperties = {
      fontSize: '0.78rem', fontWeight: 500, padding: '6px 16px',
      borderRadius: 999, border: 'none', cursor: 'pointer',
      background: 'transparent', color: 'hsl(220,8%,52%)',
      textDecoration: 'none', display: 'inline-block',
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={nameStyle}>{label}</span>
        <Link href="/favoris" style={linkStyle}>
          ♥ Favoris
        </Link>
        <Link href="/profil" style={linkStyle}>
          Mon profil
        </Link>
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.refresh()
          }}
          style={{ ...btnBase, background: 'hsl(220,8%,95%)', color: 'hsl(220,20%,12%)' }}
        >
          Déconnexion
        </button>
      </div>
    )
  }

  return (
    <Link href="/login" style={{
      ...btnBase, background: 'hsl(220,8%,95%)', color: 'hsl(220,20%,12%)',
      textDecoration: 'none', display: 'inline-block',
    }}>
      Commencer
    </Link>
  )
}
