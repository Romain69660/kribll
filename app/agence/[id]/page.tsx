'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  CHECKLIST, CONTACT_STATUSES, DISCIPLINES, addContact, asList, daysLeft, downloadFile, emptyTracking, groupOf, icsFor, isHomeLink, isSaved,
  loadContacts, loadTender, loadTracking, longDate, money, removeContact, saveTracking, searchFirms, summaryOf, titleOf, updateContact,
  type Contact, type ContactStatus, type Firm, type Tender, type Tracking,
} from '../../../lib/agence/core'
import { term, tr } from '../../../lib/agence/i18n'
import { useAgence } from '../Shell'
import { Days, Save, StatusSelect, Verdict } from '../ui'

function defaultDisciplines(x: Tender): string[] {
  if (x.contract_type === 'DESIGN_BUILD') return ['entreprise_generale']
  const d = ['structure', 'fluides', 'economie']
  if (x.typology === 'TRANSPORT' || x.typology === 'MAINTENANCE') d.push('vrd')
  if (x.typology === 'MAINTENANCE') d.push('process')
  if (x.typology === 'HERITAGE') d.push('patrimoine')
  return d
}

export default function DetailPage() {
  const { t, lang, user } = useAgence()
  const id = decodeURIComponent(String(useParams().id))
  const [x, setX] = useState<Tender | null | undefined>(undefined)
  const [tk, setTk] = useState<Tracking>(emptyTracking(id))
  const tkRef = useRef(tk)
  useEffect(() => { tkRef.current = tk }, [tk])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [error, setError] = useState('')
  const [flash, setFlash] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [place, setPlace] = useState('')
  const [busy, setBusy] = useState(false)
  const [firms, setFirms] = useState<Firm[] | null>(null)
  const [searchErr, setSearchErr] = useState('')
  const [mailFor, setMailFor] = useState<Contact | null>(null)
  const [manual, setManual] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [ready, setReady] = useState(false)
  const auto = useRef(false)

  useEffect(() => {
    loadTender(id).then(r => {
      setX(r)
      if (r) { setPicked(defaultDisciplines(r)); setPlace([r.location, r.departement].filter(Boolean).join(', ')) }
    }).catch(e => { setError(e.message); setX(null) })
    loadTracking().then(a => { if (a[id]) { setTk(a[id]); if (a[id].suggestions) setFirms(a[id].suggestions!) } setReady(true) }).catch(() => setReady(true))
    loadContacts(id).then(setContacts).catch(() => {})
  }, [id])

  function say(m: string) { setFlash(m); setTimeout(() => setFlash(''), 1800) }
  function patch(p: Partial<Tracking>, debounce = false) {
    const next = { ...tkRef.current, ...p, updated_by: user }
    tkRef.current = next; setTk(next)
    const run = () => saveTracking(next, user).then(() => say(t('saved'))).catch(e => setError(`${t('save_err')} : ${e.message}`))
    if (timer.current) clearTimeout(timer.current)
    if (debounce) timer.current = setTimeout(run, 700); else run()
  }

  async function runSearch() {
    if (!x || !picked.length) return
    setBusy(true); setSearchErr(''); setFirms(null)
    try {
      const found = (await searchFirms(x, picked.map(d => tr('fr', 'di_' + d)), place, lang)).firms
      setFirms(found); patch({ suggestions: found })
    }
    catch (e) { setSearchErr((e as Error).message) }
    setBusy(false)
  }
  async function keep(f: Firm) {
    try { const c = await addContact({ ...f, publication_number: id, note: null, status: 'todo' }, user); setContacts(s => [...s, c]) }
    catch (e) { setError((e as Error).message) }
  }
  function setContact(c: Contact, p: Partial<Contact>) {
    setContacts(s => s.map(k => k.id === c.id ? { ...k, ...p } : k))
    updateContact(c.id, p).catch(e => setError(e.message))
  }
  function drop(c: Contact) { setContacts(s => s.filter(k => k.id !== c.id)); removeContact(c.id).catch(e => setError(e.message)) }

  // Une annonce enregistrée reçoit ses propositions d'entreprises toute seule, une seule fois.
  useEffect(() => {
    if (!ready || !x || auto.current || firms || busy || !picked.length || !isSaved(tk)) return
    auto.current = true
    runSearch()
  }) // eslint-disable-line react-hooks/exhaustive-deps

  const brief = useMemo(() => {
    if (!x) return ''
    const l = [
      `*${titleOf(x, lang)}*`,
      [x.buyer_name, x.location].filter(Boolean).join(', '),
      `${t('ty_' + (x.typology || 'OTHER'))}. ${term(lang, x.procedure_type) || t('ct_' + (x.contract_type || 'OTHER'))}.`,
      x.budget_eur ? `${t('f_works')} : ${money(x.budget_eur)}` : '',
      x.prize_eur ? `${t('f_prize')} : ${money(x.prize_eur)}${x.teams_shortlisted ? ` (${t('teams', { n: x.teams_shortlisted })})` : ''}` : '',
      x.deadline ? `${t('c_deadline')} : ${longDate(x.deadline, lang)}` : '',
      '', summaryOf(x, lang), '', x.url || '',
    ]
    return l.filter((s, i) => s || l[i - 1]).join('\n').trim()
  }, [x, lang, t])

  if (x === undefined) return <p className="ag-wait">{t('loading')}</p>
  if (x === null) return <div className="ag-page"><Link className="ag-back" href="/agence">{t('back')}</Link><p className="ag-err">{error || t('empty')}</p></div>

  const g = groupOf(x)
  const refs = asList(x.required_references), blocks = asList(x.blocking_points)
  const summary = summaryOf(x, lang)
  const done = CHECKLIST.filter(k => tk.checklist[k]).length
  const inList = (f: Firm) => contacts.some(c => c.company.toLowerCase() === f.company.toLowerCase())

  return (
    <div className="ag-page ag-detail">
      <Link className="ag-back" href="/agence">{t('back')}</Link>
      {flash && <div className="ag-flash" role="status">{flash}</div>}
      {error && <p className="ag-err">{error}</p>}

      <header className={`ag-dhead g-${g}`}>
        <p className="meta"><i className={`ty g-${g}`}>{t('ty_' + (x.typology || 'OTHER'))}</i>{t('g_' + g)}</p>
        <h1>{titleOf(x, lang)}</h1>
        {lang !== 'fr' && titleOf(x, lang) !== x.title && <p className="orig">{x.title}</p>}
        <p className="who">{[x.buyer_name, x.location || x.departement].filter(Boolean).join(', ')}</p>
        <div className="ag-dl">
          <div><b>{longDate(x.deadline, lang) || '?'}</b><Days deadline={x.deadline} />{term(lang, x.deadline_type) && <span className="ag-muted">{term(lang, x.deadline_type)}</span>}</div>
          <Verdict t={x} />
          <StatusSelect value={tk.status} onChange={s => patch({ status: s })} />
          <Save label on={tk.starred} onClick={() => patch({ starred: !tk.starred })} />
        </div>
        <div className="ag-actions">
          {x.url && <a className="ag-btn ag-primary" href={x.url} target="_blank" rel="noreferrer">{t('open_notice')}</a>}
          {x.dce_url && <a className="ag-btn" href={x.dce_url} target="_blank" rel="noreferrer">{t(isHomeLink(x.dce_url) ? 'dce_home' : 'dce_direct')}{x.platform ? ` (${x.platform})` : ''}</a>}
          {x.deadline && <button className="ag-btn" onClick={() => downloadFile(`deadline_${id}.ics`, icsFor(x), 'text/calendar')}>{t('add_cal')}</button>}
          <button className="ag-btn" onClick={() => navigator.clipboard.writeText(brief).then(() => say(t('copied')))}>{t('copy_brief')}</button>
        </div>
      </header>

      {x.dce_url && isHomeLink(x.dce_url) && <p className="ag-hint">{t('dce_home_hint', { q: x.buyer_name || x.title || '' })}</p>}
      {x.contract_type === 'DESIGN_BUILD' && <p className="ag-warn">{t('db_warning')}</p>}

      <div className="ag-cols">
        <div className="ag-main">
          {summary && <section><h2>{t('s_summary')}</h2><p className="lead">{summary}</p></section>}
          {blocks.length > 0 && <section className="blocks"><h2>{t('s_block')}</h2><ul>{blocks.map((b, i) => <li key={i}>{b}</li>)}</ul></section>}
          {(x.program || x.mission || refs.length > 0 || x.eligibility) && lang !== 'fr' && <p className="ag-muted small">{t('original_fr')}</p>}
          {x.program && <section><h2>{t('s_program')}</h2><p>{x.program}</p></section>}
          {x.mission && <section><h2>{t('s_mission')}</h2><p>{x.mission}</p></section>}
          {refs.length > 0 && <section><h2>{t('s_refs')}</h2><ul>{refs.map((b, i) => <li key={i}>{b}</li>)}</ul></section>}
          {x.eligibility && <section><h2>{t('s_elig')}</h2><p>{x.eligibility}</p></section>}

          <section className="ag-team">
            <h2>{t('s_team')}</h2>
            <p className="ag-muted">{t('team_intro')}</p>
            <div className="ag-chips">
              {DISCIPLINES.map(d => (
                <button key={d} aria-pressed={picked.includes(d)} onClick={() => setPicked(s => s.includes(d) ? s.filter(k => k !== d) : [...s, d])}>{t('di_' + d)}</button>
              ))}
            </div>
            <div className="ag-search">
              <label>{t('place')}<input value={place} onChange={e => setPlace(e.target.value)} /></label>
              <button className="ag-btn ag-primary" disabled={busy || !picked.length} onClick={runSearch}>{firms ? t('search_again') : t('find')}</button>
            </div>
            {busy && <p className="ag-progress" role="status">{t('finding')}</p>}
            {searchErr && <p className="ag-err">{searchErr}</p>}
            {firms && (
              <div className="ag-results">
                <h3>{t('auto_found')}</h3>
                {firms.length === 0 ? <p className="ag-muted">{t('no_results')}</p> : <>
                  <p className="ag-muted small">{t('verify')}</p>
                  <ul className="ag-firms">
                    {firms.map((f, i) => (
                      <li key={i}>
                        <FirmLines f={f} />
                        <button className="ag-btn" disabled={inList(f)} onClick={() => keep(f)}>{inList(f) ? t('added') : t('add')}</button>
                      </li>
                    ))}
                  </ul>
                </>}
              </div>
            )}

            <h3>{t('my_list')}</h3>
            {contacts.length === 0 ? <p className="ag-muted">{t('my_list_empty')}</p> : (
              <ul className="ag-firms mine">
                {contacts.map(c => (
                  <li key={c.id} className={`cs-${c.status}`}>
                    <FirmLines f={c} />
                    <div className="ctl">
                      <select value={c.status} onChange={e => setContact(c, { status: e.target.value as ContactStatus })} aria-label={t('c_status')}>
                        {CONTACT_STATUSES.map(s => <option key={s} value={s}>{t('cs_' + s)}</option>)}
                      </select>
                      <button className="ag-btn" onClick={() => setMailFor(c)}>{t('write_mail')}</button>
                      <button className="ag-link" onClick={() => drop(c)}>{t('remove')}</button>
                    </div>
                    <input className="note" defaultValue={c.note || ''} placeholder={t('notes')} onBlur={e => e.target.value !== (c.note || '') && setContact(c, { note: e.target.value })} />
                  </li>
                ))}
              </ul>
            )}
            {manual
              ? <ManualForm onCancel={() => setManual(false)} onAdd={f => { keep(f); setManual(false) }} />
              : <button className="ag-link" onClick={() => setManual(true)}>{t('add_manual')}</button>}
          </section>
        </div>

        <aside className="ag-side">
          <section>
            <h2>{t('s_facts')}</h2>
            <dl className="ag-facts">
              <Fact k={t('f_works')} v={money(x.budget_eur) || x.estimated_budget} big />
              {x.budget_eur ? <Fact k={t('f_fee')} v={`${money(x.budget_eur * 0.1)} – ${money(x.budget_eur * 0.12)}`} note={t('f_fee_note')} /> : null}
              <Fact k={t('f_prize')} v={money(x.prize_eur)} />
              <Fact k={t('f_teams')} v={x.teams_shortlisted} />
              <Fact k={t('f_proc')} v={term(lang, x.procedure_type)} />
              <Fact k={t('f_lead')} v={term(lang, x.team_lead)} />
              <Fact k={t('f_buyer')} v={x.buyer_name} />
              <Fact k={t('f_pub')} v={longDate(x.publication_date, lang)} />
              <Fact k={t('f_ref')} v={`${x.source || ''} ${x.publication_number}`} />
            </dl>
          </section>
          <section>
            <h2>{t('s_track')}</h2>
            <label className="fld">{t('owner')}<input value={tk.owner || ''} onChange={e => patch({ owner: e.target.value }, true)} /></label>
            <label className="fld">{t('notes')}<textarea rows={5} value={tk.notes || ''} placeholder={t('notes_ph')} onChange={e => patch({ notes: e.target.value }, true)} /></label>
          </section>
          <section>
            <h2>{t('s_check')} <span className="ag-muted">{done}/{CHECKLIST.length}</span></h2>
            <div className="ag-meter"><span style={{ width: `${(done / CHECKLIST.length) * 100}%` }} /></div>
            <ul className="ag-checklist">
              {CHECKLIST.map(k => (
                <li key={k}><label><input type="checkbox" checked={!!tk.checklist[k]} onChange={e => patch({ checklist: { ...tk.checklist, [k]: e.target.checked } })} />{t('ck_' + k)}</label></li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      {mailFor && <MailDialog tender={x} contact={mailFor} onClose={() => setMailFor(null)} onSent={() => { if (mailFor.status === 'todo') setContact(mailFor, { status: 'contacted' }) }} />}
    </div>
  )
}

function Fact({ k, v, big, note }: { k: string; v: string | number | null | undefined; big?: boolean; note?: string }) {
  if (v == null || v === '' || v === 0) return null
  return <div className={big ? 'big' : ''}><dt>{k}</dt><dd>{v}{note && <small>{note}</small>}</dd></div>
}

function FirmLines({ f }: { f: Firm }) {
  const { t } = useAgence()
  const site = f.website ? (f.website.startsWith('http') ? f.website : 'https://' + f.website) : ''
  return (
    <div className="firm">
      <b>{f.company}</b>
      <span className="ag-muted">{[f.discipline, f.city].filter(Boolean).join(', ')}</span>
      {f.why && <p>{f.why}</p>}
      <p className="links">
        {f.phone && <a href={`tel:${f.phone.replace(/[^+\d]/g, '')}`}>{f.phone}</a>}
        {f.email && <a href={`mailto:${f.email}`}>{f.email}</a>}
        {site && <a href={site} target="_blank" rel="noreferrer">{site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</a>}
        {f.source_url && <a className="src" href={f.source_url} target="_blank" rel="noreferrer">{t('source')}</a>}
      </p>
    </div>
  )
}

function ManualForm({ onAdd, onCancel }: { onAdd: (f: Firm) => void; onCancel: () => void }) {
  const { t } = useAgence()
  const [f, setF] = useState<Firm>({ company: '', discipline: '', city: '', phone: '', email: '', website: '', source_url: null, why: null })
  const fld = (k: keyof Firm, label: string, req = false) => (
    <label>{label}<input required={req} value={(f[k] as string) || ''} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>
  )
  return (
    <form className="ag-manual" onSubmit={e => { e.preventDefault(); onAdd(f) }}>
      {fld('company', t('company'), true)}{fld('discipline', t('discipline'))}{fld('city', t('city'))}
      {fld('phone', t('phone'))}{fld('email', t('email'))}{fld('website', t('website'))}
      <div><button className="ag-btn ag-primary">{t('add')}</button><button type="button" className="ag-link" onClick={onCancel}>{t('close')}</button></div>
    </form>
  )
}

function MailDialog({ tender: x, contact: c, onClose, onSent }: { tender: Tender; contact: Contact; onClose: () => void; onSent: () => void }) {
  const { t } = useAgence()
  const [name, setName] = useState(() => localStorage.getItem('gbadw-sign') || '')
  const d = daysLeft(x.deadline)
  const docsBy = x.deadline && d != null && d > 6
    ? new Date(new Date(x.deadline).getTime() - 5 * 86400000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
  const subject = `Candidature en groupement : ${(x.title || '').slice(0, 90)}`
  const make = (n: string) => [
    'Bonjour,', '',
    `Je suis ${n || '[votre nom]'}, de l'agence d'architecture GIL BARTOLOME ADW. Nous concevons des bâtiments de transport, des équipements techniques et des bâtiments de santé.`, '',
    'Nous préparons une candidature pour la consultation suivante :',
    `${x.title}`,
    `Maître d'ouvrage : ${x.buyer_name || ''}${x.location ? ' (' + x.location + ')' : ''}`,
    x.budget_eur ? `Montant des travaux : ${money(x.budget_eur)} HT` : '',
    x.procedure_type ? `Procédure : ${x.procedure_type}` : '',
    x.deadline ? `Date limite de candidature : ${longDate(x.deadline, 'fr')}` : '',
    x.url ? `Annonce : ${x.url}` : '', '',
    `Nous serions mandataires du groupement et nous cherchons un partenaire${c.discipline ? ' pour la compétence suivante : ' + c.discipline : ''}. Seriez-vous intéressés pour rejoindre l'équipe en tant que cotraitant ?`, '',
    `Si oui, il nous faudrait${docsBy ? ' avant le ' + docsBy : ' rapidement'} : vos références sur des opérations comparables, vos attestations d'assurance et de qualification, votre chiffre d'affaires et vos effectifs des trois dernières années.`, '',
    'Pouvez-vous me confirmer votre intérêt, ou me dire que ce n\'est pas possible, d\'ici demain ? Je peux aussi vous appeler quand cela vous arrange.', '',
    'Cordialement,', n || '[votre nom]', 'GIL BARTOLOME ADW',
  ].filter((s, i, a) => s !== '' || a[i - 1] !== '').join('\n')
  const [edited, setBody] = useState<string | null>(null)
  const body = edited ?? make(name)
  const script = [
    `Bonjour, ${name || '[votre nom]'}, de l'agence d'architecture GIL BARTOLOME ADW.`,
    `Je vous appelle pour une candidature : ${x.title}, pour ${x.buyer_name || 'le maître d\'ouvrage'}.`,
    `Nous cherchons un partenaire${c.discipline ? ' en ' + c.discipline : ''} pour notre groupement. Est-ce que je peux parler à la personne qui s'occupe des concours ?`,
    x.deadline ? `La candidature est à rendre le ${longDate(x.deadline, 'fr')}.` : '',
    'Je peux vous envoyer le détail par mail. À quelle adresse ?',
  ].filter(Boolean)
  return (
    <div className="ag-modal" role="dialog" aria-modal="true" aria-label={t('mail_title')} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>
        <h2>{t('mail_title')} : {c.company}</h2>
        <label className="fld">Votre nom (signature)<input value={name} placeholder="Prénom Nom" onChange={e => { setName(e.target.value); localStorage.setItem('gbadw-sign', e.target.value) }} /></label>
        <textarea rows={16} value={body} onChange={e => setBody(e.target.value)} />
        <div className="ag-actions">
          <a className="ag-btn ag-primary" onClick={onSent} href={`mailto:${c.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>{t('mail_open')}</a>
          <button className="ag-btn" onClick={() => navigator.clipboard.writeText(body)}>{t('mail_copy')}</button>
          <button className="ag-link" onClick={onClose}>{t('close')}</button>
        </div>
        <details><summary>{t('call_script')}{c.phone ? ` (${c.phone})` : ''}</summary><ol>{script.map((s, i) => <li key={i}>{s}</li>)}</ol></details>
      </div>
    </div>
  )
}
