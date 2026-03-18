'use client'

import { useState } from 'react'

interface Props {
  id: number
  title: string
  summary?: string
}

export default function ShareButton({ id, title, summary }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = `https://kribbl.app/annonce/${id}`
    if (navigator.share) {
      await navigator.share({ title, text: summary || '', url })
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleShare}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: '0.82rem', fontWeight: 400, padding: '8px 18px',
        borderRadius: 999, border: '1px solid hsl(220,8%,88%)',
        background: 'white', color: 'hsl(220,20%,32%)',
        cursor: 'pointer', boxShadow: '0 1px 3px hsl(220,20%,12%,0.04)',
      }}
    >
      {copied ? '✓ Lien copié' : 'Partager'}
    </button>
  )
}
