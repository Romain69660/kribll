'use client'

import { supabase } from '../../lib/supabase'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const hl = "'Outfit', 'Inter', sans-serif"

const SPECIALISATIONS = [
  { value: 'housing',        label: 'Logement' },
  { value: 'school',         label: 'École' },
  { value: 'heritage',       label: 'Patrimoine' },
  { value: 'rehabilitation', label: 'Réhabilitation' },
  { value: 'museum',         label: 'Musée / Culture' },
  { value: 'public_building',label: 'Bâtiment public' },
  { value: 'urbanism',       label: 'Urbanisme' },
  { value: 'landscape',      label: 'Paysage' },
  { value: 'amo',            label: 'AMO' },
  { value: 'competition',    label: 'Concours' },
]

const PAYS = ['France', 'Belgique', 'Suisse', 'Allemagne', 'Italie']

const REF_BUDGETS = ['<500k', '500k-2M', '2M-10M', '10M+']

const REGIONS_FRANCE = [
  "Île-de-France", "Auvergne-Rhône-Alpes", "Nouvelle-Aquitaine",
  "Occitanie", "Grand Est", "Hauts-de-France", "Normandie",
  "Bretagne", "Pays de la Loire", "Bourgogne-Franche-Comté",
  "Centre-Val de Loire", "Provence-Alpes-Côte d'Azur",
  "Corse", "Guadeloupe", "Martinique", "Guyane", "La Réunion",
  "Paris", "Lyon", "Marseille", "Bordeaux", "Toulouse",
  "Nantes", "Strasbourg", "Lille", "Grenoble", "Rennes",
  "Montpellier", "Nice", "Toulon", "Nîmes", "Clermont-Ferrand",
  "Le Havre", "Dijon", "Angers", "Saint-Étienne", "Caen",
  "69", "75", "13", "33", "31", "44", "67", "59", "38", "35"
]

const VILLES_FRANCE = [
  "Paris", "Lyon", "Marseille", "Bordeaux", "Toulouse",
  "Nantes", "Strasbourg", "Lille", "Grenoble", "Rennes",
  "Montpellier", "Nice", "Toulon", "Nîmes", "Clermont-Ferrand",
  "Le Havre", "Dijon", "Angers", "Saint-Étienne", "Caen",
  "Amiens", "Reims", "Tours", "Limoges", "Metz", "Brest",
  "Perpignan", "Orléans", "Besançon", "Mulhouse",
]

interface Reference {
  type: string
  location: string
  year: string
  budget: string
}

interface Profile {
  name: string
  city: string
  team_size: string
  annual_revenue: string
  project_types: string[]
  preferred_countries: string[]
  preferred_regions: string[]
  references: Reference[]
}

const EMPTY: Profile = {
  name: '', city: '', team_size: '6-15', annual_revenue: '300k-600k',
  project_types: [], preferred_countries: [], preferred_regions: [],
  references: [],
}

const EMPTY_REF: Reference = { type: 'housing', location: '', year: '', budget: '<500k' }

function MultiSelect({ selected, suggestions, placeholder, onAdd, onRemove, inputStyle }: {
  selected: string[]
  suggestions: string[]
  placeholder: string
  onAdd: (v: string) => void
  onRemove: (v: string) => void
  inputStyle: React.CSSProperties
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = query.length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase()) && !selected.includes(s))
    : []

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {selected.map(v => (
            <span key={v} style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '3px 10px', borderRadius: 999, fontSize: '0.78rem',
              background: 'hsl(220,20%,12%)', color: 'white',
            }}>
              {v}
              <button
                type="button" onClick={() => onRemove(v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', fontSize: '0.9rem', lineHeight: 1, padding: 0 }}
              >×</button>
            </span>
          ))}
        </div>
      )}
      <input
        style={inputStyle}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => { if (query.length > 0) setOpen(true) }}
        placeholder={selected.length === 0 ? placeholder : 'Ajouter...'}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'white', border: '1px solid hsl(220,8%,88%)', borderRadius: 10,
          boxShadow: '0 4px 16px hsl(220 20% 12%/0.08)', marginTop: 4,
          maxHeight: 200, overflowY: 'auto',
        }}>
          {filtered.map(s => (
            <button
              key={s} type="button"
              onMouseDown={e => { e.preventDefault(); onAdd(s); setQuery(''); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '0.85rem', color: 'hsl(220,20%,12%)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'hsl(220,8%,97%)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >{s}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function CitySelect({ value, suggestions, placeholder, onChange, inputStyle }: {
  value: string
  suggestions: string[]
  placeholder: string
  onChange: (v: string) => void
  inputStyle: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const filtered = value.length > 0
    ? suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()))
    : []

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        style={inputStyle}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => { if (value.length > 0) setOpen(true) }}
        placeholder={placeholder}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'white', border: '1px solid hsl(220,8%,88%)', borderRadius: 10,
          boxShadow: '0 4px 16px hsl(220 20% 12%/0.08)', marginTop: 4,
          maxHeight: 200, overflowY: 'auto',
        }}>
          {filtered.map(s => (
            <button
              key={s} type="button"
              onMouseDown={e => { e.preventDefault(); onChange(s); setOpen(false) }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '8px 12px', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '0.85rem', color: 'hsl(220,20%,12%)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'hsl(220,8%,97%)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >{s}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProfilPage() {
  const router = useRouter()

  const [user, setUser]   = useState<User | null>(null)
  const [userId,  setUserId]  = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile>(EMPTY)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    async function fetchProfile(uid: string) {
      const { data: p } = await supabase
        .from('agency_profiles')
        .select('*')
        .eq('user_id', uid)
        .single()

      if (p) {
        // Profil existant : on pré-remplit le formulaire pour édition
        setProfile({
          name:                p.name ?? '',
          city:                p.city ?? '',
          team_size:           String(p.team_size ?? '6-15'),
          annual_revenue:      String(p.annual_revenue ?? '300k-600k'),
          project_types:       p.project_types ?? [],
          preferred_countries: p.preferred_countries ?? [],
          preferred_regions:   Array.isArray(p.preferred_regions) ? p.preferred_regions : [],
          references:          (p.agency_references ?? []).map((r: Reference) => ({
            type: r.type ?? 'housing', location: r.location ?? '',
            year: String(r.year ?? ''), budget: r.budget ?? '<500k',
          })),
        })
        return
      }

      // Premier accès : profil vide
      setProfile(EMPTY)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      setUser(user ?? null)
      setUserId(user?.id ?? null)

      if (!user) {
        router.push('/login')
        return
      }

      fetchProfile(user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      setUser(user ?? null)
      setUserId(user?.id ?? null)
      if (user) fetchProfile(user.id)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleArray(arr: string[], val: string) {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  function updateRef(i: number, field: keyof Reference, val: string) {
    const refs = [...profile.references]
    refs[i] = { ...refs[i], [field]: val }
    setProfile(p => ({ ...p, references: refs }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const currentUser = user
    console.log('user:', currentUser)
    if (!currentUser) return
    setSaving(true); setError(null); setSaved(false)

    const profileData = {
      name:                profile.name,
      city:                profile.city,
      team_size:           profile.team_size,
      annual_revenue:      profile.annual_revenue,
      project_types:       profile.project_types,
      preferred_countries: profile.preferred_countries,
      preferred_regions:   profile.preferred_regions,
      preferred_categories: profile.project_types.map(t => {
        if (['urbanism', 'landscape'].includes(t)) return 'URBANISM_LANDSCAPE'
        if (t === 'amo')         return 'AMO_PROGRAMMING'
        if (t === 'competition') return 'COMPETITIONS'
        return 'ARCHITECTURE_BUILDING'
      }).filter((v, i, a) => a.indexOf(v) === i),
      agency_references: profile.references,
    }
    console.log('profileData:', profileData)

    const userIdToSave = userId ?? currentUser.id
    const { data: existing } = await supabase
      .from('agency_profiles')
      .select('id')
      .eq('user_id', userIdToSave)
      .single()

    let saveError
    if (existing) {
      const { error: e } = await supabase.from('agency_profiles').update(profileData).eq('user_id', userIdToSave)
      saveError = e
    } else {
      const { error: e } = await supabase.from('agency_profiles').insert({ ...profileData, user_id: userIdToSave })
      saveError = e
    }

    console.log('supabase response:', saveError)

    if (saveError) setError(saveError.message)
    else {
      setSaved(true)
      setTimeout(() => router.push('/'), 1000)
    }
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 13px', borderRadius: 10,
    border: '1px solid hsl(220,8%,88%)', fontSize: '0.88rem',
    color: 'hsl(220,20%,12%)', background: 'white', outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '0.78rem', fontWeight: 500, color: 'hsl(220,20%,32%)',
    display: 'block', marginBottom: 6,
  }

  const sectionStyle: React.CSSProperties = {
    background: 'white', border: '1px solid hsl(220,8%,91%)',
    borderRadius: 16, padding: '24px', marginBottom: 16,
    boxShadow: '0 1px 3px hsl(220 20% 12%/0.03)',
  }

  const sectionTitle: React.CSSProperties = {
    fontFamily: hl, fontWeight: 600, fontSize: '0.92rem',
    color: 'hsl(220,20%,12%)', margin: '0 0 20px',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'hsl(220,6%,97.5%)', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <header style={{ background: 'white', borderBottom: '1px solid hsl(220,8%,91%)', padding: '0 2rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontFamily: hl, fontWeight: 700, fontSize: '0.98rem', color: 'hsl(220,20%,12%)', textDecoration: 'none', letterSpacing: '-0.02em' }}>
            kribbl
          </Link>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
            style={{ fontSize: '0.8rem', color: 'hsl(220,8%,52%)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '36px 2rem 60px' }}>

        <h1 style={{ fontFamily: hl, fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.025em', color: 'hsl(220,20%,12%)', margin: '0 0 6px' }}>
          Profil agence
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'hsl(220,8%,52%)', margin: '0 0 28px' }}>
          Ces informations permettent à Leman de personnaliser le scoring.
        </p>

        {saved && (
          <div style={{ background: 'hsl(145,60%,94%)', color: 'hsl(145,70%,30%)', borderRadius: 10, padding: '12px 16px', fontSize: '0.85rem', marginBottom: 20 }}>
            Profil sauvegardé. Redirection...
          </div>
        )}
        {error && (
          <div style={{ background: 'hsl(0,80%,95%)', color: 'hsl(0,70%,40%)', borderRadius: 10, padding: '12px 16px', fontSize: '0.85rem', marginBottom: 20 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave}>

          {/* 1 — Infos de base */}
          <div style={sectionStyle}>
            <h2 style={sectionTitle}>Informations de base</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Nom de l&apos;agence</label>
                <input style={inputStyle} value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Atelier Dupont" />
              </div>
              <div>
                <label style={labelStyle}>Ville</label>
                <CitySelect
                  value={profile.city}
                  suggestions={VILLES_FRANCE}
                  placeholder="Paris"
                  onChange={v => setProfile(p => ({ ...p, city: v }))}
                  inputStyle={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={labelStyle}>Taille équipe</label>
                <select style={inputStyle} value={profile.team_size} onChange={e => setProfile(p => ({ ...p, team_size: e.target.value }))}>
                  {['1-5','6-15','16-50','50+'].map(v => <option key={v} value={v}>{v} personnes</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>CA annuel</label>
                <select style={inputStyle} value={profile.annual_revenue} onChange={e => setProfile(p => ({ ...p, annual_revenue: e.target.value }))}>
                  {['<300k','300k-600k','600k-1.5M','1.5M-5M','5M+'].map(v => <option key={v} value={v}>{v} €</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 2 — Spécialisations */}
          <div style={sectionStyle}>
            <h2 style={sectionTitle}>Spécialisations</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SPECIALISATIONS.map(({ value, label }) => {
                const active = profile.project_types.includes(value)
                return (
                  <button key={value} type="button"
                    onClick={() => setProfile(p => ({ ...p, project_types: toggleArray(p.project_types, value) }))}
                    style={{
                      padding: '7px 16px', borderRadius: 999, fontSize: '0.82rem', fontWeight: 400, cursor: 'pointer',
                      border: active ? '1px solid hsl(220,20%,12%)' : '1px solid hsl(220,8%,88%)',
                      background: active ? 'hsl(220,20%,12%)' : 'white',
                      color: active ? 'white' : 'hsl(220,20%,32%)',
                      transition: 'all .15s',
                    }}>
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3 — Zones géographiques */}
          <div style={sectionStyle}>
            <h2 style={sectionTitle}>Zones géographiques</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Régions / départements préférés</label>
              <MultiSelect
                selected={profile.preferred_regions}
                suggestions={REGIONS_FRANCE}
                placeholder="Île-de-France, Grand Est, 69..."
                onAdd={v => setProfile(p => ({ ...p, preferred_regions: [...p.preferred_regions, v] }))}
                onRemove={v => setProfile(p => ({ ...p, preferred_regions: p.preferred_regions.filter(r => r !== v) }))}
                inputStyle={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Pays</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PAYS.map(pays => {
                  const active = profile.preferred_countries.includes(pays)
                  return (
                    <button key={pays} type="button"
                      onClick={() => setProfile(p => ({ ...p, preferred_countries: toggleArray(p.preferred_countries, pays) }))}
                      style={{
                        padding: '7px 16px', borderRadius: 999, fontSize: '0.82rem', fontWeight: 400, cursor: 'pointer',
                        border: active ? '1px solid hsl(220,20%,12%)' : '1px solid hsl(220,8%,88%)',
                        background: active ? 'hsl(220,20%,12%)' : 'white',
                        color: active ? 'white' : 'hsl(220,20%,32%)',
                        transition: 'all .15s',
                      }}>
                      {pays}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 4 — Références */}
          <div style={sectionStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ ...sectionTitle, margin: 0 }}>Références</h2>
              <button type="button"
                onClick={() => setProfile(p => ({ ...p, references: [...p.references, { ...EMPTY_REF }] }))}
                style={{
                  fontSize: '0.8rem', fontWeight: 500, padding: '7px 16px', borderRadius: 999,
                  background: 'white', border: '1px solid hsl(220,8%,88%)', cursor: 'pointer',
                  color: 'hsl(220,20%,32%)',
                }}>
                + Ajouter une référence
              </button>
            </div>
            {profile.references.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: 'hsl(220,8%,62%)', margin: 0 }}>Aucune référence ajoutée.</p>
            )}
            {profile.references.map((ref, i) => (
              <div key={i} style={{ background: 'hsl(220,8%,97.5%)', borderRadius: 12, padding: '16px', marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 140px 32px', gap: 10, alignItems: 'end' }}>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <select style={inputStyle} value={ref.type} onChange={e => updateRef(i, 'type', e.target.value)}>
                      {SPECIALISATIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Localisation</label>
                    <CitySelect
                      value={ref.location}
                      suggestions={VILLES_FRANCE}
                      placeholder="Lyon"
                      onChange={v => updateRef(i, 'location', v)}
                      inputStyle={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Année</label>
                    <input style={inputStyle} type="number" value={ref.year} onChange={e => updateRef(i, 'year', e.target.value)} placeholder="2022" min="1980" max="2030" />
                  </div>
                  <div>
                    <label style={labelStyle}>Montant estimé</label>
                    <select style={inputStyle} value={ref.budget} onChange={e => updateRef(i, 'budget', e.target.value)}>
                      {REF_BUDGETS.map(v => <option key={v} value={v}>{v} €</option>)}
                    </select>
                  </div>
                  <button type="button"
                    onClick={() => setProfile(p => ({ ...p, references: p.references.filter((_, j) => j !== i) }))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(220,8%,62%)', fontSize: '1.1rem', paddingBottom: 2 }}
                  >×</button>
                </div>
              </div>
            ))}
          </div>

          {/* Sauvegarder */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving} style={{
              padding: '11px 28px', borderRadius: 999, border: 'none',
              background: 'hsl(220,20%,12%)', color: 'white',
              fontSize: '0.88rem', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.6 : 1,
            }}>
              {saving ? 'Sauvegarde...' : 'Sauvegarder le profil'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
