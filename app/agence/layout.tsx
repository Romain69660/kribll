import type { Metadata } from 'next'
import Shell from './Shell'
import './agence.css'

export const metadata: Metadata = {
  title: 'GIL BARTOLOMÉ ADW · Concours France',
  description: "Veille, analyse et suivi des concours d'architecture en France",
  robots: { index: false, follow: false },
}

export default function AgenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..125,400..700&display=swap" />
      <Shell>{children}</Shell>
    </>
  )
}
