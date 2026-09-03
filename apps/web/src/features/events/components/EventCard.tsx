import Link from 'next/link'
import type { Event } from '@mypass360/types'

interface EventCardProps {
  event: Event
  hot?: boolean
}

export function EventCard({ event, hot }: EventCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const formattedPrice =
    event.price === 0
      ? 'Gratuito'
      : event.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const isGratuito = event.price === 0

  const getEventImage = (ev: Event) => {
    if (ev.image_url) return ev.image_url
    
    const testImages = [
      'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=1200&auto=format&fit=crop', // Show Rock / Festival
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop', // Balada / Luzes
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop', // DJ / Música Eletrônica
      'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1200&auto=format&fit=crop', // Festa ao ar livre
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop', // Teatro / Iluminação
    ]
    
    const charSum = ev.title.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return testImages[charSum % testImages.length]
  }

  return (
    <Link
      href={`/eventos/${event.slug}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <article
        style={{
          background: '#fff',
          borderRadius: '16px',
          overflow: 'hidden',
          transition: 'transform 0.22s cubic-bezier(0.4,0,0.2,1), box-shadow 0.22s',
          cursor: 'pointer',
          border: '1px solid #f0f0f4',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
        onMouseOver={(e) => {
          const el = e.currentTarget
          el.style.transform = 'translateY(-4px)'
          el.style.boxShadow = '0 12px 32px rgba(0,0,0,0.13)'
        }}
        onMouseOut={(e) => {
          const el = e.currentTarget
          el.style.transform = 'none'
          el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'
        }}
      >
        {/* Image area — proporção 16:9 (mesma do crop modal) */}
        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 9',
            position: 'relative',
            overflow: 'hidden',
            background: '#000',
          }}
        >
          <img
            src={getEventImage(event)}
            alt={event.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transition: 'transform 0.4s ease',
              display: 'block',
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)' }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'none' }}
          />

          {/* Hot badge */}
          {hot && (
            <span style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: 'linear-gradient(135deg, #ff6b35, #f7c59f)',
              color: '#fff',
              padding: '3px 9px',
              borderRadius: '20px',
              fontSize: '0.68rem',
              fontWeight: 800,
              letterSpacing: '0.02em',
              boxShadow: '0 2px 8px rgba(255,107,53,0.45)',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
            }}>
              🔥 Mais vendido
            </span>
          )}

          {/* Price badge */}
          <span style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: isGratuito ? '#dcfce7' : 'rgba(255,255,255,0.92)',
            color: isGratuito ? '#166534' : '#0f172a',
            padding: '3px 10px',
            borderRadius: '20px',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.01em',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(6px)',
          }}>
            {formattedPrice}
          </span>
        </div>

        {/* Content */}
        <div style={{ padding: '0.85rem 1rem 0.95rem' }}>
          <h3 style={{
            margin: '0 0 0.35rem',
            fontSize: '0.95rem',
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {event.title}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: '#6366f1',
              fontWeight: 700,
            }}>
              <span>📅</span>
              <time dateTime={event.date}>{formattedDate}</time>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              color: '#64748b',
            }}>
              <span>📍</span>
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {event.location}
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}
