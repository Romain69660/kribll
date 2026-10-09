'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Kit } from '../../../lib/agence/kit'
import { useAgence } from '../Shell'

type Tab = 'agency' | 'refs' | 'partners' | 'lessons'

const k = (n: number) => n.toLocaleString('fr-FR') + ' K€ HT'

function Copy({ text, label, done }: { text: string; label: string; done: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button type="button" className="ag-btn kit-copy" onClick={() => { navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1400) }) }}>
      {ok ? done : label}
    </button>
  )
}

export default function KitPage() {
  const { t } = useAgence()
  const [kit, setKit] = useState<Kit | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('agency')
  const [region, setRegion] = useState('')

  useEffect(() => {
    fetch('/api/agence/kit', { headers: { 'x-agence-code': localStorage.getItem('gbadw-code') || '' } })
      .then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Erreur'); setKit(j) })
      .catch(e => setError(e.message))
  }, [])

  const regions = useMemo(() => kit ? Array.from(new Set(kit.partners.map(p => p.region))) : [], [kit])
  const partners = useMemo(() => kit ? kit.partners.filter(p => !region || p.region === region) : [], [kit, region])

  if (error) return <div className="ag-page"><p className="ag-err">{error}</p></div>
  if (!kit) return <p className="ag-wait">{t('loading')}</p>

  const tabs: [Tab, string][] = [['agency', t('kit_agency')], ['refs', t('kit_refs')], ['partners', t('kit_partners')], ['lessons', t('kit_lessons')]]

  return (
    <div className="ag-page ag-kit">
      <div className="ag-head"><h1>{t('h_kit')}</h1><p className="ag-muted">{t('kit_intro')} {kit.updated}.</p></div>
      <div className="ag-tabs" role="tablist">
        {tabs.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      {tab === 'agency' && <>
        <section className="kit-sec">
          <div className="kit-row-head"><h2>{t('kit_dc1')}</h2><Copy text={kit.dc1Block} label={t('kit_copy')} done={t('kit_copied')} /></div>
          <p className="kit-block">{kit.dc1Block}</p>
        </section>
        <section className="kit-sec">
          <h2>{t('kit_identity')}</h2>
          <dl className="kit-dl">
            {kit.agency.map(r => (
              <div key={r.label}>
                <dt>{r.label}</dt>
                <dd><span>{r.value}</span>{r.note && <small>{r.note}</small>}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="kit-sec">
          <h2>{t('kit_docs')}</h2>
          <ul className="kit-docs">
            {kit.docs.map(d => <li key={d.href}><a href={d.href} download>{d.name}</a><small>{d.note}</small></li>)}
          </ul>
          <p className="ag-muted small kit-off"><b>{t('kit_offline')}</b> {kit.offline.join(' · ')}</p>
        </section>
      </>}

      {tab === 'refs' && kit.refs.map((r, i) => (
        <section key={r.id} className="kit-sec kit-ref">
          <div className="kit-row-head"><h2><span className="kit-n">0{i + 1}</span>{r.title}</h2>
            <Copy text={[r.title, r.nature, r.program, `Maître d'ouvrage : ${r.client}`, r.place, k(r.cost_k), r.area, `Mission : ${r.mission}`, `Rôle et qualité : ${r.role}`, `Avancement : ${r.status}`].join('\n')} label={t('kit_copy')} done={t('kit_copied')} />
          </div>
          <div className="kit-imgs">
            {r.images.map(im => <figure key={im.src}><a href={im.src} target="_blank" rel="noreferrer"><img src={im.src} alt={im.caption} loading="lazy" /></a><figcaption>{im.caption}</figcaption></figure>)}
          </div>
          <dl className="kit-dl two">
            <div><dt>Nature</dt><dd>{r.nature}</dd></div>
            <div><dt>Programme</dt><dd>{r.program}</dd></div>
            <div><dt>Maître d’ouvrage</dt><dd>{r.client}</dd></div>
            <div><dt>Localisation</dt><dd>{r.place}</dd></div>
            <div><dt>Coût des travaux</dt><dd>{k(r.cost_k)}</dd></div>
            <div><dt>Surface</dt><dd>{r.area}</dd></div>
            <div><dt>Mission</dt><dd>{r.mission}</dd></div>
            <div><dt>Rôle et qualité</dt><dd>{r.role}</dd></div>
            <div><dt>Avancement</dt><dd>{r.status}</dd></div>
            <div><dt>Source</dt><dd className="ag-muted">{r.source}</dd></div>
          </dl>
        </section>
      ))}

      {tab === 'partners' && <section className="kit-sec">
        <div className="ag-tabs kit-regions">
          <button aria-selected={!region} onClick={() => setRegion('')}>{t('kit_all')}</button>
          {regions.map(rg => <button key={rg} aria-selected={region === rg} onClick={() => setRegion(rg)}>{rg}</button>)}
        </div>
        <table className="ag-table flat kit-table">
          <thead><tr><th>{t('kit_firm')}</th><th>{t('kit_skills')}</th><th>SIRET</th><th>{t('kit_contact')}</th><th>{t('kit_status')}</th></tr></thead>
          <tbody>
            {partners.map(p => (
              <tr key={p.name}>
                <td><b>{p.name}</b><span className="sub">{p.region}{p.address ? ` · ${p.address}` : ''}</span></td>
                <td>{p.skills}{p.staff && <span className="sub">{p.staff} pers.</span>}</td>
                <td className="nowrap">{p.siret || ''}</td>
                <td>{p.contact || ''}{p.signatory && <span className="sub">{p.signatory}</span>}</td>
                <td><span className={`kit-st ${p.status.replace(' ', '-')}`}>{t('kit_st_' + p.status.replace(' ', '_'))}</span>{p.note && <span className="sub">{p.note}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>}

      {tab === 'lessons' && <section className="kit-sec">
        <ol className="kit-lessons">
          {kit.lessons.map(l => <li key={l.rule}><b>{l.rule}</b><span>{l.why}</span></li>)}
        </ol>
      </section>}
    </div>
  )
}
