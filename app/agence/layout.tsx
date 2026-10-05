import type { Metadata, Viewport } from 'next'
import Shell from './Shell'
import './agence.css'

export const metadata: Metadata = {
  title: 'GilBartolome Architects · Concours France',
  description: "Veille, analyse et suivi des concours d'architecture en France",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'GBA France', statusBarStyle: 'default' },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#f4f4f5' }

export default function AgenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
      <Shell>{children}</Shell>
    </>
  )
}
