import { fetchEvents } from '@/features/events/services/events.service'
import { EventCard } from '@/features/events/components/EventCard'

export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  let events
  let error: string | null = null

  try {
    events = await fetchEvents()
  } catch (err) {
    console.error('Failed to fetch events:', err)
    events = []
    error = 'Não foi possível carregar os eventos. Verifique se a API está rodando.'
  }

  return (
    <main>
      <h1>Eventos</h1>
      {error && <p style={{ color: 'orange' }}>{error}</p>}
      {events.length === 0 && !error ? (
        <p>Nenhum evento disponível no momento.</p>
      ) : (
        <section>
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </section>
      )}
    </main>
  )
}
