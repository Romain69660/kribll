import type { Metadata } from 'next'
import Shell from './Shell'
import './agence.css'

export const metadata: Metadata = {
  title: 'GilBartolome Architects · Concours France',
  description: "Veille, analyse et suivi des concours d'architecture en France",
  robots: { index: false, follow: false },
}

export default function AgenceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Shell>{children}</Shell>
    </>
  )
}
