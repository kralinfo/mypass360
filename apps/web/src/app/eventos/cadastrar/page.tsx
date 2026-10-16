'use client'

import { Suspense } from 'react'
import { EventForm } from '@/features/events/components/EventForm'

export default function CadastrarEventoPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', background: '#f8fafc', paddingTop: '5rem' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
            <p style={{ color: '#64748b' }}>Carregando...</p>
          </div>
        </div>
      }
    >
      <EventForm />
    </Suspense>
  )
}
