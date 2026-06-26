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
    hour: '2-digit',
    minute: '2-digit',
  })

  const formattedPrice =
    event.price === 0
      ? 'Gratuito'
      : event.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  return (
    <article
      style={{
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
    >
      <div
        style={{
          height: '120px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: '2rem',
        }}
      >
        🎵
      </div>

      <div style={{ padding: '1.25rem' }}>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', color: '#0f172a' }}>
          {event.title}
        </h2>

        <p
          style={{
            margin: '0 0 0.75rem',
            color: '#64748b',
            fontSize: '0.875rem',
            lineHeight: '1.5',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {event.description}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
            <span>📅</span>
            <time dateTime={event.date}>{formattedDate}</time>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#64748b' }}>
            <span>📍</span>
            <span>{event.location}</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '0.75rem',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '1rem' }}>
            {formattedPrice}
          </span>
          <Link
            href={`/eventos/${event.slug}`}
            style={{
              background: '#0f172a',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            Ver detalhes
          </Link>
        </div>
      </div>
    </article>
  )
}
