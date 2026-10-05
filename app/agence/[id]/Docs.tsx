'use client'

import { useEffect, useRef, useState } from 'react'
import {
  MAX_FILE, addDoc, analyseDocs, docUrl, docsToRead, downloadBlob, fillDoc, l3, loadDocs, removeDoc,
  type Contact, type Doc, type Dossier, type L3, type Tender, type Tracking,
} from '../../../lib/agence/core'
import { unzip } from '../../../lib/agence/zip'
import { useAgence } from '../Shell'

const size = (n: number) => n > 1e6 ? `${(n / 1e6).toFixed(1)} Mo` : `${Math.max(1, Math.round(n / 1e3))} ko`

export default function Docs({ tender, dossier, onDossier, tracking, contacts }: { tender: Tender; dossier: Dossier | null | undefined; onDossier: (d: Dossier) => void; tracking: Tracking; contacts: Contact[] }) {
  const { t, lang, user } = useAgence()
  const id = tender.publication_number
  const [docs, setDocs] = useState<Doc[]>([])
  const [over, setOver] = useState(false)
  const [step, setStep] = useState('')
  const [error, setError] = useState('')
  const [skipped, setSkipped] = useState<string[]>([])
  const [filled, setFilled] = useState<{ n: number; missing: string[] } | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { loadDocs(id).then(setDocs).catch(e => setError(e.message)) }, [id])

  async function read(list: Doc[]) {
    const pick = docsToRead(list)
    if (!pick.length) return
    setStep(t('docs_reading')); setError('')
    try { onDossier(await analyseDocs(tender, pick)) } catch (e) { setError((e as Error).message) }
    setStep('')
  }

  async function take(files: FileList | File[]) {
    setError(''); setSkipped([])
    const items: { name: string; blob: Blob }[] = []
    for (const f of Array.from(files)) {
      if (/\.zip$/i.test(f.name)) { try { items.push(...await unzip(f)) } catch (e) { setError(`${f.name} : ${(e as Error).message}`) } }
      else items.push({ name: f.name, blob: f })
    }
    const have = new Set(docs.map(d => d.name))
    const todo = items.filter(i => !have.has(i.name) && have.add(i.name))
    const big = todo.filter(i => i.blob.size > MAX_FILE).map(i => i.name)
    const ok = todo.filter(i => i.blob.size <= MAX_FILE)
    const added: Doc[] = []
    for (let n = 0; n < ok.length; n++) {
      setStep(t('docs_uploading', { n: n + 1, t: ok.length }))
      try { added.push(await addDoc(id, ok[n].name, ok[n].blob, user)) } catch (e) { setError((e as Error).message) }
    }
    setSkipped(big)
    const all = [...docs, ...added].sort((a, b) => a.name.localeCompare(b.name))
    setDocs(all); setStep('')
    if (added.length) await read(all)
  }

  async function fill(d: Doc) {
    setStep(t('filling')); setError(''); setFilled(null)
    try {
      const r = await fillDoc(tender, d, tracking, contacts, user)
      setDocs(s => [...s, r.doc].sort((a, b) => a.name.localeCompare(b.name)))
      downloadBlob(r.doc.name, r.blob)
      setFilled({ n: r.filled, missing: r.missing })
    } catch (e) { setError((e as Error).message) }
    setStep('')
  }

  function drop(d: Doc) { setDocs(s => s.filter(x => x.id !== d.id)); removeDoc(d).catch(e => setError(e.message)) }

  const list = (title: string, items?: L3[], cls = '') => items && items.length > 0 && (
    <div className={`blk ${cls}`}><h3>{title}</h3><ul>{items.map((x, i) => <li key={i}>{l3(x, lang)}</li>)}</ul></div>
  )

  return (
    <section className="ag-docs">
      <h2>{t('s_docs')}</h2>
      <p className="ag-muted">{t('docs_intro')}</p>
      <div className={`ag-drop ${over ? 'over' : ''}`} role="button" tabIndex={0}
        onClick={() => input.current?.click()} onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
        onDragOver={e => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={e => { e.preventDefault(); setOver(false); take(e.dataTransfer.files) }}>
        {step || t('docs_drop')}
        <input ref={input} type="file" multiple hidden onChange={e => { if (e.target.files) take(e.target.files); e.target.value = '' }} />
      </div>
      {error && <p className="ag-err">{error}</p>}
      {skipped.length > 0 && <p className="ag-muted small">{t('docs_skipped', { n: skipped.join(', ') })}</p>}

      {filled && (
        <div className="ag-filled" role="status">
          <p><b>{t('fill_done', { n: filled.n })}</b> {t('fill_check')}</p>
          {filled.missing.length > 0 && <><p className="ag-muted">{t('fill_missing')}</p><ul>{filled.missing.map((m, i) => <li key={i}>{m}</li>)}</ul></>}
        </div>
      )}
      {docs.some(d => /\.doc$/i.test(d.name)) && <p className="ag-muted small">{t('fill_doc_hint')}</p>}

      {docs.length > 0 && (
        <details className="ag-files" open>
          <summary>{t('docs_files', { n: docs.length })}</summary>
          <ul>{docs.map(d => (
            <li key={d.id}><a href={docUrl(d)} target="_blank" rel="noreferrer">{d.name}</a><span className="ag-muted">{size(d.size)}</span>
              {/\.docx$/i.test(d.name) && !step && <button className="ag-btn sm" onClick={() => fill(d)}>{t('fill')}</button>}
              {/\.doc$/i.test(d.name) && <span className="ag-muted small" title={t('fill_doc_hint')}>.doc</span>}
              <button className="ag-link" onClick={() => drop(d)}>{t('remove')}</button></li>
          ))}</ul>
          {!step && <button className="ag-btn" onClick={() => read(docs)}>{t('docs_reread')}</button>}
        </details>
      )}

      {dossier && (
        <div className="ag-dossier">
          {dossier.summary && <p className="lead">{l3(dossier.summary, lang)}</p>}
          {list(t('d_admiss'), dossier.admissibility, 'hot')}
          {dossier.lead_rule && <div className="blk"><h3>{t('d_lead')}</h3><p>{l3(dossier.lead_rule, lang)}</p></div>}
          {list(t('d_refs'), dossier.references)}
          {list(t('d_comp'), dossier.competences, 'cols')}
          {list(t('d_submit'), dossier.to_submit)}
          {list(t('d_criteria'), dossier.criteria)}
          {list(t('d_dates'), dossier.key_dates)}
          {list(t('d_watch'), dossier.watch)}
          <p className="ag-muted small">{t('docs_check')} {dossier.files_read?.length ? t('docs_read_from', { n: dossier.files_read.join(', ') }) : ''}</p>
        </div>
      )}
    </section>
  )
}
