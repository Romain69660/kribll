'use client'

import { useState } from 'react'

interface Props {
  id: number
  title: string
  location?: string
  score: number
  summary?: string
}

export default function ShareButtons({ id, title, location, score, summary }: Props) {
  const [copied, setCopied] = useState(false)

  const pageUrl  = `https://kribbl.app/annonce/${id}`
  const loc      = location || ''
  const sumShort = summary ? summary.slice(0, 200) + (summary.length > 200 ? '…' : '') : ''

  const emailSubject = `Une opportunité Kribbl pour vous — ${title}`
  const emailBody    = `Bonjour,\n\nJ'ai trouvé cette opportunité sur Kribbl qui pourrait vous intéresser :\n\n${title}\n${loc} — Score Leman : ${score}\n\n${sumShort}\n\nVoir l'annonce complète : ${pageUrl}\n\nCordialement`
  const whatsappText = `Opportunité Kribbl 🏗️\n\n${title}\n${loc}\nScore : ${score}/100\n\n${sumShort}\n\n${pageUrl}`

  async function copyLink() {
    await navigator.clipboard.writeText(pageUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const btnStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    fontSize: '0.82rem', fontWeight: 400, padding: '9px 18px',
    borderRadius: 999, border: '1px solid hsl(220,8%,88%)',
    background: 'white', color: 'hsl(220,20%,12%)',
    cursor: 'pointer', textDecoration: 'none',
    boxShadow: '0 1px 3px hsl(220,20%,12%,0.04)',
    transition: 'border-color .2s',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <a
        href={`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
        style={btnStyle}
      >
        <span>📧</span> Email
      </a>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
        target="_blank"
        rel="noopener noreferrer"
        style={btnStyle}
      >
        <span>💬</span> WhatsApp
      </a>
      <button onClick={copyLink} style={btnStyle}>
        {copied ? <><span>✓</span> Lien copié</> : <><span>🔗</span> Copier le lien</>}
      </button>
    </div>
  )
}
