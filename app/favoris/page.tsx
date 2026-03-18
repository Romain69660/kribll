'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { OpportunityCard, type Tender } from '../components/TendersGrid'

const hl = "'Outfit', 'Inter', sans-serif"

export default function FavorisPage() {
  const router  = useRouter()
  const [tenders,     setTenders]     = useState<Tender[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set())
  const [userId,      setUserId]      = useState<string | null>(null)
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.push('/login'); return }
      const uid = data.session.user.id
      setUserId(uid)

      const { data: favs } = await supabase
        .from('favorites')
        .select('tender_id, tenders(*)')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })

      if (favs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list = (favs as any[])
          .map((f: { tenders: Tender | Tender[] | null }) => Array.isArray(f.tenders) ? f.tenders[0] : f.tenders)
          .filter(Boolean) as Tender[]
        setTenders(list)
        setFavoriteIds(new Set(list.map(t => t.id)))
      }
      setLoading(false)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleFavorite(tenderId: number) {
    if (!userId) return
    if (favoriteIds.has(tenderId)) {
      await supabase.from('favorites').delete().eq('user_id', userId).eq('tender_id', tenderId)
      setFavoriteIds(prev => { const n = new Set(prev); n.delete(tenderId); return n })
      setTenders(prev => prev.filter(t => t.id !== tenderId))
    } else {
      await supabase.from('favorites').insert({ user_id: userId, tender_id: tenderId })
      setFavoriteIds(prev => new Set([...prev, tenderId]))
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'white', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, paddingTop: 16 }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 2rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', height: 44, padding: '0 20px',
            background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(20px)',
            border: '1px solid hsl(220,8%,91%)', borderRadius: 999,
            boxShadow: '0 1px 3px hsl(220,20%,12%,0.04)',
          }}>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginRight: 28 }}>
              <Image src="/logokribbl.png" alt="Kribbl" width={24} height={24} style={{ display: 'block' }} />
              <span style={{ fontFamily: hl, fontWeight: 700, fontSize: '0.98rem', color: 'hsl(220,20%,12%)', letterSpacing: '-0.02em' }}>
                kribbl
              </span>
            </Link>
            <Link href="/" style={{ fontSize: '0.82rem', color: 'hsl(220,8%,52%)', textDecoration: 'none' }}>
              ← Retour
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ paddingTop: 100, paddingBottom: 64 }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 2rem' }}>

          <div style={{ marginBottom: 36 }}>
            <h1 style={{ fontFamily: hl, fontWeight: 700, fontSize: 'clamp(1.4rem, 3vw, 2rem)', letterSpacing: '-0.025em', color: 'hsl(220,20%,12%)', margin: '0 0 8px' }}>
              Mes favoris
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'hsl(220,8%,52%)', margin: 0 }}>
              {loading ? '…' : `${tenders.length} opportunité${tenders.length !== 1 ? 's' : ''} sauvegardée${tenders.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '64px 0', color: 'hsl(220,8%,52%)', fontSize: '0.88rem' }}>
              Chargement…
            </div>
          ) : tenders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '64px 0' }}>
              <p style={{ color: 'hsl(220,8%,52%)', fontSize: '0.95rem', marginBottom: 20 }}>
                Vous n&apos;avez pas encore de favoris.
              </p>
              <Link href="/" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: '0.85rem', fontWeight: 400, padding: '10px 22px', borderRadius: 999,
                background: 'white', border: '1px solid hsl(220,8%,88%)', textDecoration: 'none',
                color: 'hsl(220,20%,12%)',
              }}>
                Découvrir les opportunités →
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {tenders.map((t, i) => (
                <OpportunityCard
                  key={t.id ?? i}
                  tender={t}
                  isFavorite={favoriteIds.has(t.id)}
                  onToggleFavorite={() => toggleFavorite(t.id)}
                  userId={userId}
                />
              ))}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
