// Lecture et écriture d'un .docx côté serveur, sans bibliothèque : un .docx est un zip de fichiers XML.
import { deflateRawSync, inflateRawSync } from 'zlib'

type Entry = { name: string; data: Buffer }

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
function crc32(b: Buffer): number { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }

export function unzipBuffer(buf: Buffer): Entry[] {
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new Error('Fichier illisible : ce n’est pas un .docx valide')
  const count = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  const out: Entry[] = []
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32)
    const local = buf.readUInt32LE(p + 42)
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8')
    p += 46 + nameLen + extraLen + commentLen
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28)
    const raw = buf.subarray(start, start + csize)
    out.push({ name, data: method === 8 ? inflateRawSync(raw) : Buffer.from(raw) })
  }
  return out
}

export function zipBuffer(entries: Entry[]): Buffer {
  const parts: Buffer[] = [], central: Buffer[] = []
  let offset = 0
  for (const e of entries) {
    const name = Buffer.from(e.name, 'utf8')
    const store = e.name === 'mimetype' || e.data.length === 0
    const comp = store ? e.data : deflateRawSync(e.data)
    const crc = crc32(e.data)
    const h = Buffer.alloc(30)
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(store ? 0 : 8, 8)
    h.writeUInt32LE(0x00210000, 10); h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(e.data.length, 22); h.writeUInt16LE(name.length, 26)
    parts.push(h, name, comp)
    const c = Buffer.alloc(46)
    c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(store ? 0 : 8, 10)
    c.writeUInt32LE(0x00210000, 12); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(e.data.length, 24); c.writeUInt16LE(name.length, 28)
    c.writeUInt32LE(offset, 42)
    central.push(c, name)
    offset += 30 + name.length + comp.length
  }
  const cd = Buffer.concat(central)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16)
  return Buffer.concat([...parts, cd, end])
}

const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
const encode = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const PARA = /<w:p(?: [^>]*)?>[\s\S]*?<\/w:p>|<w:p(?: [^>]*)?\/>/g
const TEXT = /<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>|<w:t(?: [^>]*)?\/>|<w:tab\/>|<w:br\/>/g

export type Para = { i: number; text: string; cell: boolean }

/** Tous les paragraphes du document, dans l'ordre, avec leur texte. */
export function paragraphs(xml: string): Para[] {
  const out: Para[] = []
  let m: RegExpExecArray | null, i = 0, last = 0, depth = 0
  PARA.lastIndex = 0
  while ((m = PARA.exec(xml))) {
    const between = xml.slice(last, m.index)
    depth += (between.match(/<w:tc[ >]/g) || []).length - (between.match(/<\/w:tc>/g) || []).length
    last = m.index
    let text = ''
    m[0].replace(TEXT, (all, t) => { text += all.startsWith('<w:tab') ? '\t' : all.startsWith('<w:br') ? '\n' : decode(t || ''); return all })
    out.push({ i: i++, text, cell: depth > 0 })
  }
  return out
}

/** Remplace le texte des paragraphes indiqués. Le reste du document n'est pas touché. */
export function fillParagraphs(xml: string, fills: Record<number, string>): string {
  let i = -1
  return xml.replace(PARA, para => {
    i++
    const value = fills[i]
    if (value == null) return para
    const safe = encode(value)
    if (para.endsWith('/>')) return para.replace(/\/>$/, `><w:r><w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`)
    let done = false
    let next = para.replace(/<w:t(?: [^>]*)?>[\s\S]*?<\/w:t>|<w:t(?: [^>]*)?\/>/g, () => {
      if (done) return '<w:t></w:t>'
      done = true
      return `<w:t xml:space="preserve">${safe}</w:t>`
    })
    if (!done) {
      // paragraphe vide : on reprend la mise en forme prévue pour le paragraphe, s'il y en a une
      const rpr = (para.match(/<w:pPr>[\s\S]*?(<w:rPr>[\s\S]*?<\/w:rPr>)[\s\S]*?<\/w:pPr>/) || [])[1] || ''
      next = para.replace(/<\/w:p>$/, `<w:r>${rpr}<w:t xml:space="preserve">${safe}</w:t></w:r></w:p>`)
    }
    return next
  })
}
