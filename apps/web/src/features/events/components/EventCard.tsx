import Link from 'next/link'
import type { Event } from '@mypass360/types'

interface EventCardProps {
  event: Event
}

export function EventCard({ event }: EventCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <article>
      <h2>{event.title}</h2>
      <p>{event.description}</p>
      <time dateTime={event.date}>{formattedDate}</time>
      <p>{event.location}</p>
      <p>
        {event.price === 0
          ? 'Gratuito'
          : event.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>
      <Link href={`/eventos/${event.slug}`}>Ver detalhes</Link>
    </article>
  )
}
