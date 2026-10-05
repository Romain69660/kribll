// Lecture d'un zip dans le navigateur, sans bibliothèque : on lit le répertoire central
// puis on décompresse chaque fichier avec DecompressionStream.

export type ZipEntry = { name: string; blob: Blob }

async function inflate(data: Uint8Array): Promise<Blob> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(stream).blob()
}

export async function unzip(file: Blob, depth = 0): Promise<ZipEntry[]> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const dv = new DataView(buf.buffer)
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('Zip illisible')
  const count = dv.getUint16(eocd + 10, true)
  let p = dv.getUint32(eocd + 16, true)
  const out: ZipEntry[] = []
  for (let n = 0; n < count && p + 46 <= buf.length; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break
    const flags = dv.getUint16(p + 8, true), method = dv.getUint16(p + 10, true)
    const csize = dv.getUint32(p + 20, true)
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true)
    const local = dv.getUint32(p + 42, true)
    const raw = buf.subarray(p + 46, p + 46 + nameLen)
    let name: string
    try { name = new TextDecoder('utf-8', { fatal: !(flags & 0x800) }).decode(raw) }
    catch { name = new TextDecoder('windows-1252').decode(raw) }   // vieux zips Windows sans drapeau UTF-8
    p += 46 + nameLen + extraLen + commentLen
    if (name.endsWith('/') || /(^|\/)(__MACOSX|\.DS_Store)/.test(name)) continue
    const start = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true)
    const data = buf.subarray(start, start + csize)
    let blob: Blob
    try { blob = method === 0 ? new Blob([data as BlobPart]) : method === 8 ? await inflate(data) : new Blob([]) } catch { continue }
    if (!blob.size) continue
    const short = name.split('/').pop() || name
    if (/\.zip$/i.test(short) && depth < 2) {
      try { out.push(...await unzip(blob, depth + 1)) } catch { /* zip imbriqué illisible : ignoré */ }
    } else out.push({ name: short, blob })
  }
  return out
}
