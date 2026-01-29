import { ReactNode } from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard V3 - Mindup',
  description: 'Interface de gestion des decks avec sidebar droite',
}

export default function DashboardV3Layout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
