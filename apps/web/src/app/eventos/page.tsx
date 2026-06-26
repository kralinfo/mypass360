'use client'

import { useSupabaseEvents } from '@/features/events/hooks/useSupabaseEvents'
import { EventCard } from '@/features/events/components/EventCard'

export default function EventsPage() {
  const { events, isLoading, error } = useSupabaseEvents()

  if (isLoading) {
    return (
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Eventos</h1>
        <p style={{ color: '#666' }}>Carregando eventos...</p>
      </main>
    )
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>Eventos</h1>

      {error && (
        <div
          style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <p style={{ margin: 0, color: '#856404' }}>{error}</p>
        </div>
      )}

      {events.length === 0 && !error ? (
        <div
          style={{
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, color: '#6c757d' }}>Nenhum evento disponível no momento.</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#6c757d' }}>
            Adicione eventos publicados no Supabase para vê-los aqui.
          </p>
        </div>
      ) : (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </section>
      )}
    </main>
  )
}
